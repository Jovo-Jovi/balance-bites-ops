import catalog from "./icon-catalog.json";

export type IconDef = {
  id: string;
  label: string;
  cat: string;
  paths: string;
  fill: boolean;
  outline: boolean;
  letter: string;
  viewBox: string;
  thickCurve: boolean;
};

export const ICON_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "nature", label: "Nature" },
  { id: "food", label: "Food" },
  { id: "kids", label: "Kids" },
  { id: "curves", label: "Curves" },
  { id: "badge", label: "Badges" },
  { id: "weather", label: "Weather" },
  { id: "symbol", label: "Symbols" },
  { id: "alpha", label: "A–Z" },
] as const;

export const ICONS = catalog as IconDef[];

const BY_ID = new Map(ICONS.map((ic) => [ic.id, ic]));

export function getIcon(id: string | null | undefined) {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function categoryCount(cat: string) {
  if (cat === "all") return ICONS.length;
  return ICONS.filter((ic) => ic.cat === cat).length;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function letterBody(ic: IconDef, color: string, strokeWidth: number) {
  const ch = esc(String(ic.letter || ic.label || "?").charAt(0).toUpperCase());
  const sw = strokeWidth > 0 ? strokeWidth * 1.15 : 0;
  const stroke =
    sw > 0
      ? ` stroke="#1a1a1a" stroke-width="${sw}" paint-order="stroke fill" stroke-linejoin="round" stroke-linecap="round"`
      : ` stroke="none"`;
  return `<text x="12" y="17.2" text-anchor="middle" font-family="Tajawal, sans-serif" font-size="16.5" font-weight="800" fill="${esc(color)}"${stroke}>${ch}</text>`;
}

export function iconInner(iconOrId: string | IconDef, color = "#ffffff", strokeWidth = 2) {
  const ic = typeof iconOrId === "string" ? getIcon(iconOrId) : iconOrId;
  if (!ic) return "";
  const col = color || "#ffffff";
  const sw = ic.thickCurve ? strokeWidth * 1.45 : strokeWidth;
  if (ic.letter) return letterBody(ic, col, sw);
  if (ic.fill) {
    const outlineOn = ic.outline && sw > 0;
    const strokeAttrs = outlineOn
      ? ` stroke="#1a1a1a" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`
      : ` stroke="none"`;
    return `<g fill="${esc(col)}"${strokeAttrs}>${ic.paths}</g>`;
  }
  return `<g fill="none" stroke="${esc(col)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ic.paths}</g>`;
}

export function iconSvg(iconOrId: string | IconDef, color = "#ffffff", strokeWidth = 2) {
  const ic = typeof iconOrId === "string" ? getIcon(iconOrId) : iconOrId;
  if (!ic) return "";
  const vb = ic.viewBox || "0 0 24 24";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${esc(vb)}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true">${iconInner(ic, color, strokeWidth)}</svg>`;
}

export function filterIcons(cat: string, query: string) {
  const needle = query.trim().toLowerCase();
  return ICONS.filter((ic) => {
    if (cat !== "all" && ic.cat !== cat) return false;
    if (!needle) return true;
    return `${ic.id} ${ic.label} ${ic.cat}`.toLowerCase().includes(needle);
  });
}
