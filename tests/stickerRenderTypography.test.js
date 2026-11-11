import { describe, it, expect } from "vitest";
import {
  calculateFitSkuFontSize,
  calculateSmartFontSizes,
  TEMPLATES,
  resolveTemplateId,
} from "../src/config/tokens.js";
import { DEFAULT_LOGO_WHITE, DEFAULT_LOGO_SVG } from "../src/config/defaultLogo.js";

describe("Sticker Typography & Auto-Fitting", () => {
  describe("calculateFitSkuFontSize", () => {
    it("returns maxFs for standard 10-char SKU on compact 45x15mm tag with ~96px text width", () => {
      const fs = calculateFitSkuFontSize({
        sku: "CAM-FX3-01",
        availableWidth: 96,
        maxFs: 11,
        minFs: 7.5,
        showIcon: false,
        compact: true,
      });
      // 96px - 8px pill = 88px; 10 chars * 0.60 = 6.0px/em -> 88 / 6.0 = 14.6px -> maxFs is 11
      expect(fs).toBe(11);
    });

    it("dynamically scales down long SKUs to fit without truncation", () => {
      const fs = calculateFitSkuFontSize({
        sku: "GRP-10-10-SKM-KIT",
        availableWidth: 96,
        maxFs: 11,
        minFs: 7,
        showIcon: false,
        compact: true,
      });
      // 96px - 8px pill = 88px; 17 chars * 0.60 = 10.2px/em -> 88 / 10.2 = 8.6px -> 8px
      expect(fs).toBeLessThanOrEqual(9);
      expect(fs).toBeGreaterThanOrEqual(7);

      // Verify that at this font size, 17 chars * fs * 0.60 + 8px overhead <= 96px
      const totalWidth = 17 * (fs * 0.60) + 8;
      expect(totalWidth).toBeLessThanOrEqual(96);
    });

    it("respects minFs floor even on exceptionally long identifiers", () => {
      const fs = calculateFitSkuFontSize({
        sku: "VERY-VERY-LONG-EQUIPMENT-IDENTIFIER-NUMBER-9999",
        availableWidth: 80,
        maxFs: 11,
        minFs: 6.5,
        showIcon: false,
        compact: true,
      });
      expect(fs).toBe(6.5);
    });

    it("accounts for category icon overhead when showIcon is true", () => {
      const fsWithoutIcon = calculateFitSkuFontSize({
        sku: "AUDIO-TX-01",
        availableWidth: 80,
        maxFs: 11,
        minFs: 6.5,
        showIcon: false,
        compact: true,
      });
      const fsWithIcon = calculateFitSkuFontSize({
        sku: "AUDIO-TX-01",
        availableWidth: 80,
        maxFs: 11,
        minFs: 6.5,
        showIcon: true,
        compact: true,
      });
      expect(fsWithIcon).toBeLessThanOrEqual(fsWithoutIcon);
    });
  });

  describe("calculateSmartFontSizes", () => {
    it("safely fits SKU within availableWidth accounting for pill padding and icon", () => {
      const result = calculateSmartFontSizes({
        name: "Sony FX3 Cinema Line Camera",
        sku: "CAM-FX3-01",
        propertyText: "PROPERTY OF BABIN RENTALS",
        availableWidth: 100,
        availableHeight: 50,
        fontScale: "standard",
        maxNameLines: 2,
        showCategory: true,
      });

      expect(result.skuFs).toBeGreaterThanOrEqual(7);
      expect(result.nameFs).toBeGreaterThanOrEqual(6.5);
      expect(result.propFs).toBeGreaterThanOrEqual(4.5);

      // Verify total SKU pill width does not exceed availableWidth
      const skuTextWidth = "CAM-FX3-01".length * (result.skuFs * 0.60);
      const pillOverhead = 12; // standard pill padding + border
      expect(skuTextWidth + pillOverhead).toBeLessThanOrEqual(100);
    });

    it("dynamically adjusts name font size according to line clamp", () => {
      const twoLineResult = calculateSmartFontSizes({
        name: "Aputure 600d Pro LED Light Kit with Fresnel and Barndoors",
        sku: "LGT-600D-PRO",
        propertyText: "PROPERTY OF BABIN RENTALS",
        availableWidth: 120,
        availableHeight: 60,
        fontScale: "standard",
        maxNameLines: 2,
      });
      const threeLineResult = calculateSmartFontSizes({
        name: "Aputure 600d Pro LED Light Kit with Fresnel and Barndoors",
        sku: "LGT-600D-PRO",
        propertyText: "PROPERTY OF BABIN RENTALS",
        availableWidth: 120,
        availableHeight: 60,
        fontScale: "standard",
        maxNameLines: 3,
      });
      expect(twoLineResult.lineClamp).toBe(2);
      expect(threeLineResult.lineClamp).toBe(3);
    });
  });

  describe("Brand Logo Validity", () => {
    it("provides a valid, non-empty, and standards-compliant SVG data URI for DEFAULT_LOGO_WHITE", () => {
      expect(DEFAULT_LOGO_WHITE).toBeDefined();
      expect(DEFAULT_LOGO_WHITE.startsWith("data:image/svg+xml")).toBe(true);
      expect(DEFAULT_LOGO_WHITE.length).toBeGreaterThan(100);

      // Decode and verify valid SVG markup
      const decoded = decodeURIComponent(DEFAULT_LOGO_WHITE.replace(/^data:image\/svg\+xml;utf8,/, ""));
      expect(decoded).toContain("<svg");
      expect(decoded).toContain("BABIN");
      expect(decoded).toContain("RENTALS");
      expect(decoded).toContain("</svg>");
    });
  });
});
