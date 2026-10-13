// Fixed lists the product setup picks from. Keep them in sync with the client:
// client/src/config/area-icons.js and client/src/config/option-colors.js.

/** Icons a problem area can use (lucide icon names). */
export const AREA_ICONS = [
  "monitor",
  "receipt",
  "package",
  "truck",
  "calendar-clock",
  "calculator",
  "book-user",
  "building-2",
  "key-round",
  "life-buoy",
  "phone",
  "headset",
  "shopping-cart",
  "credit-card",
  "wallet",
  "users",
  "file-text",
  "clipboard-list",
  "settings",
  "wrench",
  "bug",
  "globe",
  "wifi",
  "database",
  "server",
  "smartphone",
  "printer",
  "scan-barcode",
  "pill",
  "stethoscope",
  "heart-pulse",
  "graduation-cap",
  "store",
  "chart-column",
  "bell",
  "mail",
  "message-circle",
  "lock",
  "shield-check",
  "zap",
  "cloud",
  "layers",
];

/** Colours a status or priority badge can use. */
export const OPTION_COLORS = ["slate", "emerald", "teal", "sky", "indigo", "violet", "rose", "amber", "orange", "lime"];

/** The app's accent colours (client/src/config/theme.js). */
export const ACCENT_COLORS = ["emerald", "teal", "indigo", "sky", "rose", "purple", "amber"];

export const CUSTOM_FIELD_TYPES = ["text", "number", "select", "date"];

/** The issue an agent picks when none of the listed ones fit. Always allowed. */
export const OTHER_ISSUE = "Something else";
