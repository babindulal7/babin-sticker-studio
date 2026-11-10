import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, Palette, CheckCircle2 } from "lucide-react";
import { C, suggestTemplate, TEMPLATES } from "../../config/tokens.js";
import { CategoryTypeBadge } from "./Icons.jsx";
import { StickerRender } from "../sticker/StickerRender.jsx";

export function QuickSearchModal({
  isOpen,
  onClose,
  items = [],
  onAddToQueue,
  onOpenInDesigner,
  onTogglePrinted,
  settings,
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();
  const matchedItems = trimmed
    ? items.filter(
        (i) =>
          (i.sku && i.sku.toLowerCase().includes(trimmed)) ||
          (i.name && i.name.toLowerCase().includes(trimmed)) ||
          (i.category && i.category.toLowerCase().includes(trimmed))
      ).slice(0, 8)
    : items.slice(0, 5);

  const exactSkuMatch = trimmed
    ? items.find((i) => i.sku && i.sku.toLowerCase() === trimmed)
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 9999,
        paddingTop: "10vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          backgroundColor: "#111111",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          boxShadow: "0 25px 50px rgba(0,0,0,0.8)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#161616",
          }}
        >
          <Search size={18} color={C.muted} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan barcode or type SKU / Name (e.g. CAM-01, FX3)..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.white,
              fontSize: 16,
              fontWeight: 500,
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter") {
                const target = exactSkuMatch || (matchedItems.length === 1 ? matchedItems[0] : null);
                if (target) {
                  onAddToQueue(target, suggestTemplate(target.category, target.name), 1);
                  onClose();
                }
              }
            }}
          />
          <span
            style={{
              fontSize: 11,
              padding: "2px 6px",
              background: "#262626",
              borderRadius: 4,
              color: C.muted,
            }}
          >
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: 420, overflowY: "auto", padding: 8 }}>
          {matchedItems.length === 0 ? (
            <div style={{ padding: "30px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>
              No inventory matching "{query}". Check spelling or import the item.
            </div>
          ) : (
            matchedItems.map((item) => {
              const suggested = suggestTemplate(item.category, item.name);
              const tpl = TEMPLATES[suggested];
              const isExact = exactSkuMatch?.sku === item.sku;

              return (
                <div
                  key={item.id || item.sku}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 4,
                    background: isExact ? "rgba(215,25,32,0.12)" : "#141414",
                    border: `1px solid ${isExact ? C.red : C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    {/* Mini Sticker Preview */}
                    <div style={{ transform: "scale(0.55)", transformOrigin: "left center", width: (tpl?.w || 70) * 3.78 * 0.55, height: (tpl?.h || 30) * 3.78 * 0.55 }}>
                      <StickerRender
                        templateId={suggested}
                        item={item}
                        scale={3.78}
                        settings={settings}
                        codeType={settings?.defaultCodeType || "qr"}
                        theme={settings?.defaultTheme || "dark"}
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{item.name}</span>
                        <CategoryTypeBadge category={item.category} name={item.name} compact />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: C.yellow, fontWeight: 600 }}>
                          {item.sku}
                        </span>
                        <span style={{ fontSize: 11, color: C.muted }}>• Size: {tpl?.size || "70x30 mm"}</span>
                        {item.isPrinted && (
                          <span style={{ fontSize: 10, color: C.green, background: "rgba(50,208,116,0.1)", padding: "1px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <CheckCircle2 size={10} /> Printed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        onAddToQueue(item, suggested, 1);
                        onClose();
                      }}
                      style={{
                        padding: "6px 12px",
                        background: C.red,
                        border: "none",
                        borderRadius: 6,
                        color: C.white,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Plus size={13} /> Queue (1)
                    </button>
                    <button
                      onClick={() => {
                        onOpenInDesigner(item, suggested);
                        onClose();
                      }}
                      style={{
                        padding: "6px 10px",
                        background: "#222222",
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.white,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Palette size={13} /> Design
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickSearchModal;
