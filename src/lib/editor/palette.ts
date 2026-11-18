export interface Swatch { name: string; value: string }

/** Mid-tone colours that stay readable on both the light and dark paper. */
export const TEXT_COLORS: Swatch[] = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#d97706" },
  { name: "Green", value: "#22a559" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
];

/** Soft backgrounds. Text on a highlight is always drawn dark so it stays readable. */
export const HIGHLIGHT_COLORS: Swatch[] = [
  { name: "Yellow", value: "#fde68a" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Purple", value: "#ddd6fe" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Cyan", value: "#a5f3fc" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Gray", value: "#e5e7eb" },
];

/** Turns "rgb(239, 68, 68)" into "#ef4444" so a saved colour can be matched with the swatches. Other values pass through in lower case. */
export function toHex(color: string | null | undefined): string | null {
  if (!color) return null;
  const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(color.trim());
  if (!m) return color.trim().toLowerCase();
  return "#" + [m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("");
}
