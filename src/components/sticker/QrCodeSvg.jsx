import React, { useMemo } from "react";
import QRCode from "qrcode";

export function QrCodeSvg({
  value,
  size = 40,
  fgColor = "#000000",
  bgColor = "transparent",
  margin = 0,
  boxBg = null,
  boxPadding = 2,
  borderRadius = 3,
  title = "Scan QR",
}) {
  const qrData = useMemo(() => {
    if (!value) return null;
    try {
      const qr = QRCode.create(String(value), { errorCorrectionLevel: "M" });
      const modCount = qr.modules.size;
      const total = modCount + margin * 2;
      const paths = [];
      for (let r = 0; r < modCount; r++) {
        for (let c = 0; c < modCount; c++) {
          if (qr.modules.get(r, c)) {
            paths.push(`M${c + margin},${r + margin}h1v1h-1z`);
          }
        }
      }
      return { total, pathString: paths.join(" ") };
    } catch (err) {
      console.warn("QR code generation error:", err);
      return null;
    }
  }, [value, margin]);

  if (!qrData) return null;

  const svgContent = (
    <svg
      viewBox={`0 0 ${qrData.total} ${qrData.total}`}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        shapeRendering: "crispEdges",
      }}
      aria-label={title}
    >
      {bgColor !== "transparent" && (
        <rect width={qrData.total} height={qrData.total} fill={bgColor} />
      )}
      <path d={qrData.pathString} fill={fgColor} />
    </svg>
  );

  if (boxBg) {
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: boxBg,
          padding: boxPadding,
          borderRadius,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {svgContent}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {svgContent}
    </div>
  );
}

export default QrCodeSvg;
