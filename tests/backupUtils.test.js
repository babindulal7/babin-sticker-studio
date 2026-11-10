import { describe, it, expect, beforeEach } from "vitest";
import {
  validateBackupPayload,
  createPreRestoreSnapshot,
  getPreRestoreSnapshot,
  mergeBackupData,
  canSafelyRestore,
} from "../src/utils/backupUtils.js";

describe("backupUtils", () => {
  describe("validateBackupPayload", () => {
    it("validates a healthy backup payload and returns summary", () => {
      const payload = {
        version: "1.0",
        timestamp: "2026-11-10T00:00:00.000Z",
        settings: { brand: "Babin Rentals", primaryColor: "#d97706" },
        items: [
          { id: "item-1", name: "Canon R5C", sku: "CAM-001", category: "Camera" },
          { id: "item-2", name: "Sony FX6", sku: "CAM-002", category: "Camera" },
        ],
        queue: [
          {
            id: "q-1",
            templateId: "a4-standard",
            item: { name: "Canon R5C", sku: "CAM-001" },
            quantity: 2,
          },
        ],
      };

      const result = validateBackupPayload(payload, 1024);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.itemsCount).toBe(2);
      expect(result.summary.queueCount).toBe(1);
      expect(result.summary.brand).toBe("Babin Rentals");
      expect(result.summary.duplicateSkusCount).toBe(0);
    });

    it("rejects backup payload exceeding size limit (25MB)", () => {
      const payload = { version: "1.0", items: [] };
      const oversizeBytes = 26 * 1024 * 1024; // 26 MB
      const result = validateBackupPayload(payload, oversizeBytes);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Backup file exceeds maximum allowed size");
    });

    it("rejects non-object or array root payloads", () => {
      expect(validateBackupPayload(null).isValid).toBe(false);
      expect(validateBackupPayload("string").isValid).toBe(false);
      expect(validateBackupPayload([1, 2, 3]).isValid).toBe(false);
    });

    it("detects malformed items array or missing required fields", () => {
      const badItemsPayload = {
        items: [
          { name: "Missing SKU" },
          { sku: "SKU-ONLY" },
          null,
        ],
      };
      const result = validateBackupPayload(badItemsPayload);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it("detects duplicate SKUs inside backup data", () => {
      const payload = {
        items: [
          { name: "Item A", sku: "SKU-DUP" },
          { name: "Item B", sku: " sku-dup " },
        ],
      };
      const result = validateBackupPayload(payload);
      expect(result.summary.duplicateSkusCount).toBe(1);
      expect(result.summary.duplicateSkus).toContain(" sku-dup ");
    });

    it("rejects malformed queue entries", () => {
      const payload = {
        items: [],
        queue: [{ invalid: "no-item-field" }],
      };
      const result = validateBackupPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("missing an 'item' object"))).toBe(true);
    });
  });

  describe("createPreRestoreSnapshot & getPreRestoreSnapshot", () => {
    beforeEach(() => {
      // Mock simple localStorage for test environment
      const store = {};
      global.window = {
        localStorage: {
          getItem: (key) => store[key] || null,
          setItem: (key, val) => {
            store[key] = String(val);
          },
          removeItem: (key) => {
            delete store[key];
          },
          clear: () => {
            for (const k of Object.keys(store)) delete store[k];
          },
        },
      };
    });

    it("saves and recovers pre-restore snapshot", () => {
      const liveState = {
        items: [{ id: "1", name: "Lens", sku: "LENS-01" }],
        queue: [{ id: "q1", item: { name: "Lens", sku: "LENS-01" } }],
        settings: { brand: "Original Brand" },
      };

      const snapRes = createPreRestoreSnapshot(liveState);
      expect(snapRes.ok).toBe(true);
      expect(snapRes.timestamp).toBeDefined();

      const recovered = getPreRestoreSnapshot();
      expect(recovered).not.toBeNull();
      expect(recovered.items).toHaveLength(1);
      expect(recovered.items[0].sku).toBe("LENS-01");
      expect(recovered.settings.brand).toBe("Original Brand");
    });

    it("handles storage write errors gracefully when quota is exceeded", () => {
      global.window.localStorage.setItem = () => {
        throw new Error("QuotaExceededError: storage is full");
      };

      const snapRes = createPreRestoreSnapshot({ items: [] });
      expect(snapRes.ok).toBe(false);
      expect(snapRes.error).toContain("QuotaExceededError");
    });
  });

  describe("canSafelyRestore", () => {
    it("blocks replace restore when safety snapshot creation failed", () => {
      const check = canSafelyRestore({
        mode: "replace",
        snapshotResult: { ok: false, error: "Quota exceeded" },
        hasDownloadedSafetyBackup: false,
      });

      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Quota exceeded");
    });

    it("allows replace restore when safety snapshot succeeds", () => {
      const check = canSafelyRestore({
        mode: "replace",
        snapshotResult: { ok: true, timestamp: "2026-11-10T00:00:00Z" },
        hasDownloadedSafetyBackup: false,
      });

      expect(check.allowed).toBe(true);
    });

    it("allows replace restore when user manually downloaded a safety backup first", () => {
      const check = canSafelyRestore({
        mode: "replace",
        snapshotResult: { ok: false, error: "Storage full" },
        hasDownloadedSafetyBackup: true,
      });

      expect(check.allowed).toBe(true);
    });

    it("allows merge restore even if snapshot creation failed because merge is non-destructive", () => {
      const check = canSafelyRestore({
        mode: "merge",
        snapshotResult: { ok: false, error: "Storage full" },
      });

      expect(check.allowed).toBe(true);
    });
  });

  describe("mergeBackupData", () => {
    it("merges incoming items idempotently and preserves existing IDs and isPrinted flag", () => {
      const currentItems = [
        { id: "local-id-1", name: "Existing Item", sku: "EX-01", isPrinted: true, customNote: "Keep this" },
        { id: "local-id-2", name: "Untouched Item", sku: "EX-02", isPrinted: false },
      ];

      const backupData = {
        items: [
          // Update to EX-01
          { id: "remote-id-999", name: "Existing Item Updated", sku: "ex-01", isPrinted: false, price: "$50" },
          // New item
          { id: "remote-id-3", name: "Brand New Item", sku: "NEW-03", isPrinted: false },
        ],
        queue: [],
        settings: { newOption: true },
      };

      const merged = mergeBackupData({
        currentItems,
        currentQueue: [],
        currentSettings: { brand: "My Brand" },
        backupData,
      });

      // Total items should now be 3 (EX-01 updated, EX-02 kept, NEW-03 added)
      expect(merged.items).toHaveLength(3);

      const ex1 = merged.items.find((i) => i.sku.toUpperCase() === "EX-01");
      expect(ex1).toBeDefined();
      expect(ex1.id).toBe("local-id-1"); // Preserved local ID
      expect(ex1.isPrinted).toBe(true); // Preserved local isPrinted flag
      expect(ex1.customNote).toBe("Keep this"); // Preserved custom note
      expect(ex1.price).toBe("$50"); // Merged new attribute

      const new3 = merged.items.find((i) => i.sku === "NEW-03");
      expect(new3).toBeDefined();
      expect(new3.name).toBe("Brand New Item");

      // Settings merged
      expect(merged.settings.brand).toBe("My Brand");
      expect(merged.settings.newOption).toBe(true);
    });

    it("deduplicates queue entries during merge", () => {
      const currentQueue = [
        { templateId: "roll-50x30", item: { sku: "CAM-01" }, quantity: 1 },
      ];

      const backupData = {
        items: [],
        queue: [
          // Duplicate queue entry for CAM-01 + roll-50x30
          { templateId: "roll-50x30", item: { sku: "CAM-01" }, quantity: 5 },
          // Unique queue entry
          { templateId: "a4-standard", item: { sku: "CAM-02" }, quantity: 2 },
        ],
      };

      const merged = mergeBackupData({
        currentItems: [],
        currentQueue,
        currentSettings: {},
        backupData,
      });

      expect(merged.queue).toHaveLength(2);
      expect(merged.queue[0].item.sku).toBe("CAM-01");
      expect(merged.queue[0].quantity).toBe(1); // Keeps current
      expect(merged.queue[1].item.sku).toBe("CAM-02");
    });
  });
});
