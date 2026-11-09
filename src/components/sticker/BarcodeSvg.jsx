import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function BarcodeSvg({
  value,
  width = 1.2,
  height = 24,
  lineColor = "#000000",
  background = "transparent",
  boxBg = null,
  boxPadding = 3,
  borderRadius = 3,
  displayValue = false,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      // Clean string for CODE128
      const cleaned = String(value).trim().replace(/[^\x20-\x7E]/g, "");
      JsBarcode(svgRef.current, cleaned, {
        format: "CODE128",
        width,
        height,
        displayValue,
        margin: 0,
        background: "transparent",
        lineColor,
      });
    } catch (err) {
      console.warn("Barcode rendering error:", err);
    }
  }, [value, width, height, lineColor, displayValue]);

  const barcodeElement = (
    <svg
      ref={svgRef}
      style={{
        display: "block",
        maxWidth: "100%",
        height: "auto",
        shapeRendering: "crispEdges",
      }}
    />
  );

  if (boxBg) {
    return (
      <div
        style={{
          backgroundColor: boxBg,
          padding: boxPadding,
          borderRadius,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {barcodeElement}
      </div>
    );
  }

  return barcodeElement;
}

export default BarcodeSvg;
