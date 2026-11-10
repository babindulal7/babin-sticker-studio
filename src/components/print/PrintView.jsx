import React, { useState, useRef, useMemo } from "react";
import {
  Trash2,
  Scissors,
  Minus,
  Plus,
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  C,
  TEMPLATES,
  resolveTemplateId,
  makeSequencedSku,
} from "../../config/tokens.js";
import { StickerRender } from "../sticker/StickerRender.jsx";
import {
  buildPrintDocumentHtml,
  executePrintHtml,
  getPaperDimensions,
  reservePrintWindow,
} from "../../utils/printUtils.js";

export function PrintView({
  queue,
  setQueue,
  showToast,
  isMobile,
  isPhone,
  settings,
}) {
  const [paperSize, setPaperSize] = useState(() => settings?.paperSize || "A4"); // "A4" | "Letter" | "Roll"
  const [themeOverride, setThemeOverride] = useState("auto"); // "auto" | "dark" | "light" | "warning"
  const [codeOverride, setCodeOverride] = useState("auto"); // "auto" | "qr" | "barcode" | "none"
  const [showCutMarks, setShowCutMarks] = useState(false);
  const [sheetGap, setSheetGap] = useState(1.5); // mm
  const [sheetMargin, setSheetMargin] = useState(5); // mm
  const [previewPage, setPreviewPage] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1.1);

  const printRef = useRef(null);

  // Expand queue items with sequenced SKUs
  const stickerList = useMemo(() => {
    return queue.flatMap((entry) => {
      const count = Math.max(1, entry.qty || 1);
      const seqConfig = entry.sequenceConfig || { enabled: true };
      return Array.from({ length: count }, (_, idx) => ({
        ...entry,
        item: {
          ...entry.item,
          sku: makeSequencedSku(entry.item?.sku, seqConfig, idx),
        },
        _uniqueId: `${entry.item?.sku || "item"}-${idx}-${Math.random()}`,
      }));
    });
  }, [queue]);

  // Paper Dimensions
  const paperDims = useMemo(() => {
    return getPaperDimensions(paperSize, stickerList[0]?.templateId);
  }, [paperSize, stickerList]);

  const printable = useMemo(() => {
    return {
      w: Math.max(10, paperDims.w - sheetMargin * 2),
      h: Math.max(10, paperDims.h - sheetMargin * 2),
    };
  }, [paperDims, sheetMargin]);

  // 2D Bin Packing for Sheet mode (A4/Letter)
  const previewPages = useMemo(() => {
    if (paperSize === "Roll") {
      // In Roll Mode, each sticker gets its own dedicated single page
      return stickerList.map((entry) => ({
        items: [
          {
            entry,
            t: TEMPLATES[resolveTemplateId(entry.templateId)] || TEMPLATES.t3,
            x: 0,
            y: 0,
            w: (TEMPLATES[resolveTemplateId(entry.templateId)] || TEMPLATES.t3).w,
            h: (TEMPLATES[resolveTemplateId(entry.templateId)] || TEMPLATES.t3).h,
            rotated: false,
          },
        ],
      }));
    }

    // A4 / Letter Packing
    const pages = [];
    const packedList = [...stickerList].sort((a, b) => {
      const at = TEMPLATES[resolveTemplateId(a.templateId)] || TEMPLATES.t3;
      const bt = TEMPLATES[resolveTemplateId(b.templateId)] || TEMPLATES.t3;
      return bt.h * bt.w - at.h * at.w;
    });

    const pruneFreeRects = (rects) =>
      rects.filter(
        (rect, idx) =>
          rect.w > 1 &&
          rect.h > 1 &&
          !rects.some(
            (other, oIdx) =>
              oIdx !== idx &&
              rect.x >= other.x &&
              rect.y >= other.y &&
              rect.x + rect.w <= other.x + other.w &&
              rect.y + rect.h <= other.y + other.h
          )
      );

    const findPlacement = (page, t) => {
      let best = null;
      page.free.forEach((rect, idx) => {
        if (t.w <= rect.w && t.h <= rect.h) {
          const waste = rect.w * rect.h - t.w * t.h;
          const score = waste + rect.y * 10 + rect.x;
          if (!best || score < best.score) {
            best = { idx, rect, score };
          }
        }
      });
      return best;
    };

    packedList.forEach((entry) => {
      const templateId = resolveTemplateId(entry.templateId);
      const t = TEMPLATES[templateId] || TEMPLATES.t3;

      let placed = false;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const placement = findPlacement(page, t);
        if (placement) {
          const { rect, idx } = placement;
          page.items.push({
            entry,
            t,
            x: rect.x,
            y: rect.y,
            w: t.w,
            h: t.h,
          });

          const rightRect = {
            x: rect.x + t.w + sheetGap,
            y: rect.y,
            w: rect.w - t.w - sheetGap,
            h: t.h,
          };
          const bottomRect = {
            x: rect.x,
            y: rect.y + t.h + sheetGap,
            w: rect.w,
            h: rect.h - t.h - sheetGap,
          };

          page.free.splice(idx, 1, rightRect, bottomRect);
          page.free = pruneFreeRects(page.free);
          placed = true;
          break;
        }
      }

      if (!placed) {
        const newPage = {
          items: [{ entry, t, x: 0, y: 0, w: t.w, h: t.h }],
          free: [
            {
              x: t.w + sheetGap,
              y: 0,
              w: printable.w - t.w - sheetGap,
              h: t.h,
            },
            {
              x: 0,
              y: t.h + sheetGap,
              w: printable.w,
              h: printable.h - t.h - sheetGap,
            },
          ],
        };
        newPage.free = pruneFreeRects(newPage.free);
        pages.push(newPage);
      }
    });

    return pages;
  }, [stickerList, paperSize, printable, sheetGap]);

  const totalPages = Math.max(1, previewPages.length);
  const activePageIdx = Math.min(previewPage, totalPages - 1);
  const currentPage = previewPages[activePageIdx];

  // Print function
  const handlePrint = async () => {
    if (stickerList.length === 0) {
      showToast("Print queue is empty. Add stickers from Designer or Library first.", "error");
      return;
    }

    if (!printRef.current) {
      showToast("Print contents not ready yet, please wait a moment.", "error");
      return;
    }

    const reservedWin = reservePrintWindow();
    const isElectron = Boolean(typeof window !== "undefined" && window.desktopPrint?.isElectron);

    const html = buildPrintDocumentHtml({
      contentHtml: printRef.current.innerHTML,
      paperSize,
      paperDims,
      sheetMargin,
      title: `Print Stickers - ${settings?.brand || "Babin Rentals"} (${stickerList.length} Labels)`,
      brandName: settings?.brand || "Babin Rentals",
      autoClose: true,
      suppressWindowPrint: isElectron,
    });

    const res = await executePrintHtml(
      html,
      `Print Stickers - ${settings?.brand || "Babin Rentals"}`,
      reservedWin
    );

    if (!res.ok) {
      showToast(res.error || "Failed to launch print dialog", "error");
    } else if (res.cancelled) {
      showToast("Print cancelled");
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: C.bg }}>
      {/* Left: Queue Table & Settings (Width: 420px) */}
      <div
        style={{
          width: isMobile ? "100%" : 420,
          borderRight: `1px solid ${C.border}`,
          background: "#141414",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Queue Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>
              Print Queue ({stickerList.length} Labels)
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {queue.length} equipment entries queued
            </div>
          </div>
          {queue.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Clear all items from the print queue?")) {
                  setQueue([]);
                  showToast("Print queue cleared");
                }
              }}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                color: C.muted,
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Trash2 size={12} />
              Clear All
            </button>
          )}
        </div>

        {/* Paper & Layout Options */}
        <div
          style={{
            padding: 12,
            background: "#181818",
            borderBottom: `1px solid ${C.border}`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>
              Paper Format
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                background: "#222222",
                border: `1px solid ${C.border}`,
                borderRadius: 5,
                color: C.white,
                fontSize: 11,
                outline: "none",
              }}
            >
              <option value="A4">A4 Sheet (Sheet Packing)</option>
              <option value="Letter">US Letter Sheet</option>
              <option value="Roll">Thermal Roll (1 Label/Page)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>
              Visual Theme Override
            </label>
            <select
              value={themeOverride}
              onChange={(e) => setThemeOverride(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                background: "#222222",
                border: `1px solid ${C.border}`,
                borderRadius: 5,
                color: C.white,
                fontSize: 11,
                outline: "none",
              }}
            >
              <option value="auto">Per-item Theme</option>
              <option value="dark">Force Stealth Dark</option>
              <option value="light">Force White (Ink Saver)</option>
              <option value="warning">Force Hazard Warning</option>
            </select>
          </div>

          {paperSize !== "Roll" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>
                  Sticker Gap: {sheetGap} mm
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={sheetGap}
                  onChange={(e) => setSheetGap(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>
                  Crop Cut Marks
                </label>
                <button
                  onClick={() => setShowCutMarks(!showCutMarks)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    background: showCutMarks ? "#1C2D3D" : "#222222",
                    border: `1px solid ${showCutMarks ? C.cyan : C.border}`,
                    borderRadius: 5,
                    color: showCutMarks ? C.cyan : C.muted,
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                  }}
                >
                  <Scissors size={12} />
                  {showCutMarks ? "Cut Guides ON" : "Cut Guides OFF"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Queued Items List */}
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {queue.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 12 }}>
              Your print queue is empty.
              <br />
              <br />
              Go to <strong>Library</strong> or <strong>Designer</strong> to add stickers here.
            </div>
          ) : (
            queue.map((entry, idx) => {
              const t = TEMPLATES[resolveTemplateId(entry.templateId)] || TEMPLATES.t3;
              return (
                <div
                  key={idx}
                  style={{
                    padding: "10px 12px",
                    background: "#181818",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.item?.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: C.yellow }}>
                        {entry.item?.sku}
                      </span>
                      <span style={{ fontSize: 10, color: C.muted }}>• {t.name} ({t.size})</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {/* Quantity controls */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <button
                        onClick={() => {
                          const updated = [...queue];
                          if (entry.qty > 1) {
                            updated[idx].qty -= 1;
                            setQueue(updated);
                          } else {
                            setQueue(queue.filter((_, i) => i !== idx));
                          }
                        }}
                        style={{
                          padding: "3px 6px",
                          background: "#282828",
                          border: `1px solid ${C.border}`,
                          color: C.white,
                          borderRadius: "4px 0 0 4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Decrease quantity"
                      >
                        <Minus size={11} />
                      </button>
                      <span style={{ padding: "2px 8px", background: "#1F1F1F", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.white, fontWeight: 700 }}>
                        {entry.qty}
                      </span>
                      <button
                        onClick={() => {
                          const updated = [...queue];
                          updated[idx].qty += 1;
                          setQueue(updated);
                        }}
                        style={{
                          padding: "3px 6px",
                          background: "#282828",
                          border: `1px solid ${C.border}`,
                          color: C.white,
                          borderRadius: "0 4px 4px 0",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Increase quantity"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <button
                      onClick={() => setQueue(queue.filter((_, i) => i !== idx))}
                      style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", padding: 3 }}
                      title="Remove from queue"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Print Button Footer */}
        <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, background: "#111111" }}>
          <button
            onClick={handlePrint}
            disabled={stickerList.length === 0}
            style={{
              width: "100%",
              padding: "12px",
              background: stickerList.length > 0 ? C.red : "#333333",
              border: "none",
              borderRadius: 8,
              color: C.white,
              fontSize: 14,
              fontWeight: 800,
              cursor: stickerList.length > 0 ? "pointer" : "not-allowed",
              boxShadow: stickerList.length > 0 ? "0 4px 14px rgba(215,25,32,0.4)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Printer size={16} /> Print {stickerList.length} Stickers ({totalPages} {paperSize === "Roll" ? "Labels" : "Pages"})
          </button>
        </div>
      </div>

      {/* Right: Print Sheet & Roll Visual Preview */}
      {!isMobile && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#080808",
            overflow: "hidden",
          }}
        >
          {/* Top Pagination & Zoom controls */}
          <div
            style={{
              padding: "10px 16px",
              borderBottom: `1px solid ${C.border}`,
              background: "#121212",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: C.muted }}>
                {paperSize === "Roll" ? `Label ${activePageIdx + 1} of ${totalPages}` : `Page ${activePageIdx + 1} of ${totalPages}`}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                  disabled={activePageIdx === 0}
                  style={{
                    padding: "4px 8px",
                    background: "#222",
                    border: `1px solid ${C.border}`,
                    color: activePageIdx === 0 ? "#555" : C.white,
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: activePageIdx === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Previous page"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setPreviewPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={activePageIdx >= totalPages - 1}
                  style={{
                    padding: "4px 8px",
                    background: "#222",
                    border: `1px solid ${C.border}`,
                    color: activePageIdx >= totalPages - 1 ? "#555" : C.white,
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: activePageIdx >= totalPages - 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Next page"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setPreviewZoom((z) => Math.max(0.6, z - 0.15))}
                style={{ padding: "4px 8px", background: "#222", border: `1px solid ${C.border}`, color: C.white, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center" }}
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: 11, color: C.muted }}>{Math.round(previewZoom * 100)}%</span>
              <button
                onClick={() => setPreviewZoom((z) => Math.min(2.0, z + 0.15))}
                style={{ padding: "4px 8px", background: "#222", border: `1px solid ${C.border}`, color: C.white, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center" }}
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Visual Sheet Canvas */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: "radial-gradient(#1A1A1A 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {stickerList.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 13 }}>No stickers to display</div>
            ) : paperSize === "Roll" ? (
              // Continuous Roll Single Label Preview
              <div
                style={{
                  transform: `scale(${previewZoom * 1.5})`,
                  transformOrigin: "center center",
                  boxShadow: "0 15px 40px rgba(0,0,0,0.8)",
                  borderRadius: 6,
                }}
              >
                {currentPage?.items?.[0] && (
                  <StickerRender
                    templateId={currentPage.items[0].entry.templateId}
                    item={currentPage.items[0].entry.item}
                    scale={3.78}
                    theme={themeOverride !== "auto" ? themeOverride : currentPage.items[0].entry.options?.theme || "dark"}
                    codeType={codeOverride !== "auto" ? codeOverride : currentPage.items[0].entry.options?.codeType || "qr"}
                    logoPlacement={currentPage.items[0].entry.options?.logoPlacement || settings?.logoPlacement || "left"}
                    fontScale={currentPage.items[0].entry.options?.fontScale || settings?.fontScale || "standard"}
                    showCutMarks={showCutMarks}
                    settings={settings}
                  />
                )}
              </div>
            ) : (
              // A4 / Letter Sheet Preview
              <div
                style={{
                  width: paperDims.w * 3.78 * previewZoom,
                  height: paperDims.h * 3.78 * previewZoom,
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
                  position: "relative",
                  boxSizing: "border-box",
                  padding: sheetMargin * 3.78 * previewZoom,
                }}
              >
                {currentPage?.items?.map((placed, pIdx) => {
                  const appliedTheme =
                    themeOverride !== "auto"
                      ? themeOverride
                      : placed.entry.options?.theme || "dark";
                  const appliedCode =
                    codeOverride !== "auto"
                      ? codeOverride
                      : placed.entry.options?.codeType || "qr";

                  return (
                    <div
                      key={pIdx}
                      style={{
                        position: "absolute",
                        left: (sheetMargin + placed.x) * 3.78 * previewZoom,
                        top: (sheetMargin + placed.y) * 3.78 * previewZoom,
                        transform: `scale(${previewZoom})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <StickerRender
                        templateId={placed.entry.templateId}
                        item={placed.entry.item}
                        scale={3.78}
                        theme={appliedTheme}
                        codeType={appliedCode}
                        logoPlacement={placed.entry.options?.logoPlacement || settings?.logoPlacement || "left"}
                        fontScale={placed.entry.options?.fontScale || settings?.fontScale || "standard"}
                        showCutMarks={showCutMarks}
                        settings={settings}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Container Rendered for Printing Window Extraction */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          {previewPages.map((page, pIdx) => {
            if (paperSize === "Roll") {
              const item = page.items[0];
              if (!item) return null;
              return (
                <div key={pIdx} className="roll-label">
                  <StickerRender
                    templateId={item.entry.templateId}
                    item={item.entry.item}
                    scale={3.7795} // 96 DPI exact conversion
                    theme={themeOverride !== "auto" ? themeOverride : item.entry.options?.theme || "dark"}
                    codeType={codeOverride !== "auto" ? codeOverride : item.entry.options?.codeType || "qr"}
                    logoPlacement={item.entry.options?.logoPlacement || settings?.logoPlacement || "left"}
                    fontScale={item.entry.options?.fontScale || settings?.fontScale || "standard"}
                    showCutMarks={showCutMarks}
                    settings={settings}
                  />
                </div>
              );
            }

            return (
              <div key={pIdx} className="page-sheet">
                {page.items.map((placed, itemIdx) => {
                  const appliedTheme =
                    themeOverride !== "auto"
                      ? themeOverride
                      : placed.entry.options?.theme || "dark";
                  const appliedCode =
                    codeOverride !== "auto"
                      ? codeOverride
                      : placed.entry.options?.codeType || "qr";

                  return (
                    <div
                      key={itemIdx}
                      style={{
                        position: "absolute",
                        left: `${sheetMargin + placed.x}mm`,
                        top: `${sheetMargin + placed.y}mm`,
                      }}
                    >
                      <StickerRender
                        templateId={placed.entry.templateId}
                        item={placed.entry.item}
                        scale={3.7795}
                        theme={appliedTheme}
                        codeType={appliedCode}
                        logoPlacement={placed.entry.options?.logoPlacement || settings?.logoPlacement || "left"}
                        fontScale={placed.entry.options?.fontScale || settings?.fontScale || "standard"}
                        showCutMarks={showCutMarks}
                        settings={settings}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PrintView;
