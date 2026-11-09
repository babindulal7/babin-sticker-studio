import React from "react";
import {
  C,
  TEMPLATES,
  TYPE_COLORS,
  resolveTemplateId,
  getEquipmentType,
  calculateSmartFontSizes,
} from "../../config/tokens.js";
import { getTypeIcon } from "../common/Icons.jsx";
import { DEFAULT_LOGO_WHITE } from "../../config/defaultLogo.js";
import { QrCodeSvg } from "./QrCodeSvg.jsx";
import { BarcodeSvg } from "./BarcodeSvg.jsx";

export function StickerRender({
  templateId,
  item,
  scale = 3.78,
  showDielines = false,
  showCutMarks = false,
  theme = "dark", // "dark" | "light" | "warning"
  codeType = "qr", // "qr" | "barcode" | "none"
  logoPlacement = "auto", // "auto" | "left" | "header" | "hidden"
  fontScale = "auto", // "auto" | "compact" | "standard" | "large"
  showPhone = null,
  showCategoryBadge = null,
  settings = null,
}) {
  const resolvedId = resolveTemplateId(templateId);
  const t = TEMPLATES[resolvedId];
  if (!t) return null;

  const W = t.w * scale;
  const H = t.h * scale;

  // Resolve user settings & defaults
  const brandName = settings?.brand || "BABIN RENTALS";
  const propertyText = (settings?.propertyText || `PROPERTY OF ${brandName}`).toUpperCase();
  const phoneText = settings?.phone || "9860476255";
  const websiteText = settings?.website || "babinrentals.com";
  const logoSrc = settings?.customLogo || DEFAULT_LOGO_WHITE;

  const resolvedLogoPlacement =
    logoPlacement !== "auto" ? logoPlacement : settings?.logoPlacement || "left";
  const resolvedFontScale =
    fontScale !== "auto" ? fontScale : settings?.fontScale || "standard";
  const resolvedShowPhone =
    showPhone !== null ? showPhone : settings?.showPhone ?? true;
  const resolvedShowCategory =
    showCategoryBadge !== null ? showCategoryBadge : settings?.showCategoryBadge ?? true;

  const sku = item?.sku || "SKU-XXXX";
  const name = (item?.name || "Equipment Item").toUpperCase();
  const qrUrl = item?.qr_url || `https://${websiteText.replace(/^https?:\/\//, "")}/items/${sku}`;

  const type = getEquipmentType(item?.category, item?.name);
  const typeColor = TYPE_COLORS[type] || TYPE_COLORS.Other || C.white;

  const isLight = theme === "light";
  const isWarning = theme === "warning";

  // Visual Theme Palettes
  const bg = isLight ? "#FFFFFF" : isWarning ? "#121210" : "#0E0E0E";
  const textColor = isLight ? "#111111" : C.white;
  const skuColor = isLight ? "#111111" : isWarning ? "#F5C542" : "#F4F4F2";
  const propColor = isLight ? "#9E1C22" : isWarning ? "#F5C542" : "#D4A338";
  const stripColor = isWarning ? "#F5C542" : typeColor;
  const borderColor = isLight
    ? "#D5D5D5"
    : isWarning
      ? "#F5C542"
      : "rgba(255,255,255,0.09)";

  const corner = Math.min(8, H * 0.18);
  const isLarge = resolvedId === "t4";
  const isMicro = resolvedId === "t1";
  const isMini = resolvedId === "t1l";
  const isSmall = resolvedId === "t2" || resolvedId === "t2l";
  const isCableWrap = resolvedId === "tc";

  // Accent stripe height at top of sticker
  const stripH = isMicro
    ? 2.5
    : isMini
      ? 3.5
      : isCableWrap
        ? 3
        : isLarge
          ? 7
          : 5;

  const mono = {
    fontFamily: "'JetBrains Mono', monospace",
    fontVariantNumeric: "tabular-nums",
  };

  const noOverflowText = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const baseStyle = {
    width: W,
    height: H,
    position: "relative",
    overflow: "hidden",
    background: bg,
    borderRadius: isCableWrap ? 0 : corner,
    boxSizing: "border-box",
    flexShrink: 0,
    color: textColor,
    border: isWarning ? `1.5px solid ${borderColor}` : `1px solid ${borderColor}`,
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
  };

  // Cut marks & bleed dielines
  const cutMarks = showCutMarks ? (
    <div
      style={{
        position: "absolute",
        inset: -1,
        border: "1px dashed rgba(128,128,128,0.5)",
        pointerEvents: "none",
        zIndex: 20,
      }}
    />
  ) : null;

  const dielines = showDielines ? (
    <>
      <div
        style={{
          position: "absolute",
          inset: `${-t.bleed * scale}px`,
          border: "1.5px dashed #E8A13A",
          borderRadius: corner + 2,
          pointerEvents: "none",
          zIndex: 15,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: `${t.safe * scale}px`,
          border: "1px dashed #39B6D8",
          borderRadius: Math.max(corner - 2, 2),
          pointerEvents: "none",
          zIndex: 15,
        }}
      />
    </>
  ) : null;

  // Smart Logo Renderer
  const renderLogoImg = (maxH, maxW = "100%", extraStyle = {}) => {
    if (resolvedLogoPlacement === "hidden") return null;
    const isDefault = logoSrc === DEFAULT_LOGO_WHITE;
    return (
      <img
        src={logoSrc}
        alt=""
        style={{
          maxHeight: maxH,
          maxWidth: maxW,
          width: "auto",
          height: "auto",
          objectFit: "contain",
          display: "block",
          flexShrink: 0,
          filter: isLight && isDefault ? "brightness(0)" : "none",
          ...extraStyle,
        }}
      />
    );
  };

  // Scannable Code Renderer (QR or 1D Barcode)
  const renderCode = (sizePx, isSmallSlot = false) => {
    if (codeType === "none") return null;
    if (codeType === "barcode") {
      return (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarcodeSvg
            value={sku}
            height={Math.max(16, sizePx * 0.72)}
            width={isSmallSlot ? 0.9 : 1.15}
            lineColor={isLight ? "#000000" : "#FFFFFF"}
            boxBg={isLight ? "transparent" : "#FFFFFF"}
            boxPadding={2}
            borderRadius={3}
          />
        </div>
      );
    }

    return (
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <QrCodeSvg
          value={qrUrl}
          size={sizePx}
          fgColor="#000000"
          boxBg="#FFFFFF"
          boxPadding={isSmallSlot ? 1.5 : 2.5}
          borderRadius={3}
          margin={0}
        />
      </div>
    );
  };

  // Category Badge Pill
  const renderCategoryBadge = (compact = false) => {
    if (!resolvedShowCategory) return null;
    const iconSize = compact ? 9 : 11;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          padding: compact ? "1px 4px" : "1.5px 5.5px",
          borderRadius: 3,
          background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)",
          border: `1px solid ${typeColor}55`,
          color: typeColor,
          fontSize: compact ? 8 : 9,
          fontWeight: 700,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {getTypeIcon(type, typeColor, iconSize, 2)}
        <span>{type}</span>
      </span>
    );
  };

  // High-Contrast SKU Pill
  const renderSkuPill = (fontSize, showIcon = true) => {
    const iconSize = Math.max(8, Math.round(fontSize * 0.9));
    const pillBg = isLight
      ? "rgba(0,0,0,0.04)"
      : isWarning
        ? "rgba(245, 197, 66, 0.14)"
        : "rgba(255, 255, 255, 0.08)";
    const pillBorder = isLight
      ? "rgba(0,0,0,0.12)"
      : isWarning
        ? "rgba(245, 197, 66, 0.4)"
        : "rgba(255, 255, 255, 0.16)";

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: pillBg,
          border: `1px solid ${pillBorder}`,
          borderRadius: 4,
          padding: "1.5px 6px",
          maxWidth: "100%",
          minWidth: 0,
        }}
      >
        <span
          style={{
            ...mono,
            fontSize,
            fontWeight: 800,
            color: skuColor,
            lineHeight: 1.1,
            letterSpacing: "0.02em",
            ...noOverflowText,
          }}
        >
          {sku}
        </span>
        {showIcon && (
          <span style={{ display: "inline-flex", alignItems: "center", color: stripColor, flexShrink: 0 }}>
            {getTypeIcon(type, stripColor, iconSize, 2)}
          </span>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------
  // TEMPLATE 1 & 1L (Micro 32x10mm & Mini 45x15mm)
  // -------------------------------------------------------------
  if (resolvedId === "t1" || resolvedId === "t1l") {
    const isT1 = resolvedId === "t1";
    const padX = isT1 ? 4 : 6;
    const topPad = stripH + (isT1 ? 1.5 : 2.5);
    const bottomPad = isT1 ? 1.5 : 2.5;
    const gap = isT1 ? 3 : 5;
    const contentH = Math.max(H - topPad - bottomPad, 1);

    const showCode = codeType !== "none" && !isT1;
    const codeSize = showCode ? Math.min(contentH, 44) : 0;

    const hasLogo = resolvedLogoPlacement !== "hidden";
    const logoMaxW = isT1 ? Math.min(22, W * 0.22) : Math.min(28, W * 0.24);
    const logoMaxH = Math.min(contentH * 0.88, isT1 ? 16 : 24);
    const logoSlotW = hasLogo ? logoMaxW : 0;

    const textW = Math.max(
      W - padX * 2 - (hasLogo ? logoSlotW + gap : 0) - (showCode ? codeSize + gap : 0),
      1
    );

    const mult = resolvedFontScale === "large" ? 1.15 : resolvedFontScale === "compact" ? 0.88 : 1.0;
    const nameFs = Math.max(isT1 ? 4.5 : 6, Math.min(isT1 ? 6.5 : 8.5, Math.round(contentH * 0.3 * mult)));
    const skuFs = Math.max(isT1 ? 6.5 : 8, Math.min(isT1 ? 9.5 : 11, Math.round(contentH * 0.42 * mult)));
    const propFs = Math.max(isT1 ? 3.5 : 4.5, Math.min(isT1 ? 5 : 6.5, Math.round(contentH * 0.22 * mult)));

    return (
      <div style={baseStyle}>
        {cutMarks}
        {dielines}
        {/* Accent Strip */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: stripH, background: stripColor }} />

        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap,
            padding: `${topPad}px ${padX}px ${bottomPad}px`,
            minWidth: 0,
          }}
        >
          {hasLogo && (
            <div
              style={{
                width: logoSlotW,
                flex: `0 0 ${logoSlotW}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {renderLogoImg(logoMaxH, logoMaxW)}
            </div>
          )}

          <div
            style={{
              minWidth: 0,
              width: textW,
              flex: `1 1 ${textW}px`,
              height: contentH,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <div style={{ ...noOverflowText, fontSize: nameFs, fontWeight: 700, color: textColor, lineHeight: 1 }}>
              {name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {renderSkuPill(skuFs, false)}
              {isT1 && (
                <span style={{ color: stripColor, display: "inline-flex", alignItems: "center" }}>
                  {getTypeIcon(type, stripColor, Math.max(7, Math.round(skuFs * 0.9)), 2)}
                </span>
              )}
            </div>
            <div style={{ ...mono, ...noOverflowText, fontSize: propFs, fontWeight: 600, color: propColor, lineHeight: 1 }}>
              {propertyText}
            </div>
          </div>

          {showCode && renderCode(codeSize, true)}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATE TC (Cable Wrap Flag: 98x15mm)
  // -------------------------------------------------------------
  if (resolvedId === "tc") {
    const wrapGapW = 14 * scale;
    const panelW = Math.max((W - wrapGapW) / 2, 1);
    const gapLeft = panelW;
    const panelPadX = 5;
    const gap = 5;
    const topPad = stripH + 2;
    const bottomPad = 2;
    const contentH = Math.max(H - topPad - bottomPad, 1);

    const hasLogo = resolvedLogoPlacement !== "hidden";
    const logoW = hasLogo ? Math.min(22, panelW * 0.2) : 0;
    const logoH = Math.min(contentH * 0.85, 22);

    const mult = resolvedFontScale === "large" ? 1.15 : resolvedFontScale === "compact" ? 0.88 : 1.0;
    const nameFs = Math.max(6, Math.min(9, Math.round(contentH * 0.35 * mult)));
    const skuFs = Math.max(7.5, Math.min(10.5, Math.round(contentH * 0.38 * mult)));
    const propFs = Math.max(4.5, Math.min(6.5, Math.round(contentH * 0.22 * mult)));

    const renderPanelContent = (isPanelB = false) => {
      const showCodeOnB = isPanelB && codeType !== "none";
      const codeSize = Math.min(contentH, 42);
      const textW = Math.max(
        panelW - panelPadX * 2 - (showCodeOnB ? codeSize + gap : hasLogo ? logoW + gap : 0),
        1
      );

      return (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap,
            padding: `${topPad}px ${panelPadX}px ${bottomPad}px`,
            minWidth: 0,
          }}
        >
          {showCodeOnB ? (
            renderCode(codeSize, true)
          ) : hasLogo ? (
            <div
              style={{
                width: logoW,
                flex: `0 0 ${logoW}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {renderLogoImg(logoH, logoW)}
            </div>
          ) : null}

          <div
            style={{
              minWidth: 0,
              width: textW,
              flex: `1 1 ${textW}px`,
              height: contentH,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <div
              style={{
                fontSize: nameFs,
                fontWeight: 700,
                color: textColor,
                lineHeight: 1.1,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {name}
            </div>
            <div>{renderSkuPill(skuFs, true)}</div>
            <div style={{ ...mono, ...noOverflowText, fontSize: propFs, fontWeight: 600, color: propColor, lineHeight: 1 }}>
              {propertyText}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={baseStyle}>
        {cutMarks}
        {dielines}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: stripH, background: stripColor }} />

        {/* Panel A */}
        <div style={{ position: "absolute", left: 0, top: 0, width: panelW, height: H, overflow: "hidden" }}>
          {renderPanelContent(false)}
        </div>

        {/* Center Wrap Section */}
        <div
          style={{
            position: "absolute",
            left: gapLeft,
            top: 0,
            width: wrapGapW,
            height: H,
            background: isLight ? "#F2F2F2" : "#080808",
            borderLeft: `1px dashed ${borderColor}`,
            borderRight: `1px dashed ${borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 7, color: C.muted, transform: "rotate(-90deg)", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
            WRAP
          </span>
        </div>

        {/* Panel B */}
        <div style={{ position: "absolute", left: gapLeft + wrapGapW, top: 0, width: panelW, height: H, overflow: "hidden" }}>
          {renderPanelContent(true)}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TEMPLATES T2, T2L, T2M, T3, T4 (Small, Medium, Roll, Studio, Large)
  // -------------------------------------------------------------
  const padX = isLarge ? 14 : resolvedId === "t3" ? 11 : isSmall ? 7 : 9;
  const padB = isLarge ? 10 : resolvedId === "t3" ? 8 : isSmall ? 5 : 6;
  const gap = isLarge ? 12 : resolvedId === "t3" ? 10 : isSmall ? 6 : 8;
  const topPad = stripH + (isLarge ? 6 : resolvedId === "t3" ? 4.5 : isSmall ? 3 : 4);

  const hasCode = codeType !== "none";
  const hasLogo = resolvedLogoPlacement !== "hidden";
  const isHeaderLayout = resolvedLogoPlacement === "header" && (resolvedId === "t3" || resolvedId === "t4" || resolvedId === "t2m" || resolvedId === "t2l");

  const totalContentH = Math.max(H - topPad - padB, 1);

  // -------------------------------------------------------------
  // VARIANT A: HEADER LOGO PLACEMENT
  // (Logo & Brand Name in a sleek top row, Equipment details in wide body)
  // -------------------------------------------------------------
  if (isHeaderLayout) {
    const headerH = Math.max(16, Math.min(26, totalContentH * 0.28));
    const bodyH = Math.max(totalContentH - headerH - 5, 1);
    const codeBoxSize = hasCode ? Math.min(bodyH * 0.98, isLarge ? 88 : resolvedId === "t3" ? 64 : 52) : 0;
    const bodyTextW = Math.max(W - padX * 2 - (hasCode ? codeBoxSize + gap : 0), 1);

    const typography = calculateSmartFontSizes({
      name,
      sku,
      propertyText,
      availableWidth: bodyTextW,
      availableHeight: bodyH,
      fontScale: resolvedFontScale,
      maxNameLines: isLarge ? 3 : 2,
    });

    return (
      <div style={baseStyle}>
        {cutMarks}
        {dielines}
        {/* Top Category Accent Stripe */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: stripH, background: stripColor }} />

        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: `${topPad}px ${padX}px ${padB}px`,
          }}
        >
          {/* Header Row: Logo + Brand + Category Pill */}
          <div
            style={{
              height: headerH,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${borderColor}`,
              paddingBottom: 4,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {renderLogoImg(headerH * 0.9, 70)}
              <span
                style={{
                  fontSize: Math.max(8.5, Math.min(12, headerH * 0.55)),
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  color: textColor,
                  textTransform: "uppercase",
                  ...noOverflowText,
                }}
              >
                {brandName}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {renderCategoryBadge(true)}
              {resolvedShowPhone && isLarge && (
                <span style={{ fontSize: 9, color: C.muted, ...mono }}>
                  {phoneText}
                </span>
              )}
            </div>
          </div>

          {/* Main Body: Name + SKU Pill + Ownership + QR Code */}
          <div style={{ height: bodyH, display: "flex", alignItems: "center", gap, marginTop: 4 }}>
            <div
              style={{
                width: bodyTextW,
                flex: `1 1 ${bodyTextW}px`,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minWidth: 0,
              }}
            >
              {/* Equipment Title */}
              <div
                style={{
                  fontSize: typography.nameFs,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: textColor,
                  textTransform: "uppercase",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: typography.lineClamp,
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
                {name}
              </div>

              {/* Hero SKU Pill */}
              <div>{renderSkuPill(typography.skuFs, !resolvedShowCategory)}</div>

              {/* Bottom Ownership / Phone Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 4,
                  minWidth: 0,
                }}
              >
                <div style={{ ...mono, ...noOverflowText, fontSize: typography.propFs, fontWeight: 600, color: propColor, lineHeight: 1 }}>
                  {propertyText}
                </div>
                {resolvedShowPhone && !isLarge && (
                  <span style={{ fontSize: typography.propFs * 0.95, color: C.muted, ...mono, flexShrink: 0 }}>
                    {phoneText}
                  </span>
                )}
              </div>
            </div>

            {/* QR / Barcode */}
            {hasCode && renderCode(codeBoxSize, false)}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VARIANT B: CLASSIC LEFT COLUMN LOGO PLACEMENT (OR HIDDEN LOGO)
  // (Left: Logo, Center: Equipment Info, Right: Code)
  // -------------------------------------------------------------
  const codeBoxSize = hasCode
    ? Math.min(totalContentH * 0.98, isLarge ? 90 : resolvedId === "t3" ? 68 : isSmall ? 44 : 54)
    : 0;

  const logoColW = hasLogo
    ? isLarge
      ? Math.min(76, W * 0.22)
      : resolvedId === "t3"
        ? Math.min(54, W * 0.22)
        : isSmall
          ? Math.min(26, W * 0.2)
          : Math.min(46, W * 0.22)
    : 0;

  const logoMaxH = Math.min(totalContentH * 0.85, isLarge ? 50 : resolvedId === "t3" ? 38 : isSmall ? 22 : 32);

  const textW = Math.max(
    W - padX * 2 - (hasLogo ? logoColW + gap : 0) - (hasCode ? codeBoxSize + gap : 0),
    1
  );

  const typography = calculateSmartFontSizes({
    name,
    sku,
    propertyText,
    availableWidth: textW,
    availableHeight: totalContentH,
    fontScale: resolvedFontScale,
    maxNameLines: isLarge ? 3 : resolvedId === "t3" ? 3 : 2,
  });

  return (
    <div style={baseStyle}>
      {cutMarks}
      {dielines}
      {/* Top Category Accent Stripe */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: stripH, background: stripColor }} />

      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap,
          padding: `${topPad}px ${padX}px ${padB}px`,
          minWidth: 0,
        }}
      >
        {/* Left: Brand Logo Column */}
        {hasLogo && (
          <div
            style={{
              width: logoColW,
              flex: `0 0 ${logoColW}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: totalContentH,
              overflow: "hidden",
            }}
          >
            {renderLogoImg(logoMaxH, logoColW)}
          </div>
        )}

        {/* Center: Equipment Details */}
        <div
          style={{
            minWidth: 0,
            width: textW,
            flex: `1 1 ${textW}px`,
            height: totalContentH,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          {/* Top Line: Category Pill or Category Name */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
            {renderCategoryBadge(isSmall)}
            {resolvedShowPhone && isLarge && (
              <span style={{ fontSize: 9.5, color: C.muted, ...mono }}>
                {phoneText}
              </span>
            )}
          </div>

          {/* Equipment Name */}
          <div
            style={{
              fontSize: typography.nameFs,
              fontWeight: 800,
              lineHeight: 1.1,
              color: textColor,
              textTransform: "uppercase",
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: typography.lineClamp,
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {name}
          </div>

          {/* Hero SKU Pill */}
          <div>{renderSkuPill(typography.skuFs, !resolvedShowCategory)}</div>

          {/* Bottom Row: Property Text + Phone */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
              minWidth: 0,
            }}
          >
            <div style={{ ...mono, ...noOverflowText, fontSize: typography.propFs, fontWeight: 600, color: propColor, lineHeight: 1 }}>
              {propertyText}
            </div>
            {resolvedShowPhone && !isLarge && (
              <span style={{ fontSize: typography.propFs * 0.95, color: C.muted, ...mono, flexShrink: 0 }}>
                {phoneText}
              </span>
            )}
          </div>
        </div>

        {/* Right: QR Code / Barcode */}
        {hasCode && renderCode(codeBoxSize, isSmall)}
      </div>
    </div>
  );
}

export default StickerRender;
