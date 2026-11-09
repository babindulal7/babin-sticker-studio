import React, { useState, useRef } from "react";
import { UploadCloud, ArrowRight, ArrowLeft, Check } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { C, uid, getEquipmentType } from "../../config/tokens.js";

export function ImportView({
  items,
  setItems,
  showToast,
  onDone,
  isMobile,
  isPhone,
  settings,
}) {
  const [step, setStep] = useState("upload"); // upload | map | preview | done
  const [rawData, setRawData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const APP_FIELDS = [
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

  const BOOQABLE_AUTO = {
    name: "name",
    product_type: "category",
    sku: "sku",
    quantity: "quantity",
    id: "software_id",
    description: "notes",
    stock_identifier: "serial_number",
    available: "status",
  };

  const autoMap = (hdrs) => {
    const m = {};
    hdrs.forEach((h) => {
      const hl = h.toLowerCase().replace(/[\s_-]/g, "");
      APP_FIELDS.forEach((f) => {
        const fl = f.key.replace(/_/g, "");
        if (hl === fl || hl === f.label.toLowerCase().replace(/[\s/]/g, "")) {
          m[f.key] = h;
        }
      });
      if (BOOQABLE_AUTO[h]) m[BOOQABLE_AUTO[h]] = h;
    });
    return m;
  };

  const parseFile = (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => {
          setRawData(r.data);
          const hdrs = r.meta.fields || [];
          setHeaders(hdrs);
          setMapping(autoMap(hdrs));
          setStep("map");
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const hdrs = data.length ? Object.keys(data[0]) : [];
        setRawData(data);
        setHeaders(hdrs);
        setMapping(autoMap(hdrs));
        setStep("map");
      };
      reader.readAsBinaryString(file);
    } else {
      showToast("Unsupported file type. Use CSV or Excel (.xlsx, .xls).", "error");
    }
  };

  const buildPreview = () => {
    const website = settings?.website || "babinrentals.com";
    const pattern = settings?.qrUrlPattern || `https://${website}/items/{sku}`;

    const rows = (rawData || []).map((row, i) => {
      const item = { id: uid() };
      APP_FIELDS.forEach((f) => {
        const col = mapping[f.key];
        item[f.key] = col ? String(row[col] || "").trim() : "";
      });
      if (!item.sku) item.sku = `ITEM-${String(i + 1).padStart(3, "0")}`;
      if (!item.quantity) item.quantity = "1";
      if (!item.qr_url) {
        item.qr_url = pattern.replace("{sku}", item.sku);
      }
      item.category = item.category || getEquipmentType("Other", item.name);
      item.isPrinted = false;
      item._selected = true;
      return item;
    });
    setPreview(rows);
    setStep("preview");
  };

  const confirmImport = () => {
    const selected = preview.filter((r) => r._selected).map(({ _selected, ...r }) => r);
    setItems((prev) => {
      const existing = new Map(prev.map((i) => [i.sku, i]));
      selected.forEach((i) => existing.set(i.sku, i));
      return Array.from(existing.values());
    });
    showToast(`Imported ${selected.length} items successfully`);
    setStep("done");
    onDone();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const SectionTitle = ({ n, t }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <span
        style={{
          background: C.red,
          color: "#fff",
          width: 26,
          height: 26,
          borderRadius: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: ".04em", color: C.white }}>{t}</h2>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: isPhone ? 12 : isMobile ? 16 : 32 }}>
      {step === "upload" && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <SectionTitle n="1" t="Import Equipment Data" />
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
            Upload your Booqable inventory CSV export, Excel spreadsheet, or asset tracking data.
            The app automatically detects column headers and remembers your data between sessions.
          </p>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? C.red : C.border}`,
              borderRadius: 12,
              padding: isPhone ? "36px 14px" : isMobile ? "46px 20px" : "60px 32px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all .2s",
              background: dragging ? "rgba(215,25,32,.08)" : C.card,
            }}
          >
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
              <UploadCloud size={48} color={dragging ? C.red : C.muted} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: dragging ? C.red : C.white, marginBottom: 8 }}>
              Drop CSV or Excel spreadsheet here
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>or click to browse from your Mac (.csv, .xlsx, .xls)</div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])}
            />
          </div>

          {items.length > 0 && (
            <div
              style={{
                marginTop: 24,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 16,
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                justifyContent: "space-between",
                gap: 10,
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>
                  {items.length} items currently in your library
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Importing new spreadsheets will merge with existing items by SKU.
                </div>
              </div>
              <button
                onClick={onDone}
                style={{
                  background: "#262626",
                  color: C.white,
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>View Library</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {step === "map" && (
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <SectionTitle n="2" t="Map Columns" />
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 24 }}>
            Match your spreadsheet columns to the sticker fields. Detected from {headers.length} columns.
          </p>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "auto", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 620 : 0 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["App Field", "Your Spreadsheet Column", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: ".08em",
                        color: C.muted,
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {APP_FIELDS.map((f) => (
                  <tr key={f.key} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: C.white }}>
                      <span style={{ fontWeight: 600 }}>{f.label}</span>
                      {f.required && <span style={{ color: C.red, marginLeft: 4 }}>*</span>}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <select
                        value={mapping[f.key] || ""}
                        onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                        style={{
                          background: "#181818",
                          border: `1px solid ${C.border}`,
                          color: mapping[f.key] ? C.white : C.muted,
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 12,
                          outline: "none",
                          width: "100%",
                          maxWidth: 320,
                        }}
                      >
                        <option value="">-- Don't map --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 11 }}>
                      {f.required ? (
                        mapping[f.key] ? (
                          <span style={{ color: C.green, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Check size={12} strokeWidth={3} /> Mapped
                          </span>
                        ) : (
                          <span style={{ color: C.red }}>Required</span>
                        )
                      ) : (
                        <span style={{ color: C.muted }}>Optional</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button
              onClick={() => setStep("upload")}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                color: C.white,
                padding: "8px 16px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
            <button
              onClick={buildPreview}
              disabled={!mapping.name || !mapping.category || !mapping.sku}
              style={{
                background: mapping.name && mapping.category && mapping.sku ? C.red : "#333",
                color: C.white,
                border: "none",
                padding: "8px 24px",
                borderRadius: 6,
                cursor: mapping.name && mapping.category && mapping.sku ? "pointer" : "not-allowed",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>Preview Import ({rawData?.length || 0} rows)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <SectionTitle n="3" t={`Preview Data (${preview.length} items)`} />
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
            Verify the mapped equipment data. Uncheck items you don't wish to import.
          </p>

          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: "auto",
              maxHeight: 460,
              marginBottom: 20,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: "10px 14px", width: 40, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={preview.every((r) => r._selected)}
                      onChange={(e) => setPreview(preview.map((r) => ({ ...r, _selected: e.target.checked })))}
                    />
                  </th>
                  {["SKU", "Name", "Category", "Quantity", "QR URL"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        color: C.muted,
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 14px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={r._selected}
                        onChange={(e) => {
                          const updated = [...preview];
                          updated[i]._selected = e.target.checked;
                          setPreview(updated);
                        }}
                      />
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: C.yellow }}>
                      {r.sku}
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: C.white }}>{r.name}</td>
                    <td style={{ padding: "8px 14px", fontSize: 11, color: C.muted }}>{r.category}</td>
                    <td style={{ padding: "8px 14px", fontSize: 12, color: C.white }}>{r.quantity || 1}</td>
                    <td style={{ padding: "8px 14px", fontSize: 11, color: C.muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.qr_url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button
              onClick={() => setStep("map")}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                color: C.white,
                padding: "8px 16px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <ArrowLeft size={13} />
              <span>Back to Mapping</span>
            </button>
            <button
              onClick={confirmImport}
              style={{
                background: C.red,
                color: C.white,
                border: "none",
                padding: "8px 24px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Confirm Import ({preview.filter((r) => r._selected).length} items)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportView;
