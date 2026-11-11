import React from "react";

export function BabinLogo({
  height = 24,
  width = "auto",
  theme = "dark",
  style = {},
}) {
  const isLight = theme === "light";
  const isWarning = theme === "warning";
  const textColor = isLight ? "#111111" : isWarning ? "#F5C542" : "#FFFFFF";
  const accentColor = isWarning ? "#F5C542" : "#D71920";

  return (
    <svg
      viewBox="0 0 160 52"
      height={height}
      width={width}
      style={{
        display: "block",
        flexShrink: 0,
        ...style,
      }}
      aria-label="Babin Rentals"
    >
      <rect x="2" y="2" width="48" height="48" rx="10" fill={accentColor} />
      {/* Camera Lens / Aperture Reticle */}
      <circle cx="26" cy="26" r="14" stroke="#FFFFFF" strokeWidth="3" fill="none" />
      <circle cx="26" cy="26" r="6" fill="#FFFFFF" />
      <path d="M26 12v4M26 36v4M12 26h4M36 26h4" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />

      {/* Brand Typography */}
      <text
        x="58"
        y="27"
        fill={textColor}
        fontFamily="'JetBrains Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="19"
        letterSpacing="1"
      >
        BABIN
      </text>
      <text
        x="58.5"
        y="44"
        fill={accentColor}
        fontFamily="'JetBrains Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="11"
        letterSpacing="3.5"
      >
        RENTALS
      </text>
    </svg>
  );
}

export default BabinLogo;
