import React from "react";
import {
  Camera,
  Aperture,
  Lightbulb,
  Wrench,
  Mic,
  Radio,
  BatteryCharging,
  Monitor,
  Package,
} from "lucide-react";
import { C, TYPE_COLORS, getEquipmentType } from "../../config/tokens.js";

export function getTypeIcon(type, color = C.white, size = 12, stroke = 1.8) {
  const props = { size, color, strokeWidth: stroke };
  switch (type) {
    case "Camera":
      return <Camera {...props} />;
    case "Lens":
      return <Aperture {...props} />;
    case "Lighting":
      return <Lightbulb {...props} />;
    case "Grip":
      return <Wrench {...props} />;
    case "Audio":
      return <Mic {...props} />;
    case "Wireless":
      return <Radio {...props} />;
    case "Battery / Power":
      return <BatteryCharging {...props} />;
    case "Monitor":
      return <Monitor {...props} />;
    default:
      return <Package {...props} />;
  }
}

export function CategoryTypeBadge({ category = "", name = "", compact = false, forceLabel = "" }) {
  const type = getEquipmentType(category, name);
  const color = TYPE_COLORS[type] || TYPE_COLORS.Other || C.white;
  const label = forceLabel || category || type || "Other";
  const iconSize = compact ? 11 : 12;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,.06)",
        border: `1px solid ${color}66`,
        borderRadius: 6,
        padding: compact ? "2px 7px" : "3px 8px",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {getTypeIcon(type, color, iconSize)}
      </span>
      <span
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 600,
          color: C.white,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {label}
      </span>
    </span>
  );
}
