import * as XLSX from "xlsx";
import { suggestTemplate } from "../config/tokens.js";

export function exportItemsToExcel(items, filename = "BabinRentals-Inventory.xlsx") {
  if (!items || items.length === 0) return false;

  const data = items.map((item) => ({
    SKU: item.sku || "",
    "Item Name": item.name || "",
    Category: item.category || "",
    "Recommended Template": suggestTemplate(item.category, item.name),
    "QR URL": item.qr_url || "",
    "Print Status": item.isPrinted ? "Printed" : "Not Printed",
    Notes: item.notes || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

  // Auto-fit column widths
  const maxProps = ["SKU", "Item Name", "Category", "Recommended Template", "QR URL", "Print Status", "Notes"];
  worksheet["!cols"] = maxProps.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] || "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
  });

  XLSX.writeFile(workbook, filename);
  return true;
}

export function exportItemsToCsv(items, filename = "BabinRentals-Inventory.csv") {
  if (!items || items.length === 0) return false;

  const data = items.map((item) => ({
    SKU: item.sku || "",
    "Item Name": item.name || "",
    Category: item.category || "",
    "Recommended Template": suggestTemplate(item.category, item.name),
    "QR URL": item.qr_url || "",
    "Print Status": item.isPrinted ? "Printed" : "Not Printed",
    Notes: item.notes || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

export function exportBackupJson(data, filename = "babin-rentals-backup.json") {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
