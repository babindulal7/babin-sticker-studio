import { describe, it, expect } from "vitest";
import {
  expandSequencedLabels,
  getPaperDimensions,
  buildPrintDocumentHtml,
  escapeHtml,
} from "../src/utils/printUtils.js";

describe("printUtils - Label Sequence Expansion & Document Generation", () => {
  it("expands a single label (qty=1) correctly", () => {
    const item = {
      id: "test-1",
      name: "Sony FX3 Camera",
      sku: "CAM-FX3-01",
      category: "Camera",
    };

    const labels = expandSequencedLabels({
      item,
      templateId: "t3",
      qty: 1,
      sequenceConfig: { enabled: true, prefix: "CAM-FX3-", start: 1, pad: 2 },
    });

    expect(labels).toHaveLength(1);
    expect(labels[0].item.sku).toBe("CAM-FX3-01");
    expect(labels[0].templateId).toBe("t3");
  });

  it("expands 5 sequenced labels with correct zero-padding without duplicates or skips", () => {
    const item = {
      id: "lens-1",
      name: "Sony 24-70mm GM II",
      sku: "LENS-2470-01",
      category: "Lens",
    };

    const labels = expandSequencedLabels({
      item,
      templateId: "t2",
      qty: 5,
      sequenceConfig: { enabled: true, prefix: "LENS-2470-", start: 1, pad: 2 },
    });

    expect(labels).toHaveLength(5);
    expect(labels.map((l) => l.item.sku)).toEqual([
      "LENS-2470-01",
      "LENS-2470-02",
      "LENS-2470-03",
      "LENS-2470-04",
      "LENS-2470-05",
    ]);

    // Check unique keys exist
    const uniqueKeys = new Set(labels.map((l) => l._uniqueKey));
    expect(uniqueKeys.size).toBe(5);
  });

  it("handles non-sequenced items by repeating the base SKU", () => {
    const item = {
      id: "acc-1",
      name: "D-Tap to USB-C Cable",
      sku: "CAB-DTAP-USBC",
      category: "Cable",
    };

    const labels = expandSequencedLabels({
      item,
      templateId: "tc",
      qty: 3,
      sequenceConfig: { enabled: false },
    });

    expect(labels).toHaveLength(3);
    expect(labels[0].item.sku).toBe("CAB-DTAP-USBC");
    expect(labels[1].item.sku).toBe("CAB-DTAP-USBC");
    expect(labels[2].item.sku).toBe("CAB-DTAP-USBC");
  });

  it("returns correct physical paper dimensions in mm", () => {
    expect(getPaperDimensions("A4")).toEqual({ w: 210, h: 297, name: "A4 Sheet" });
    expect(getPaperDimensions("Letter")).toEqual({ w: 215.9, h: 279.4, name: "US Letter" });
    expect(getPaperDimensions("Roll")).toEqual({ w: 62, h: 100, name: "Thermal Roll (Single)" });
  });

  it("builds print document HTML with strict CSS and ready checks", () => {
    const contentHtml = '<div class="test-label">Sticker Content</div>';
    const docHtml = buildPrintDocumentHtml({
      contentHtml,
      paperSize: "Roll",
      paperDims: { w: 62, h: 100 },
      title: "Print - Sony FX3",
      brandName: "Babin Rentals",
    });

    expect(docHtml).toContain("<!doctype html>");
    expect(docHtml).toContain("<title>Print - Sony FX3</title>");
    expect(docHtml).toContain("@page { size: auto; margin: 0mm; }");
    expect(docHtml).toContain("-webkit-print-color-adjust: exact !important");
    expect(docHtml).toContain(contentHtml);
    expect(docHtml).toContain("document.fonts.ready");
    expect(docHtml).toContain("window.print()");
  });

  it("escapes dangerous HTML/XSS in title and parameters safely", () => {
    const maliciousTitle = '<script>alert("xss")</script>';
    const escaped = escapeHtml(maliciousTitle);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');

    const docHtml = buildPrintDocumentHtml({
      contentHtml: "Safe",
      title: maliciousTitle,
    });
    expect(docHtml).not.toContain('<script>alert("xss")</script>');
    expect(docHtml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});
