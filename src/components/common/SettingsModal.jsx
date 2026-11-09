import React, { useState, useRef } from "react";
import {
  Sliders,
  X,
  Upload,
  RotateCcw,
  Download,
  FileUp,
  AlertTriangle,
  CheckCircle2,
  Undo2,
  ShieldAlert,
} from "lucide-react";
import { C, DEFAULT_SETTINGS } from "../../config/tokens.js";
import { DEFAULT_LOGO_WHITE } from "../../config/defaultLogo.js";
import { exportBackupJson } from "../../utils/exportUtils.js";
import {
  validateBackupPayload,
  createPreRestoreSnapshot,
  getPreRestoreSnapshot,
} from "../../utils/backupUtils.js";

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  allItems = [],
  allQueue = [],
  onRestoreBackup,
}) {
  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);

  const [restoreCandidate, setRestoreCandidate] = useState(null); // { data, summary, errors }
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(() => {
    const s = getPreRestoreSnapshot();
    return s?.snapshotTimestamp || null;
  });

  if (!isOpen) return null;

  const currentSettings = { ...DEFAULT_SETTINGS, ...settings };

  const handleChange = (key, value) => {
    onSaveSettings({ ...currentSettings, [key]: value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleChange("customLogo", event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleBackupExport = () => {
    const backupPayload = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: currentSettings,
      items: allItems,
      queue: allQueue,
    };
    exportBackupJson(
      backupPayload,
      `babin-rentals-backup-${new Date().toISOString().slice(0, 10)}.json`
    );
  };

  const handleBackupFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        const validation = validateBackupPayload(parsed, file.size);
        if (!validation.isValid) {
          setRestoreCandidate({
            data: null,
            errors: validation.errors,
            summary: null,
          });
        } else {
          setRestoreCandidate({
            data: parsed,
            errors: [],
            summary: validation.summary,
          });
        }
      } catch (err) {
        setRestoreCandidate({
          data: null,
          errors: [`Failed to parse JSON file: ${err.message}`],
          summary: null,
        });
      }
      // Reset input value so same file can be re-selected if desired
      if (backupInputRef.current) backupInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = (mode) => {
    if (!restoreCandidate?.data) return;

    // 1. Create safety snapshot before altering live state
    const snapResult = createPreRestoreSnapshot({
      items: allItems,
      queue: allQueue,
      settings: currentSettings,
    });

    if (snapResult.ok) {
      setSnapshotTimestamp(snapResult.timestamp);
    }

    // 2. Perform restore
    onRestoreBackup(restoreCandidate.data, mode);
    setRestoreCandidate(null);
  };

  const handleRollbackSnapshot = () => {
    const snapshot = getPreRestoreSnapshot();
    if (!snapshot) {
      alert("No pre-restore snapshot found.");
      return;
    }
    if (window.confirm(`Roll back to snapshot from ${new Date(snapshot.snapshotTimestamp).toLocaleString()}?`)) {
      onRestoreBackup(snapshot, "replace");
      alert("Rolled back to previous snapshot successfully.");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    background: "#181818",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.white,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 5,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          backgroundColor: "#111111",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sliders size={20} color={C.red} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>App & Sticker Settings</div>
              <div style={{ fontSize: 12, color: C.muted }}>Configure branding, contact details, hardware, and defaults</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.muted,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Section 1: Brand Info */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 12, textTransform: "uppercase" }}>
              1. Brand & Contact Information
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Company / Brand Name</label>
                <input
                  style={inputStyle}
                  value={currentSettings.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  placeholder="e.g. Babin Rentals"
                />
              </div>
              <div>
                <label style={labelStyle}>Contact Phone</label>
                <input
                  style={inputStyle}
                  value={currentSettings.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="e.g. 9860476255"
                />
              </div>
              <div>
                <label style={labelStyle}>Website Domain</label>
                <input
                  style={inputStyle}
                  value={currentSettings.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="e.g. babinrentals.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Sticker Ownership Caption</label>
                <input
                  style={inputStyle}
                  value={currentSettings.propertyText}
                  onChange={(e) => handleChange("propertyText", e.target.value)}
                  placeholder="e.g. PROPERTY OF BABIN RENTALS"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Logo */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 12, textTransform: "uppercase" }}>
              2. Brand Logo
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 12,
                background: "#161616",
                borderRadius: 8,
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  width: 90,
                  height: 48,
                  background: "#080808",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                  overflow: "hidden",
                }}
              >
                <img
                  src={currentSettings.customLogo || DEFAULT_LOGO_WHITE}
                  alt="Logo preview"
                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: "6px 12px",
                      background: "#262626",
                      border: "none",
                      borderRadius: 6,
                      color: C.white,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Upload size={13} />
                    Upload Custom Logo (PNG / SVG)
                  </button>
                  {currentSettings.customLogo && (
                    <button
                      onClick={() => handleChange("customLogo", null)}
                      style={{
                        padding: "6px 10px",
                        background: "none",
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.muted,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <RotateCcw size={12} />
                      Reset to Default
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  Transparent PNG or SVG with white/light artwork works best on all equipment.
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Hardware & Printing Defaults */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 12, textTransform: "uppercase" }}>
              3. Defaults & Barcode Options
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Default Code Display</label>
                <select
                  style={inputStyle}
                  value={currentSettings.defaultCodeType}
                  onChange={(e) => handleChange("defaultCodeType", e.target.value)}
                >
                  <option value="qr">Scannable 2D QR Code (Recommended)</option>
                  <option value="barcode">1D Barcode (Code 128)</option>
                  <option value="none">No Code (Logo + Text only)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Default Visual Theme</label>
                <select
                  style={inputStyle}
                  value={currentSettings.defaultTheme}
                  onChange={(e) => handleChange("defaultTheme", e.target.value)}
                >
                  <option value="dark">Stealth Dark (Signature Matte Black)</option>
                  <option value="light">High-Contrast White (Ink Saver / Laser)</option>
                  <option value="warning">Hazard Yellow (Delicate / High Voltage)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Smart Logo Placement</label>
                <select
                  style={inputStyle}
                  value={currentSettings.logoPlacement || "left"}
                  onChange={(e) => handleChange("logoPlacement", e.target.value)}
                >
                  <option value="left">Left Column (Classic Studio Layout)</option>
                  <option value="header">Top Header Bar (Modern Asset Tag)</option>
                  <option value="hidden">Hidden (Maximum Text Room)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Typography & Font Scaling</label>
                <select
                  style={inputStyle}
                  value={currentSettings.fontScale || "standard"}
                  onChange={(e) => handleChange("fontScale", e.target.value)}
                >
                  <option value="standard">Standard (Balanced Legibility)</option>
                  <option value="large">Large (High-Visibility Warehouse View)</option>
                  <option value="compact">Compact (Dense for Long Names)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Default Paper / Output Mode</label>
                <select
                  style={inputStyle}
                  value={currentSettings.paperSize}
                  onChange={(e) => handleChange("paperSize", e.target.value)}
                >
                  <option value="A4">A4 Sheet (Optimal 2D Bin Packing)</option>
                  <option value="Letter">US Letter Sheet</option>
                  <option value="Roll">Continuous Thermal Roll (1 Label / Page)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>QR Code Target URL Template</label>
                <input
                  style={inputStyle}
                  value={currentSettings.qrUrlPattern}
                  onChange={(e) => handleChange("qrUrlPattern", e.target.value)}
                  placeholder="https://babinrentals.com/items/{sku}"
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="showPhoneCb"
                  checked={currentSettings.showPhone !== false}
                  onChange={(e) => handleChange("showPhone", e.target.checked)}
                />
                <label htmlFor="showPhoneCb" style={{ fontSize: 12, color: C.white, cursor: "pointer" }}>
                  Print Contact Phone on Standard & Large Labels
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="showCategoryCb"
                  checked={currentSettings.showCategoryBadge !== false}
                  onChange={(e) => handleChange("showCategoryBadge", e.target.checked)}
                />
                <label htmlFor="showCategoryCb" style={{ fontSize: 12, color: C.white, cursor: "pointer" }}>
                  Display Equipment Category Badge & Icon
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Data Management & Backup */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 12, textTransform: "uppercase" }}>
              4. Backup, Restore & Rollback
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={handleBackupExport}
                style={{
                  padding: "8px 14px",
                  background: "#1E2A38",
                  border: `1px solid ${C.blue}44`,
                  borderRadius: 6,
                  color: C.blue,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Download size={14} />
                Export Full Backup (.json)
              </button>

              <button
                onClick={() => backupInputRef.current?.click()}
                style={{
                  padding: "8px 14px",
                  background: "#1A2E1E",
                  border: `1px solid ${C.green}44`,
                  borderRadius: 6,
                  color: C.green,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FileUp size={14} />
                Import Backup (.json)
              </button>

              {snapshotTimestamp && (
                <button
                  onClick={handleRollbackSnapshot}
                  style={{
                    padding: "8px 12px",
                    background: "#241818",
                    border: `1px solid ${C.redDim}`,
                    borderRadius: 6,
                    color: C.white,
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                  title="Roll back to previous pre-restore snapshot"
                >
                  <Undo2 size={13} color={C.red} />
                  <span>Undo Last Restore</span>
                </button>
              )}

              <input
                ref={backupInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleBackupFileSelect}
              />
            </div>

            {/* Validation / Restore Confirmation Box */}
            {restoreCandidate && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: restoreCandidate.errors.length ? "#2D1517" : "#14202C",
                  border: `1px solid ${restoreCandidate.errors.length ? C.red : C.blue}`,
                  borderRadius: 8,
                }}
              >
                {restoreCandidate.errors.length > 0 ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.red, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                      <ShieldAlert size={16} />
                      <span>Backup Validation Failed</span>
                    </div>
                    <ul style={{ paddingLeft: 20, fontSize: 12, color: C.white, lineHeight: 1.5, margin: 0 }}>
                      {restoreCandidate.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setRestoreCandidate(null)}
                      style={{
                        marginTop: 12,
                        padding: "5px 12px",
                        background: "#333",
                        border: "none",
                        color: C.white,
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.blue, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                      <CheckCircle2 size={16} />
                      <span>Valid Backup File ({restoreCandidate.summary.brand})</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.white, lineHeight: 1.6, marginBottom: 12 }}>
                      <div>• Inventory Items: <strong>{restoreCandidate.summary.itemsCount}</strong></div>
                      <div>• Queued Labels: <strong>{restoreCandidate.summary.queueCount}</strong></div>
                      <div>• Backup Date: {restoreCandidate.summary.timestamp ? new Date(restoreCandidate.summary.timestamp).toLocaleString() : "Not specified"}</div>
                      {restoreCandidate.summary.duplicateSkusCount > 0 && (
                        <div style={{ color: "#E8A13A", marginTop: 4 }}>
                          ⚠️ Backup contains {restoreCandidate.summary.duplicateSkusCount} duplicate SKU(s).
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                      A safety snapshot of your current data will be saved automatically before applying.
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleExecuteRestore("replace")}
                        style={{
                          padding: "6px 14px",
                          background: C.red,
                          border: "none",
                          borderRadius: 5,
                          color: C.white,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Replace All Current Data
                      </button>
                      <button
                        onClick={() => handleExecuteRestore("merge")}
                        style={{
                          padding: "6px 14px",
                          background: "#2A3B4D",
                          border: `1px solid ${C.blue}`,
                          borderRadius: 5,
                          color: C.white,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Safe Merge with Current Data
                      </button>
                      <button
                        onClick={() => setRestoreCandidate(null)}
                        style={{
                          padding: "6px 12px",
                          background: "none",
                          border: `1px solid ${C.border}`,
                          borderRadius: 5,
                          color: C.muted,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
