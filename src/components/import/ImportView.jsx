import React, { useState, useRef } from "react";
import { UploadCloud, ArrowRight, ArrowLeft, Check, AlertTriangle, Info, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { C } from "../../config/tokens.js";
import {
  APP_FIELDS,
  autoMapHeaders,
  analyzeImport,
  mergeImportedItems,
} from "../../utils/importUtils.js";

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
  const [analysis, setAnalysis] = useState(null);
  const [preview, setPreview] = useState([]);
  const [acknowledgedDuplicates, setAcknowledgedDuplicates] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const parseFile = (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => {
          if (!r.data || r.data.length === 0) {
            showToast("CSV file contains no data rows.", "error");
            return;
          }
          const hdrs = r.meta.fields || [];
          if (hdrs.length === 0) {
            showToast("CSV file contains no valid column headers.", "error");
            return;
          }
          setRawData(r.data);
          setHeaders(hdrs);
          setMapping(autoMapHeaders(hdrs));
          setStep("map");
        },
        error: (err) => {
          showToast("Failed to parse CSV file: " + err.message, "error");
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "array" });
          if (!wb.SheetNames || wb.SheetNames.length === 0) {
            showToast("Excel workbook has no sheets.", "error");
            return;
          }
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws);
          if (!data || data.length === 0) {
            showToast("Excel sheet contains no data rows.", "error");
            return;
          }
          const hdrs = Object.keys(data[0] || {});
          if (hdrs.length === 0) {
            showToast("Excel sheet contains no valid column headers.", "error");
            return;
          }
          setRawData(data);
          setHeaders(hdrs);
          setMapping(autoMapHeaders(hdrs));
          setStep("map");
        } catch (err) {
          showToast("Failed to parse Excel file: " + err.message, "error");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showToast("Unsupported file type. Use CSV or Excel (.xlsx, .xls).", "error");
    }
  };

  const buildPreview = () => {
    const result = analyzeImport({
      rawData: rawData || [],
      mapping,
      existingItems: items,
      settings,
    });
    setAnalysis(result);
    setPreview(result.preparedRows);
    setStep("preview");
  };

  const confirmImport = () => {
    const merged = mergeImportedItems({
      existingItems: items,
      preparedRows: preview,
    });
    setItems(merged);
    const validCount = preview.filter((r) => r._selected && r._changeType !== "invalid").length;
    showToast(`Successfully processed ${validCount} equipment item(s)`);
    setStep("done");
    if (onDone) onDone();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) parseFile(f);
  };

  const SectionTitle = ({ n, t }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
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
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            Upload your Booqable inventory export, asset tracker CSV, or Excel spreadsheet.
            The studio protects existing items: unique IDs, print history, and custom notes are strictly preserved.
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
              onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
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
                  Reimporting will safely merge by SKU without erasing print status or custom attributes.
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
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 20 }}>
            Match your spreadsheet columns to sticker fields. Detected from {headers.length} spreadsheet columns.
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
                          <span style={{ color: C.red, fontWeight: 700 }}>Required</span>
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
              disabled={!mapping.name || !mapping.sku}
              style={{
                background: mapping.name && mapping.sku ? C.red : "#333",
                color: C.white,
                border: "none",
                padding: "8px 24px",
                borderRadius: 6,
                cursor: mapping.name && mapping.sku ? "pointer" : "not-allowed",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>Analyze & Preview ({rawData?.length || 0} rows)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <SectionTitle n="3" t="Import Validation & Diff Preview" />

          {/* Pre-import summary dashboard */}
          {analysis && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <div style={{ background: "#161616", border: `1px solid ${C.border}`, padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Total Rows</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.white, marginTop: 4 }}>{analysis.summary.totalRows}</div>
              </div>

              <div style={{ background: "#132316", border: `1px solid ${C.green}44`, padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 700, textTransform: "uppercase" }}>New Items</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.green, marginTop: 4 }}>+{analysis.summary.newCount}</div>
              </div>

              <div style={{ background: "#14202C", border: `1px solid ${C.blue}44`, padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.blue, fontWeight: 700, textTransform: "uppercase" }}>Updates</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.blue, marginTop: 4 }}>{analysis.summary.updateCount}</div>
              </div>

              <div style={{ background: "#181818", border: `1px solid ${C.border}`, padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Unchanged</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, marginTop: 4 }}>{analysis.summary.unchangedCount}</div>
              </div>

              <div style={{ background: analysis.summary.invalidCount > 0 ? "#2B1416" : "#161616", border: `1px solid ${analysis.summary.invalidCount > 0 ? C.red : C.border}`, padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: analysis.summary.invalidCount > 0 ? C.red : C.muted, fontWeight: 700, textTransform: "uppercase" }}>Invalid / Skipped</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: analysis.summary.invalidCount > 0 ? C.red : C.muted, marginTop: 4 }}>{analysis.summary.invalidCount}</div>
              </div>
            </div>
          )}

          {/* Duplicate Warnings inside file */}
          {analysis?.summary?.duplicateInFileCount > 0 && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                background: "#2A1D0B",
                border: "1px solid #D4A338",
                borderRadius: 8,
                fontSize: 12,
                color: "#F5C542",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                <AlertTriangle size={16} />
                <span>Duplicate SKUs Detected ({analysis.summary.duplicateInFileCount} duplicate rows)</span>
              </div>
              <div style={{ marginTop: 6, color: C.white, lineHeight: 1.5, fontSize: 11 }}>
                Multiple rows share the same SKU. To prevent accidental overwrites, only the first occurrence will be imported; subsequent duplicate rows are unselected by default.
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  cursor: "pointer",
                  color: "#F5C542",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={acknowledgedDuplicates}
                  onChange={(e) => setAcknowledgedDuplicates(e.target.checked)}
                />
                <span>I acknowledge duplicate SKUs exist and confirm the current row selections.</span>
              </label>
            </div>
          )}

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
                  {["Action", "SKU", "Item Name", "Category", "Print Status", "Changes / Note"].map((h) => (
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
                {preview.map((r, i) => {
                  const isNew = r._changeType === "new";
                  const isUpdate = r._changeType === "update";
                  const isUnchanged = r._changeType === "unchanged";
                  const isInvalid = r._changeType === "invalid";

                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: !r._selected ? "rgba(0,0,0,0.3)" : "transparent",
                        opacity: isInvalid ? 0.6 : 1,
                      }}
                    >
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          disabled={isInvalid}
                          checked={r._selected}
                          onChange={(e) => {
                            const updated = [...preview];
                            updated[i]._selected = e.target.checked;
                            setPreview(updated);
                          }}
                        />
                      </td>

                      {/* Action Badge */}
                      <td style={{ padding: "8px 14px" }}>
                        {isNew && (
                          <span style={{ padding: "2px 6px", borderRadius: 4, background: "#1C3524", color: C.green, fontSize: 10, fontWeight: 700 }}>
                            NEW
                          </span>
                        )}
                        {isUpdate && (
                          <span style={{ padding: "2px 6px", borderRadius: 4, background: "#14253B", color: C.blue, fontSize: 10, fontWeight: 700 }}>
                            UPDATE
                          </span>
                        )}
                        {isUnchanged && (
                          <span style={{ padding: "2px 6px", borderRadius: 4, background: "#222222", color: C.muted, fontSize: 10 }}>
                            UNCHANGED
                          </span>
                        )}
                        {isInvalid && (
                          <span style={{ padding: "2px 6px", borderRadius: 4, background: "#3A1719", color: C.red, fontSize: 10, fontWeight: 700 }}>
                            INVALID
                          </span>
                        )}
                      </td>

                      {/* SKU */}
                      <td style={{ padding: "8px 14px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: C.yellow }}>
                        {r.sku}
                        {r._isDuplicateInFile && (
                          <span title="Duplicate SKU in file" style={{ color: "#E8A13A", marginLeft: 4 }}>⚠️</span>
                        )}
                      </td>

                      {/* Name */}
                      <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: C.white }}>
                        {r.name}
                      </td>

                      {/* Category */}
                      <td style={{ padding: "8px 14px", fontSize: 11, color: C.muted }}>
                        {r.category}
                      </td>

                      {/* Print Status Preservation */}
                      <td style={{ padding: "8px 14px", fontSize: 11 }}>
                        {r.isPrinted ? (
                          <span style={{ color: C.green, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Check size={11} /> Printed
                          </span>
                        ) : (
                          <span style={{ color: C.muted }}>Unprinted</span>
                        )}
                      </td>

                      {/* Diff / Notes */}
                      <td style={{ padding: "8px 14px", fontSize: 11, color: C.muted, maxWidth: 220 }}>
                        {isInvalid ? (
                          <span style={{ color: C.red }}>{r._error}</span>
                        ) : r._isSubsequentDuplicate ? (
                          <span style={{ color: "#E8A13A" }}>Duplicate in file (unselected)</span>
                        ) : isUpdate && r._fieldChanges ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {Object.entries(r._fieldChanges).map(([k, v]) => (
                              <span key={k} style={{ color: C.blue, fontSize: 10 }}>
                                {k}: {v.from || '""'} → {v.to}
                              </span>
                            ))}
                          </div>
                        ) : isNew ? (
                          <span style={{ color: C.green }}>Will add to library</span>
                        ) : (
                          <span>Identity & data identical</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
              disabled={
                preview.filter((r) => r._selected && r._changeType !== "invalid").length === 0 ||
                (analysis?.summary?.duplicateInFileCount > 0 && !acknowledgedDuplicates)
              }
              style={{
                background:
                  preview.filter((r) => r._selected && r._changeType !== "invalid").length === 0 ||
                  (analysis?.summary?.duplicateInFileCount > 0 && !acknowledgedDuplicates)
                    ? "#333"
                    : C.red,
                color: C.white,
                border: "none",
                padding: "8px 24px",
                borderRadius: 6,
                cursor:
                  preview.filter((r) => r._selected && r._changeType !== "invalid").length === 0 ||
                  (analysis?.summary?.duplicateInFileCount > 0 && !acknowledgedDuplicates)
                    ? "not-allowed"
                    : "pointer",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>
                Confirm Safe Merge ({preview.filter((r) => r._selected && r._changeType !== "invalid").length} items)
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportView;
