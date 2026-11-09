import { normalizeSku } from "./importUtils.js";

const PRE_RESTORE_SNAPSHOT_KEY = "babin_pre_restore_snapshot";
const MAX_BACKUP_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max limit

/**
 * Validates the schema, types, and integrity of a backup payload.
 * Returns { isValid: boolean, errors: string[], summary: object }
 */
export function validateBackupPayload(data, fileSizeBytes = 0) {
  const errors = [];

  if (fileSizeBytes > MAX_BACKUP_SIZE_BYTES) {
    errors.push(`Backup file exceeds maximum allowed size of 25 MB (was ${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB).`);
    return { isValid: false, errors, summary: null };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    errors.push("Invalid backup format: Expected a JSON object containing settings, items, and queue.");
    return { isValid: false, errors, summary: null };
  }

  // Version check
  const version = String(data.version || "1.0");

  // Validate items
  let itemsCount = 0;
  const duplicateSkus = new Set();
  const seenSkus = new Set();

  if (data.items != null) {
    if (!Array.isArray(data.items)) {
      errors.push("Invalid 'items' field: Expected an array of inventory items.");
    } else {
      itemsCount = data.items.length;
      data.items.forEach((item, idx) => {
        if (!item || typeof item !== "object") {
          errors.push(`Item at index ${idx} is not a valid object.`);
          return;
        }
        if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
          errors.push(`Item at index ${idx} is missing a valid 'name'.`);
        }
        if (!item.sku || typeof item.sku !== "string" || !item.sku.trim()) {
          errors.push(`Item at index ${idx} ("${item.name || 'Unnamed'}") is missing a valid 'sku'.`);
        } else {
          const norm = normalizeSku(item.sku);
          if (seenSkus.has(norm)) {
            duplicateSkus.add(item.sku);
          }
          seenSkus.add(norm);
        }
      });
    }
  }

  // Validate queue
  let queueCount = 0;
  if (data.queue != null) {
    if (!Array.isArray(data.queue)) {
      errors.push("Invalid 'queue' field: Expected an array of print queue items.");
    } else {
      queueCount = data.queue.length;
      data.queue.forEach((q, idx) => {
        if (!q || typeof q !== "object") {
          errors.push(`Queue entry at index ${idx} is not a valid object.`);
        } else if (!q.item || typeof q.item !== "object") {
          errors.push(`Queue entry at index ${idx} is missing an 'item' object.`);
        }
      });
    }
  }

  // Validate settings
  if (data.settings != null && (typeof data.settings !== "object" || Array.isArray(data.settings))) {
    errors.push("Invalid 'settings' field: Expected a configuration object.");
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    summary: {
      version,
      timestamp: data.timestamp || null,
      itemsCount,
      queueCount,
      brand: data.settings?.brand || "Babin Rentals",
      hasSettings: Boolean(data.settings),
      duplicateSkusCount: duplicateSkus.size,
      duplicateSkus: Array.from(duplicateSkus),
    },
  };
}

/**
 * Creates an emergency pre-restore snapshot in local storage so any
 * accidental overwrite can be recovered.
 */
export function createPreRestoreSnapshot({ items = [], queue = [], settings = {} }) {
  try {
    const snapshot = {
      snapshotTimestamp: new Date().toISOString(),
      items,
      queue,
      settings,
    };
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(PRE_RESTORE_SNAPSHOT_KEY, JSON.stringify(snapshot));
    }
    return { ok: true, timestamp: snapshot.snapshotTimestamp };
  } catch (err) {
    console.warn("Failed to create local pre-restore snapshot:", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Retrieves the emergency pre-restore snapshot if available
 */
export function getPreRestoreSnapshot() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(PRE_RESTORE_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Merges backup data into existing inventory and queue safely without
 * erasing non-colliding items or local fields.
 */
export function mergeBackupData({
  currentItems = [],
  currentQueue = [],
  currentSettings = {},
  backupData = {},
}) {
  const incomingItems = Array.isArray(backupData.items) ? backupData.items : [];
  const incomingQueue = Array.isArray(backupData.queue) ? backupData.queue : [];
  const incomingSettings = backupData.settings && typeof backupData.settings === "object" ? backupData.settings : {};

  // Safe item merge by normalized SKU
  const existingMap = new Map();
  currentItems.forEach((item) => {
    const key = normalizeSku(item.sku);
    if (key) existingMap.set(key, item);
  });

  const mergedItems = [...currentItems];
  incomingItems.forEach((incoming) => {
    const key = normalizeSku(incoming.sku);
    if (!key) return;

    if (existingMap.has(key)) {
      const idx = mergedItems.findIndex((i) => normalizeSku(i.sku) === key);
      if (idx >= 0) {
        // Merge attributes, keeping existing identity and isPrinted
        mergedItems[idx] = {
          ...mergedItems[idx],
          ...incoming,
          id: mergedItems[idx].id || incoming.id,
          isPrinted: mergedItems[idx].isPrinted ?? incoming.isPrinted,
        };
      }
    } else {
      mergedItems.push(incoming);
      existingMap.set(key, incoming);
    }
  });

  // Combine queues, avoiding duplicate identical unique IDs
  const queueKeys = new Set(currentQueue.map((q) => q.item?.sku + (q.templateId || "")));
  const mergedQueue = [...currentQueue];
  incomingQueue.forEach((q) => {
    const key = q.item?.sku + (q.templateId || "");
    if (!queueKeys.has(key)) {
      mergedQueue.push(q);
      queueKeys.add(key);
    }
  });

  // Settings: preserve custom keys from both
  const mergedSettings = {
    ...currentSettings,
    ...incomingSettings,
  };

  return {
    items: mergedItems,
    queue: mergedQueue,
    settings: mergedSettings,
  };
}
