import { uid, getEquipmentType } from "../config/tokens.js";

export const APP_FIELDS = [
  { key: "name", label: "Item Name", required: true },
  { key: "category", label: "Category", required: true },
  { key: "subcategory", label: "Subcategory", required: false },
  { key: "sku", label: "SKU / Item Code", required: true },
  { key: "quantity", label: "Quantity", required: false },
  { key: "serial_number", label: "Serial Number", required: false },
  { key: "qr_url", label: "QR URL", required: false },
  { key: "department", label: "Department", required: false },
  { key: "notes", label: "Notes", required: false },
  { key: "software_id", label: "Software ID", required: false },
  { key: "status", label: "Status", required: false },
];

export const BOOQABLE_AUTO = {
  name: "name",
  product_type: "category",
  sku: "sku",
  quantity: "quantity",
  id: "software_id",
  description: "notes",
  stock_identifier: "serial_number",
  available: "status",
};

/**
 * Normalizes SKU for stable, case-insensitive comparison
 */
export function normalizeSku(sku) {
  if (sku == null) return "";
  return String(sku).trim().toUpperCase();
}

/**
 * Automatically maps incoming spreadsheet headers to application fields
 */
export function autoMapHeaders(hdrs = []) {
  const m = {};
  hdrs.forEach((h) => {
    const hl = h.toLowerCase().replace(/[\s_-]/g, "");
    APP_FIELDS.forEach((f) => {
      const fl = f.key.replace(/_/g, "");
      if (hl === fl || hl === f.label.toLowerCase().replace(/[\s/]/g, "")) {
        m[f.key] = h;
      }
    });
    const cleanSnake = h.toLowerCase().trim().replace(/[\s-]+/g, "_");
    if (BOOQABLE_AUTO[cleanSnake]) m[BOOQABLE_AUTO[cleanSnake]] = h;
    if (BOOQABLE_AUTO[h.toLowerCase()]) m[BOOQABLE_AUTO[h.toLowerCase()]] = h;
    if (BOOQABLE_AUTO[h]) m[BOOQABLE_AUTO[h]] = h;
  });
  return m;
}

/**
 * Analyzes an import dataset against the existing inventory.
 * Enforces:
 * 1. Preservation of existing IDs and isPrinted status.
 * 2. Protection against overwriting valid values with empty cells.
 * 3. Detection of duplicates within the file itself.
 * 4. Transparent diffing: new vs update vs unchanged vs invalid.
 */
export function analyzeImport({
  rawData = [],
  mapping = {},
  existingItems = [],
  settings = {},
}) {
  const website = settings?.website || "babinrentals.com";
  const pattern = settings?.qrUrlPattern || `https://${website}/items/{sku}`;

  // Index existing items by normalized SKU
  const existingMap = new Map();
  existingItems.forEach((item) => {
    const key = normalizeSku(item.sku);
    if (key) existingMap.set(key, item);
  });

  const skuCountsInFile = new Map();
  rawData.forEach((row) => {
    const col = mapping.sku;
    const rawSku = col ? String(row[col] || "").trim() : "";
    const norm = normalizeSku(rawSku);
    if (norm) {
      skuCountsInFile.set(norm, (skuCountsInFile.get(norm) || 0) + 1);
    }
  });

  const preparedRows = [];
  const invalidRows = [];
  const duplicateRows = [];
  const seenSkusInFile = new Set();

  let newCount = 0;
  let updateCount = 0;
  let unchangedCount = 0;

  rawData.forEach((row, idx) => {
    const rowNum = idx + 1;
    const incoming = {};

    APP_FIELDS.forEach((f) => {
      const col = mapping[f.key];
      incoming[f.key] = col && row[col] != null ? String(row[col]).trim() : "";
    });

    // Check required fields
    const missingName = !incoming.name;
    const rawSku = incoming.sku;
    const normSku = normalizeSku(rawSku);

    if (missingName || !rawSku) {
      const errorMsg = missingName
        ? `Row ${rowNum}: Missing Item Name`
        : `Row ${rowNum}: Missing SKU`;
      const invalidEntry = {
        _rowNum: rowNum,
        _error: errorMsg,
        _changeType: "invalid",
        _selected: false,
        name: incoming.name || "[Unnamed Item]",
        sku: incoming.sku || `ITEM-${String(rowNum).padStart(3, "0")}`,
        category: incoming.category || "Other",
        raw: row,
      };
      invalidRows.push(invalidEntry);
      preparedRows.push(invalidEntry);
      return;
    }

    const isFirstOccurrence = !seenSkusInFile.has(normSku);
    seenSkusInFile.add(normSku);

    const isDuplicateInFile = (skuCountsInFile.get(normSku) || 0) > 1;
    if (isDuplicateInFile) {
      duplicateRows.push({ rowNum, sku: rawSku, isFirstOccurrence });
    }

    const existing = existingMap.get(normSku);

    if (!existing) {
      // BRAND NEW ITEM
      if (isFirstOccurrence) {
        newCount++;
      }
      const newItem = {
        id: uid(),
        ...incoming,
        category: incoming.category || getEquipmentType("Other", incoming.name),
        quantity: incoming.quantity || "1",
        qr_url: incoming.qr_url || pattern.replace("{sku}", rawSku),
        isPrinted: false,
        _changeType: "new",
        _selected: isFirstOccurrence, // Default unselect subsequent duplicate rows
        _isDuplicateInFile: isDuplicateInFile,
        _isSubsequentDuplicate: !isFirstOccurrence,
        _fieldChanges: {},
        _rowNum: rowNum,
      };
      preparedRows.push(newItem);
    } else {
      // MATCHING EXISTING ITEM: Safe Merge
      const fieldChanges = {};
      let hasChanges = false;

      // Merged item preserves existing identity and flags
      const merged = {
        ...existing, // Keeps existing ID, isPrinted, and unmapped/custom attributes
        _changeType: "unchanged",
        _selected: isFirstOccurrence, // Default unselect subsequent duplicate rows
        _isDuplicateInFile: isDuplicateInFile,
        _isSubsequentDuplicate: !isFirstOccurrence,
        _rowNum: rowNum,
        _fieldChanges: {},
      };

      APP_FIELDS.forEach((f) => {
        const key = f.key;
        const incomingVal = incoming[key];
        const existingVal = existing[key] != null ? String(existing[key]).trim() : "";

        // Only update if incoming is mapped and non-empty
        if (incomingVal !== "" && incomingVal !== existingVal) {
          fieldChanges[key] = { from: existingVal, to: incomingVal };
          merged[key] = incomingVal;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        updateCount++;
        merged._changeType = "update";
        merged._fieldChanges = fieldChanges;
      } else {
        unchangedCount++;
      }

      preparedRows.push(merged);
    }
  });

  return {
    summary: {
      totalRows: rawData.length,
      newCount,
      updateCount,
      unchangedCount,
      duplicateInFileCount: duplicateRows.length,
      invalidCount: invalidRows.length,
    },
    newItems: preparedRows.filter((r) => r._changeType === "new"),
    updatedItems: preparedRows.filter((r) => r._changeType === "update"),
    unchangedItems: preparedRows.filter((r) => r._changeType === "unchanged"),
    duplicateRows,
    invalidRows,
    preparedRows,
  };
}

/**
 * Performs an atomic merge of the validated import preview into existing items.
 * Order of existing items is preserved; new items are appended.
 */
export function mergeImportedItems({ existingItems = [], preparedRows = [] }) {
  const selected = preparedRows.filter((r) => r._selected && r._changeType !== "invalid");
  const selectedMap = new Map();

  selected.forEach((item) => {
    const key = normalizeSku(item.sku);
    // Keep first selected occurrence to prevent unexpected 'last row wins' collision
    if (key && !selectedMap.has(key)) {
      selectedMap.set(key, item);
    }
  });

  const result = [];
  const processedKeys = new Set();

  // 1. Update existing items in place
  existingItems.forEach((item) => {
    const key = normalizeSku(item.sku);
    if (selectedMap.has(key)) {
      const incoming = selectedMap.get(key);
      // Clean internal preview metadata
      const { _selected, _changeType, _isDuplicateInFile, _fieldChanges, _rowNum, ...cleanItem } = incoming;
      result.push(cleanItem);
      processedKeys.add(key);
    } else {
      result.push(item);
    }
  });

  // 2. Append new items
  selected.forEach((item) => {
    const key = normalizeSku(item.sku);
    if (key && !processedKeys.has(key)) {
      const { _selected, _changeType, _isDuplicateInFile, _fieldChanges, _rowNum, ...cleanItem } = item;
      result.push(cleanItem);
      processedKeys.add(key);
    }
  });

  return result;
}
