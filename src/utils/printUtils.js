import { TEMPLATES, resolveTemplateId, makeSequencedSku } from "../config/tokens.js";

/**
 * Escapes unsafe characters for HTML embedding
 */
export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Expands an item + quantity + sequenceConfig into an array of individual label objects
 * with properly sequenced, zero-padded SKUs.
 */
export function expandSequencedLabels({
  item,
  templateId = "t3",
  qty = 1,
  sequenceConfig = { enabled: true },
  options = {},
}) {
  const count = Math.max(1, parseInt(qty, 10) || 1);
  const resolvedTemplate = resolveTemplateId(templateId);

  return Array.from({ length: count }, (_, idx) => {
    const sequencedSku = makeSequencedSku(item?.sku, sequenceConfig, idx);
    return {
      templateId: resolvedTemplate,
      item: {
        ...item,
        sku: sequencedSku,
      },
      options: { ...options },
      _sequenceIndex: idx,
      _uniqueKey: `${item?.sku || "item"}-${idx}-${Date.now()}-${Math.random()}`,
    };
  });
}

/**
 * Returns physical paper dimensions in millimeters
 */
export function getPaperDimensions(paperSize = "A4") {
  if (paperSize === "Letter") return { w: 215.9, h: 279.4, name: "US Letter" };
  if (paperSize === "Roll") return { w: 62, h: 100, name: "Thermal Roll (Single)" };
  return { w: 210, h: 297, name: "A4 Sheet" };
}

/**
 * Builds the complete, safe HTML document for printing stickers.
 * Uses strict @page geometry, print-color-adjust, and a readiness script that
 * waits for fonts and images before invoking window.print().
 */
export function buildPrintDocumentHtml({
  contentHtml = "",
  paperSize = "Roll",
  paperDims = { w: 62, h: 100 },
  sheetMargin = 5,
  title = "Print Stickers",
  brandName = "Babin Rentals",
  autoClose = true,
}) {
  const isRoll = paperSize === "Roll";
  const pageSizeCss = isRoll
    ? "@page { size: auto; margin: 0mm; }"
    : `@page { size: ${paperDims.w}mm ${paperDims.h}mm; margin: 0mm; }`;

  const safeTitle = escapeHtml(title || `Print Stickers - ${brandName}`);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      ${pageSizeCss}
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #FFFFFF;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .page-sheet {
        position: relative;
        width: ${paperDims.w}mm;
        height: ${paperDims.h}mm;
        page-break-after: always;
        break-after: page;
        overflow: hidden;
        margin: 0 auto;
        padding: ${sheetMargin}mm;
      }
      .roll-label {
        page-break-after: always;
        break-after: page;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
      }
      @media screen {
        body { background: #E5E7EB; padding: 20px; }
        .page-sheet { background: #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px; }
        .roll-label { background: #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px; padding: 10px; }
      }
    </style>
  </head>
  <body>
    ${contentHtml}
    <script>
      (function() {
        var printed = false;
        async function runPrint() {
          if (printed) return;
          printed = true;
          try {
            if (document.fonts && document.fonts.ready) {
              await document.fonts.ready;
            }
            var imgs = Array.from(document.images);
            await Promise.all(imgs.map(function(img) {
              if (img.complete) return Promise.resolve();
              return new Promise(function(resolve) {
                img.onload = img.onerror = resolve;
              });
            }));
          } catch (e) {}

          // Allow two rendering frames for SVG and styles to settle
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              window.focus();
              try {
                window.print();
              } catch (err) {
                console.error("Print failed:", err);
              }
            });
          });
        }

        window.addEventListener('load', runPrint);
        if (document.readyState === 'complete') {
          runPrint();
        }

        ${
          autoClose
            ? `window.addEventListener('afterprint', function() {
          setTimeout(function() { window.close(); }, 300);
        });`
            : ""
        }
      })();
    </script>
  </body>
</html>`;
}

/**
 * Dispatches HTML to print window (or Electron desktopPrint API if available).
 * Returns { ok: boolean, error?: string }.
 */
export async function executePrintHtml(html, title = "Print Stickers") {
  // If running in Electron with desktopPrint API
  if (typeof window !== "undefined" && window.desktopPrint?.printHtml) {
    try {
      const res = await window.desktopPrint.printHtml({ html, title });
      return res || { ok: true };
    } catch (err) {
      console.error("Desktop print invocation failed:", err);
      // Fallback to window.open below
    }
  }

  // Web Browser / Electron window.open path
  if (typeof window === "undefined" || !window.open) {
    return { ok: false, error: "Window environment not available" };
  }

  const printWin = window.open("", "_blank", "width=1100,height=800,menubar=no,toolbar=no");
  if (!printWin) {
    return {
      ok: false,
      error: "Pop-up blocked. Please allow pop-ups for this site to print stickers.",
    };
  }

  try {
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || "Failed to write print document" };
  }
}
