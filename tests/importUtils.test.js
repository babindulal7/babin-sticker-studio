import { describe, it, expect } from "vitest";
import {
  normalizeSku,
  analyzeImport,
  mergeImportedItems,
  autoMapHeaders,
} from "../src/utils/importUtils.js";

describe("importUtils - Inventory Reimport Integrity & Idempotence", () => {
  it("normalizes SKUs consistently with trimming and case-insensitivity", () => {
    expect(normalizeSku(" cam-fx3-01 ")).toBe("CAM-FX3-01");
    expect(normalizeSku("LENS_2470")).toBe("LENS_2470");
    expect(normalizeSku(null)).toBe("");
  });

  it("auto-maps common Booqable and spreadsheet headers", () => {
    const headers = ["Name", "Product Type", "SKU", "Quantity", "Description"];
    const mapping = autoMapHeaders(headers);
    expect(mapping.name).toBe("Name");
    expect(mapping.category).toBe("Product Type");
    expect(mapping.sku).toBe("SKU");
    expect(mapping.quantity).toBe("Quantity");
    expect(mapping.notes).toBe("Description");
  });

  it("is idempotent: reimporting the exact same data results in 0 unintended changes", () => {
    const existing = [
      {
        id: "id-1",
        name: "Sony FX3 Camera Kit",
        sku: "CAM-FX3-01",
        category: "Camera",
        quantity: "1",
        isPrinted: true,
      },
      {
        id: "id-2",
        name: "Aputure 600d Pro",
        sku: "LIGHT-600D-01",
        category: "Lighting",
        quantity: "2",
        isPrinted: false,
      },
    ];

    const rawRows = [
      { "Item Name": "Sony FX3 Camera Kit", "Item Code": "CAM-FX3-01", "Cat": "Camera", "Qty": "1" },
      { "Item Name": "Aputure 600d Pro", "Item Code": "LIGHT-600D-01", "Cat": "Lighting", "Qty": "2" },
    ];

    const mapping = {
      name: "Item Name",
      sku: "Item Code",
      category: "Cat",
      quantity: "Qty",
    };

    const analysis = analyzeImport({
      rawData: rawRows,
      mapping,
      existingItems: existing,
    });

    expect(analysis.summary.newCount).toBe(0);
    expect(analysis.summary.updateCount).toBe(0);
    expect(analysis.summary.unchangedCount).toBe(2);

    const merged = mergeImportedItems({
      existingItems: existing,
      preparedRows: analysis.preparedRows,
    });

    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe("id-1");
    expect(merged[0].isPrinted).toBe(true);
    expect(merged[1].id).toBe("id-2");
    expect(merged[1].isPrinted).toBe(false);
  });

  it("preserves isPrinted status and internal ID when updating equipment name", () => {
    const existing = [
      {
        id: "original-id-99",
        name: "Old Camera Name",
        sku: "CAM-01",
        category: "Camera",
        isPrinted: true,
        customNotes: "Careful with sensor",
      },
    ];

    const rawRows = [
      { name: "Updated Sony Cinema Camera", sku: "CAM-01", category: "Camera" },
    ];

    const mapping = { name: "name", sku: "sku", category: "category" };

    const analysis = analyzeImport({
      rawData: rawRows,
      mapping,
      existingItems: existing,
    });

    expect(analysis.summary.updateCount).toBe(1);
    expect(analysis.preparedRows[0].id).toBe("original-id-99");
    expect(analysis.preparedRows[0].isPrinted).toBe(true);
    expect(analysis.preparedRows[0].name).toBe("Updated Sony Cinema Camera");

    const merged = mergeImportedItems({
      existingItems: existing,
      preparedRows: analysis.preparedRows,
    });

    expect(merged[0].id).toBe("original-id-99");
    expect(merged[0].isPrinted).toBe(true);
    expect(merged[0].name).toBe("Updated Sony Cinema Camera");
    expect(merged[0].customNotes).toBe("Careful with sensor");
  });

  it("does not overwrite legitimate existing values with empty cells from spreadsheet", () => {
    const existing = [
      {
        id: "lens-id",
        name: "Sony 50mm f/1.2 GM",
        sku: "LENS-50-01",
        category: "Lens",
        serial_number: "SN-987654321",
        qr_url: "https://babinrentals.com/items/LENS-50-01",
      },
    ];

    // Spreadsheet has empty serial_number and qr_url
    const rawRows = [
      {
        "Item Name": "Sony 50mm f/1.2 GM",
        "Item Code": "LENS-50-01",
        "Serial": "",
        "QR": "",
      },
    ];

    const mapping = {
      name: "Item Name",
      sku: "Item Code",
      serial_number: "Serial",
      qr_url: "QR",
    };

    const analysis = analyzeImport({
      rawData: rawRows,
      mapping,
      existingItems: existing,
    });

    const merged = mergeImportedItems({
      existingItems: existing,
      preparedRows: analysis.preparedRows,
    });

    // Existing serial number and QR URL must remain untouched
    expect(merged[0].serial_number).toBe("SN-987654321");
    expect(merged[0].qr_url).toBe("https://babinrentals.com/items/LENS-50-01");
  });

  it("detects and flags duplicate SKUs within the imported file", () => {
    const rawRows = [
      { name: "Camera Unit 1", sku: "DUPLICATE-SKU-01" },
      { name: "Camera Unit 2", sku: "DUPLICATE-SKU-01" },
      { name: "Light Unit", sku: "UNIQUE-SKU-02" },
    ];

    const mapping = { name: "name", sku: "sku" };

    const analysis = analyzeImport({
      rawData: rawRows,
      mapping,
      existingItems: [],
    });

    expect(analysis.summary.duplicateInFileCount).toBe(2);
    expect(analysis.duplicateRows).toHaveLength(2);
    // First occurrence is selected; subsequent duplicate row is unselected by default
    expect(analysis.preparedRows[0]._selected).toBe(true);
    expect(analysis.preparedRows[1]._selected).toBe(false);
    expect(analysis.preparedRows[1]._isSubsequentDuplicate).toBe(true);

    // Merge preserves first occurrence
    const merged = mergeImportedItems({
      existingItems: [],
      preparedRows: analysis.preparedRows,
    });
    expect(merged).toHaveLength(2);
    expect(merged.find((i) => i.sku === "DUPLICATE-SKU-01").name).toBe("Camera Unit 1");
  });

  it("flags rows missing required fields as invalid", () => {
    const rawRows = [
      { name: "", sku: "SKU-WITHOUT-NAME" },
      { name: "Name Without SKU", sku: "" },
    ];

    const mapping = { name: "name", sku: "sku" };

    const analysis = analyzeImport({
      rawData: rawRows,
      mapping,
      existingItems: [],
    });

    expect(analysis.summary.invalidCount).toBe(2);
    expect(analysis.invalidRows[0]._error).toContain("Missing Item Name");
    expect(analysis.invalidRows[1]._error).toContain("Missing SKU");
  });
});
