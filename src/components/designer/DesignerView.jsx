import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Printer,
} from "lucide-react";
import {
  C,
  TEMPLATES,
  TEMPLATE_IDS,
  makeSequencedSku,
  parseSkuSeed,
} from "../../config/tokens.js";
import { CategoryTypeBadge } from "../common/Icons.jsx";
import { StickerRender } from "../sticker/StickerRender.jsx";
import { reservePrintWindow } from "../../utils/printUtils.js";

export function DesignerView({
  items = [],
  selectedItem,
  setSelectedItem,
  templateId,
  setTemplateId,
  onAddToQueue,
  onDirectPrintItem,
  showToast,
  isMobile,
  isPhone,
  settings,
}) {
  const currentItem = selectedItem || items[0] || {
    id: "demo",
    name: "Sony FX3 Cinema Line Camera Kit",
    sku: "CAM-FX3-01",
    category: "Camera",
    qr_url: "https://babinrentals.com/items/CAM-FX3-01",
  };

  const [theme, setTheme] = useState(() => settings?.defaultTheme || "dark");
  const [codeType, setCodeType] = useState(() => settings?.defaultCodeType || "qr");
  const [logoPlacement, setLogoPlacement] = useState(() => settings?.logoPlacement || "left");
  const [fontScale, setFontScale] = useState(() => settings?.fontScale || "standard");
  const [showDielines, setShowDielines] = useState(false);
  const [showCutMarks, setShowCutMarks] = useState(false);
  const [zoom, setZoom] = useState(1.3);
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState("");

  // Sequencing state
  const seed = parseSkuSeed(currentItem.sku);
  const [sequenceConfig, setSequenceConfig] = useState({
    enabled: true,
    prefix: seed?.prefix ?? (currentItem.sku ? `${currentItem.sku}-` : "SKU-"),
    start: seed?.start ?? 1,
    pad: seed?.pad ?? 2,
  });

  // Synchronize sequence config when currentItem changes
  const prevSkuRef = useRef(currentItem.sku);
  useEffect(() => {
    if (prevSkuRef.current !== currentItem.sku) {
      prevSkuRef.current = currentItem.sku;
      const newSeed = parseSkuSeed(currentItem.sku);
      setSequenceConfig({
        enabled: true,
        prefix: newSeed?.prefix ?? (currentItem.sku ? `${currentItem.sku}-` : "SKU-"),
        start: newSeed?.start ?? 1,
        pad: newSeed?.pad ?? 2,
      });
    }
  }, [currentItem.sku]);

  const filteredItems = items.filter((i) => {
    const q = search.trim().toLowerCase();
    return !q || (i.name && i.name.toLowerCase().includes(q)) || (i.sku && i.sku.toLowerCase().includes(q));
  });

  const tpl = TEMPLATES[templateId] || TEMPLATES.t3;

  const handleQueueStickers = () => {
    onAddToQueue(currentItem, templateId, qty, sequenceConfig, { theme, codeType, logoPlacement, fontScale });
    showToast(`Added ${qty} sticker(s) of "${currentItem.name}" to print queue`);
  };

  const handleInstantPrint = () => {
    if (onDirectPrintItem) {
      // Synchronously reserve print window inside click gesture to prevent browser popup blocking
      const reservedWindow = reservePrintWindow();
      onDirectPrintItem(
        currentItem,
        templateId,
        qty,
        sequenceConfig,
        { theme, codeType, logoPlacement, fontScale },
        reservedWindow
      );
    } else {
      handleQueueStickers();
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: C.bg }}>
      {/* Left Item Selector Sidebar (Hidden on small phones unless toggled) */}
      {!isMobile && (
        <div
          style={{
            width: 280,
            borderRight: `1px solid ${C.border}`,
            background: "#141414",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, position: "relative" }}>
            <Search
              size={14}
              color={C.muted}
              style={{ position: "absolute", left: 22, top: 22, pointerEvents: "none" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment..."
              style={{
                width: "100%",
                padding: "8px 10px 8px 30px",
                background: "#1C1C1C",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.white,
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
            {filteredItems.map((item) => {
              const active = (item.id || item.sku) === (currentItem.id || currentItem.sku);
              return (
                <div
                  key={item.id || item.sku}
                  onClick={() => {
                    setSelectedItem(item);
                    const newSeed = parseSkuSeed(item.sku);
                    if (newSeed) {
                      setSequenceConfig((prev) => ({
                        ...prev,
                        prefix: newSeed.prefix,
                        start: newSeed.start,
                        pad: newSeed.pad,
                      }));
                    }
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    marginBottom: 3,
                    background: active ? "rgba(215,25,32,0.15)" : "transparent",
                    border: `1px solid ${active ? C.red : "transparent"}`,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: C.yellow }}>
                      {item.sku}
                    </span>
                    <CategoryTypeBadge category={item.category} name={item.name} compact />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Designer Canvas & Controls */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Template & Theme Controls Header */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: `1px solid ${C.border}`,
            background: "#121212",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {/* Size Selectors */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto" }}>
            {TEMPLATE_IDS.map((id) => {
              const t = TEMPLATES[id];
              const active = templateId === id;
              return (
                <button
                  key={id}
                  onClick={() => setTemplateId(id)}
                  style={{
                    padding: "5px 10px",
                    background: active ? C.red : "#1F1F1F",
                    border: `1px solid ${active ? C.red : C.border}`,
                    borderRadius: 6,
                    color: active ? C.white : C.muted,
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.name} ({t.w}x{t.h}mm)
                </button>
              );
            })}
          </div>

          {/* Theme & Code Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Theme Toggle */}
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{
                padding: "5px 10px",
                background: "#1E1E1E",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.white,
                fontSize: 11,
                outline: "none",
              }}
            >
              <option value="dark">🌑 Stealth Dark</option>
              <option value="light">☀️ High-Contrast White</option>
              <option value="warning">⚠️ Hazard Warning</option>
            </select>

            {/* Code Type */}
            <select
              value={codeType}
              onChange={(e) => setCodeType(e.target.value)}
              style={{
                padding: "5px 10px",
                background: "#1E1E1E",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.white,
                fontSize: 11,
                outline: "none",
              }}
            >
              <option value="qr">📱 QR Code</option>
              <option value="barcode">||| 1D Barcode</option>
              <option value="none">🚫 Text Only</option>
            </select>

            {/* Smart Logo Placement */}
            <select
              value={logoPlacement}
              onChange={(e) => setLogoPlacement(e.target.value)}
              style={{
                padding: "5px 10px",
                background: "#1E1E1E",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.white,
                fontSize: 11,
                outline: "none",
              }}
              title="Smart logo positioning inside sticker"
            >
              <option value="left">Logo: Left Column</option>
              <option value="header">Logo: Top Header Bar</option>
              <option value="hidden">Logo: Hidden</option>
            </select>

            {/* Font Sizing Scale */}
            <select
              value={fontScale}
              onChange={(e) => setFontScale(e.target.value)}
              style={{
                padding: "5px 10px",
                background: "#1E1E1E",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.white,
                fontSize: 11,
                outline: "none",
              }}
              title="Typography scaling"
            >
              <option value="standard">Font: Standard</option>
              <option value="large">Font: Large (High Visibility)</option>
              <option value="compact">Font: Compact (Dense)</option>
            </select>

            {/* Dielines / Guides */}
            <button
              onClick={() => setShowDielines(!showDielines)}
              style={{
                padding: "5px 10px",
                background: showDielines ? "#293B4D" : "#1E1E1E",
                border: `1px solid ${showDielines ? C.cyan : C.border}`,
                borderRadius: 6,
                color: showDielines ? C.cyan : C.muted,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              title="Toggle Bleed & Safe print guides"
            >
              {showDielines ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>Guides</span>
            </button>
          </div>
        </div>

        {/* Live Canvas Viewport */}
        <div
          style={{
            flex: 1,
            background: "#080808",
            backgroundImage: "radial-gradient(#1A1A1A 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 30,
            overflow: "auto",
            position: "relative",
          }}
        >
          {/* Sticker Preview Render with Smooth Scale */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
          >
            <StickerRender
              templateId={templateId}
              item={currentItem}
              scale={3.78}
              showDielines={showDielines}
              showCutMarks={showCutMarks}
              theme={theme}
              codeType={codeType}
              logoPlacement={logoPlacement}
              fontScale={fontScale}
              settings={settings}
            />
          </div>

          {/* Floating Zoom Bar */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(20,20,20,0.85)",
              backdropFilter: "blur(4px)",
              border: `1px solid ${C.border}`,
              padding: "4px 12px",
              borderRadius: 20,
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              style={{ background: "none", border: "none", color: C.white, cursor: "pointer", display: "flex", alignItems: "center" }}
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 11, color: C.muted, minWidth: 40, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              style={{ background: "none", border: "none", color: C.white, cursor: "pointer", display: "flex", alignItems: "center" }}
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <span style={{ color: C.border }}>|</span>
            <span style={{ fontSize: 11, color: C.white, fontWeight: 600 }}>
              {tpl.w} × {tpl.h} mm
            </span>
          </div>
        </div>

        {/* Bottom Sequencing & Action Bar */}
        <div
          style={{
            padding: "14px 20px",
            background: "#141414",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {/* Quantity & Sequencing */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Quantity:</span>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  style={{
                    padding: "6px 8px",
                    background: "#222",
                    border: `1px solid ${C.border}`,
                    borderRight: "none",
                    borderRadius: "6px 0 0 6px",
                    color: C.white,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{
                    width: 50,
                    textAlign: "center",
                    padding: "6px 0",
                    background: "#181818",
                    border: `1px solid ${C.border}`,
                    color: C.white,
                    fontWeight: 700,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => setQty((q) => q + 1)}
                  style={{
                    padding: "6px 8px",
                    background: "#222",
                    border: `1px solid ${C.border}`,
                    borderLeft: "none",
                    borderRadius: "0 6px 6px 0",
                    color: C.white,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Sequence preview if qty > 1 */}
            {qty > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ color: C.muted }}>Sequence:</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.yellow, fontWeight: 600 }}>
                  {makeSequencedSku(currentItem.sku, sequenceConfig, 0)} → {makeSequencedSku(currentItem.sku, sequenceConfig, qty - 1)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleInstantPrint}
              style={{
                padding: "10px 16px",
                background: "#1E2A38",
                border: `1px solid ${C.blue}55`,
                borderRadius: 8,
                color: C.blue,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              title="Print directly to roll label printer or single sheet without going to queue"
            >
              <Printer size={15} /> Instant Print ({qty})
            </button>

            <button
              onClick={handleQueueStickers}
              style={{
                padding: "10px 22px",
                background: C.red,
                border: "none",
                borderRadius: 8,
                color: C.white,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 14px rgba(215,25,32,0.4)",
              }}
            >
              <Plus size={16} strokeWidth={2.5} /> Add {qty} to Print Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DesignerView;
