// Pure JavaScript tokens, constants, and geometry helpers

export const C = {
  bg: "#0F0F0F",
  bgSubtle: "#141414",
  card: "#111111",
  border: "#262626",
  borderHover: "#383838",
  white: "#F4F4F2",
  muted: "#808086",
  red: "#D71920",
  redDim: "#8B0F13",
  accent: "#E23142",
  orange: "#F28C28",
  yellow: "#F5C542",
  gray: "#8A8F98",
  green: "#32D074",
  cyan: "#24C7DB",
  blue: "#2F80ED",
  purple: "#8B5CF6",
};

export const CAT_TEMPLATE = {
  Camera: "t3",
  Lens: "t2",
  Lighting: "t3",
  Light: "t3",
  Grip: "t4",
  Tripod: "t4",
  Audio: "t2",
  Wireless: "t3",
  "Wireless Video": "t3",
  "Battery / Power": "t2",
  Battery: "t2",
  "V-Mount Battery": "t2",
  Monitor: "t3",
  Accessories: "t1",
  Cable: "tc",
  "Cables & Connectivity": "tc",
  Cables: "tc",
  Adapter: "t1",
  Case: "t4",
  Gimbal: "t3",
};

export const CATEGORIES = [
  "All",
  "Camera",
  "Lens",
  "Lighting",
  "Grip",
  "Audio",
  "Wireless",
  "Battery / Power",
  "Monitor",
  "Accessories",
  "Other",
];

export const TYPE_COLORS = {
  Camera: C.red,
  Lens: C.orange,
  Lighting: C.yellow,
  Grip: C.gray,
  Audio: C.green,
  Wireless: C.cyan,
  "Battery / Power": C.blue,
  Monitor: C.purple,
  Accessories: C.white,
  Other: C.white,
};

export const TEMPLATES = {
  t1: { id: "t1", name: "Micro Tag", size: "32 x 10 mm", w: 32, h: 10, bleed: 1, safe: 1, desc: "Lens caps, hotshoes, small mounts" },
  t1l: { id: "t1l", name: "Mini Equipment", size: "45 x 15 mm", w: 45, h: 15, bleed: 1.2, safe: 1.4, desc: "Lav mics, wireless TX/RX, batteries" },
  t2: { id: "t2", name: "Compact Tag", size: "38 x 19 mm", w: 38, h: 19, bleed: 1.2, safe: 1.5, desc: "Lenses, monitors, compact LED lights" },
  t2l: { id: "t2l", name: "Medium Square", size: "45 x 25 mm", w: 45, h: 25, bleed: 1.4, safe: 1.8, desc: "Standard 45x25 roll & sheet label" },
  t2m: { id: "t2m", name: "Standard Roll", size: "62 x 29 mm", w: 62, h: 29, bleed: 1.5, safe: 2, desc: "Brother DK-11209 & Dymo standard roll" },
  t3: { id: "t3", name: "Studio Flagship", size: "70 x 30 mm", w: 70, h: 30, bleed: 2, safe: 2.5, desc: "Cinema cameras, heavy gimbals, pro heads" },
  t4: { id: "t4", name: "Flight Case / Gear", size: "100 x 45 mm", w: 100, h: 45, bleed: 3, safe: 4, desc: "Pelican cases, road trunks, big light kits" },
  tc: { id: "tc", name: "Cable Wrap Flag", size: "98 x 15 mm", w: 98, h: 15, bleed: 1.2, safe: 1.6, desc: "Dual-sided flag for HDMI, SDI, XLR, Power" },
};

export const TEMPLATE_IDS = ["t1", "t1l", "t2", "t2l", "tc", "t2m", "t3", "t4"];
export const PAGES = ["import", "library", "designer", "print"];

export const STORE_KEYS = {
  items: "babin_sticker_items",
  queue: "babin_sticker_queue",
  page: "babin_sticker_page",
  settings: "babin_sticker_settings",
  designerTemplate: "babin_sticker_designer_template",
  designerItemRef: "babin_sticker_designer_item_ref",
  libraryBulkTemplates: "babin_sticker_library_bulk_templates",
  libraryRowTemplateChoice: "babin_sticker_library_row_choice",
  theme: "babin_sticker_theme",
};

export const DEFAULT_SETTINGS = {
  brand: "Babin Rentals",
  phone: "9860476255",
  website: "babinrentals.com",
  propertyText: "PROPERTY OF BABIN RENTALS",
  customLogo: null,
  defaultTheme: "dark", // "dark" | "light" | "warning"
  defaultCodeType: "qr", // "qr" | "barcode" | "none"
  logoPlacement: "left", // "left" | "header" | "hidden"
  fontScale: "standard", // "compact" | "standard" | "large"
  showPhone: true,
  showCategoryBadge: true,
  qrUrlPattern: "https://babinrentals.com/items/{sku}",
  showCutMarks: false,
  paperSize: "A4",
};

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function resolveTemplateId(templateId) {
  const legacy = { t5: "t2", t6: "t1", t7: "t4", t8: "t4", t9: "t4" };
  return TEMPLATES[templateId] ? templateId : legacy[templateId] || "t3";
}

export function normalizeTemplateIds(ids) {
  if (!Array.isArray(ids)) return TEMPLATE_IDS;
  return ids.map(resolveTemplateId).filter((id) => TEMPLATES[id]);
}

export function getEquipmentType(category = "", name = "") {
  const raw = `${category} ${name}`.toLowerCase();
  if (/^camera$/.test(raw.trim())) return "Camera";
  if (/^lens$/.test(raw.trim())) return "Lens";
  if (/lighting/.test(raw)) return "Lighting";
  if (/grip|support|stabilization/.test(raw)) return "Grip";
  if (/audio|communication/.test(raw)) return "Audio";
  if (/monitor|wireless video/.test(raw)) return "Wireless";
  if (/power|batter/.test(raw)) return "Battery / Power";
  if (/media|storage|accessories|cables|connectivity|crew|services|production/.test(raw)) return "Accessories";
  if (/camera|komodo|fx3|a7|ronin 4d|insta360/.test(raw)) return "Camera";
  if (/lens|prime|zoom|anamorphic|macro|mount|filter|nd|polarizer/.test(raw)) return "Lens";
  if (/light|aputure|amaran|tube|rgb|spotlight|flash|lantern|softbox/.test(raw)) return "Lighting";
  if (/grip|stand|tripod|rig|dolly|jib|skimmer|frame|cart|clamp|arm|boom/.test(raw)) return "Grip";
  if (/audio|mic|microphone|rode|intercom|comset|headset/.test(raw)) return "Audio";
  if (/wireless|transmitter|receiver|tx|rx|cineview|cosmo|accsoon|hollyland/.test(raw)) return "Wireless";
  if (/battery|power|v-mount|vmount|charger|plate|np-f|npfz|d-tap|dtap|generator/.test(raw)) return "Battery / Power";
  if (/monitor|ninja|desview|portkeys|feelworld|viltrox/.test(raw)) return "Monitor";
  if (TYPE_COLORS[category]) return category;
  return "Accessories";
}

export function suggestTemplate(category, name = "") {
  const raw = `${category || ""} ${name || ""}`.toLowerCase();
  if (/cable|cables|cord|wire|lead|extension|patch|d-?tap|usb-?c|hdmi|xlr|bnc|sdi|power cable|powercon/.test(raw)) return "tc";
  const type = getEquipmentType(category, name);
  return CAT_TEMPLATE[type] || CAT_TEMPLATE[category] || "t3";
}

export function fitTextPx(text, maxWidth, minSize, maxSize, avgCharWidth = 0.62) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return minSize;
  const widthFit = Math.floor(maxWidth / Math.max(cleaned.length * avgCharWidth, 1));
  return Math.max(minSize, Math.min(maxSize, widthFit));
}

export function fitWrappedTextPx(text, maxWidth, maxLines, minSize, maxSize, avgCharWidth = 0.58) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return minSize;
  const lineFit = Math.floor((maxWidth * maxLines) / Math.max(cleaned.length * avgCharWidth, 1));
  return Math.max(minSize, Math.min(maxSize, lineFit));
}

export function calculateFitSkuFontSize({
  sku = "",
  availableWidth = 100,
  maxFs = 11,
  minFs = 6.5,
  showIcon = false,
  compact = false,
}) {
  const raw = String(sku || "").trim();
  if (!raw) return minFs;
  // Account for pill padding (compact: 2x3=6, standard: 2x5=10), border (2px), and icon (14px)
  const pillOverhead = (compact ? 8 : 12) + (showIcon ? 14 : 0);
  const availableTextW = Math.max(availableWidth - pillOverhead, 10);
  // Monospace tabular glyphs are approx 0.60 * fontSize wide
  const fitFs = Math.floor(availableTextW / Math.max(raw.length * 0.60, 1));
  return Math.max(minFs, Math.min(maxFs, fitFs));
}

export function calculateSmartFontSizes({
  name = "",
  sku = "",
  propertyText = "",
  availableWidth = 100,
  availableHeight = 50,
  fontScale = "standard", // "compact" | "standard" | "large"
  maxNameLines = 2,
  showCategory = true,
  compactPill = false,
}) {
  const mult = fontScale === "large" ? 1.18 : fontScale === "compact" ? 0.88 : 1.0;

  // SKU font size: the primary operational identifier, bold & readable
  // Account for pill padding and category icon overhead
  const pillPadding = compactPill ? 8 : 12;
  const iconExtra = !showCategory ? 14 : 0;
  const skuNetWidth = Math.max(availableWidth - pillPadding - iconExtra, 16);

  const skuClean = String(sku || "").trim();
  const skuFitW = Math.floor(skuNetWidth / Math.max(skuClean.length * 0.60, 1));
  const skuMax = Math.round(availableHeight * 0.32 * mult);
  const skuFs = Math.max(6.5, Math.min(skuMax, Math.round(skuFitW * 0.96 * mult)));

  // Property / Brand caption font size
  const propClean = String(propertyText || "").trim();
  const propMax = Math.round(availableHeight * 0.16 * mult);
  const propFitW = Math.floor(availableWidth / Math.max(propClean.length * 0.58, 1));
  const propFs = Math.max(4.5, Math.min(propMax, Math.round(propFitW * mult)));

  // Equipment Name font size: auto-wrapping
  const nameClean = String(name || "").trim();
  const remainingH = Math.max(availableHeight - skuFs - propFs - 4, 10);
  const nameLineH = remainingH / maxNameLines;
  const nameFitW = Math.floor((availableWidth * maxNameLines) / Math.max(nameClean.length * 0.54, 1));
  const nameMax = Math.round(nameLineH * 0.92 * mult);
  const nameFs = Math.max(6.5, Math.min(nameMax, Math.round(nameFitW * mult)));

  return {
    skuFs,
    nameFs,
    propFs,
    lineClamp: maxNameLines,
  };
}

export function clampPositiveInt(value, fallback = 1) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseSkuSeed(sku) {
  const raw = String(sku || "").trim();
  const match = raw.match(/^(.*?)(\d+)$/);
  if (!match) return null;
  return {
    prefix: match[1],
    start: clampPositiveInt(match[2], 1),
    pad: Math.max(1, String(match[2]).length),
  };
}

export function makeSequencedSku(baseSku, sequenceConfig, offset = 0) {
  const raw = String(baseSku || "").trim();
  if (!sequenceConfig?.enabled) return raw;
  const parsed = parseSkuSeed(raw);
  const prefix = sequenceConfig.prefix ?? parsed?.prefix ?? (raw ? `${raw}-` : "SKU-");
  const pad = Math.max(1, clampPositiveInt(sequenceConfig.pad ?? parsed?.pad ?? 2, 2));
  const defaultStart = parsed?.start ?? 1;
  const start = clampPositiveInt(sequenceConfig.start ?? defaultStart, defaultStart);
  const nextNumber = start + offset;
  return `${prefix}${String(nextNumber).padStart(pad, "0")}`;
}
