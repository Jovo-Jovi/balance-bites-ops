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

export type LetterStyle = {
  id: string;
  label: string;
  family: string;
  weight: string;
  size: number;
  y: number;
  strokeMul: number;
  soft: boolean;
};

/** Live `BBIconLibrary.LETTER_STYLES` — A–Z letters use these families. */
export const LETTER_STYLES: LetterStyle[] = [
  {
    id: "fatty",
    label: "Fatty",
    family: "Fredoka, 'Arial Rounded MT Bold', 'Arial Black', sans-serif",
    weight: "700",
    size: 17.5,
    y: 17.1,
    strokeMul: 1.35,
    soft: true,
  },
  {
    id: "bubble",
    label: "Bubble",
    family: "'Baloo 2', Fredoka, 'Arial Rounded MT Bold', sans-serif",
    weight: "800",
    size: 18.2,
    y: 17.4,
    strokeMul: 1.5,
    soft: true,
  },
  {
    id: "jelly",
    label: "Jelly",
    family: "Nunito, Fredoka, 'Arial Rounded MT Bold', sans-serif",
    weight: "900",
    size: 17.8,
    y: 17.2,
    strokeMul: 1.25,
    soft: true,
  },
  {
    id: "candy",
    label: "Candy",
    family: "'Bubblegum Sans', Fredoka, cursive",
    weight: "400",
    size: 18.5,
    y: 17.5,
    strokeMul: 1.4,
    soft: true,
  },
  {
    id: "sniglet",
    label: "Curvy",
    family: "Sniglet, Fredoka, 'Arial Rounded MT Bold', sans-serif",
    weight: "800",
    size: 17.2,
    y: 17.0,
    strokeMul: 1.3,
    soft: true,
  },
  {
    id: "block",
    label: "Block",
    family: "'Arial Black', 'Arial Rounded MT Bold', Arial, sans-serif",
    weight: "900",
    size: 18,
    y: 17.2,
    strokeMul: 1,
    soft: false,
  },
];

const LETTER_STYLE_MAP = new Map(LETTER_STYLES.map((s) => [s.id, s]));

export function getLetterStyle(id?: string | null) {
  return LETTER_STYLE_MAP.get(id || "") || LETTER_STYLE_MAP.get("fatty") || LETTER_STYLES[0];
}

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

function letterBody(ic: IconDef, color: string, strokeWidth: number, letterStyle?: string) {
  const ch = esc(String(ic.letter || ic.label || "?").charAt(0).toUpperCase());
  const st = getLetterStyle(letterStyle);
  let letterSw = strokeWidth > 0 ? strokeWidth : 0;
  if (letterSw > 0 && st.strokeMul) letterSw = letterSw * st.strokeMul;
  const stroke =
    letterSw > 0
      ? ` stroke="#1a1a1a" stroke-width="${letterSw}" paint-order="stroke fill" stroke-linejoin="round" stroke-linecap="round"`
      : ` stroke="none"`;
  const halo =
    st.soft && letterSw > 0
      ? `<text x="12" y="${st.y}" text-anchor="middle" font-family="${esc(st.family)}" font-size="${st.size}" font-weight="${esc(st.weight)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${letterSw * 2.2}" stroke-linejoin="round" stroke-linecap="round">${ch}</text>`
      : "";
  return `${halo}<text x="12" y="${st.y}" text-anchor="middle" font-family="${esc(st.family)}" font-size="${st.size}" font-weight="${esc(st.weight)}" fill="${esc(color)}"${stroke}>${ch}</text>`;
}

export function iconInner(
  iconOrId: string | IconDef,
  color = "#ffffff",
  strokeWidth = 2,
  letterStyle?: string,
) {
  const ic = typeof iconOrId === "string" ? getIcon(iconOrId) : iconOrId;
  if (!ic) return "";
  const col = color || "#ffffff";
  const sw = ic.thickCurve ? strokeWidth * 1.45 : strokeWidth;
  if (ic.letter) return letterBody(ic, col, sw, letterStyle);
  if (ic.fill) {
    const outlineOn = ic.outline && sw > 0;
    const strokeAttrs = outlineOn
      ? ` stroke="#1a1a1a" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`
      : ` stroke="none"`;
    return `<g fill="${esc(col)}"${strokeAttrs}>${ic.paths}</g>`;
  }
  return `<g fill="none" stroke="${esc(col)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ic.paths}</g>`;
}

export function iconSvg(
  iconOrId: string | IconDef,
  color = "#ffffff",
  strokeWidth = 2,
  letterStyle?: string,
) {
  const ic = typeof iconOrId === "string" ? getIcon(iconOrId) : iconOrId;
  if (!ic) return "";
  const vb = ic.viewBox || "0 0 24 24";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${esc(vb)}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true">${iconInner(ic, color, strokeWidth, letterStyle)}</svg>`;
}

export function filterIcons(cat: string, query: string) {
  const needle = query.trim().toLowerCase();
  return ICONS.filter((ic) => {
    if (cat !== "all" && ic.cat !== cat) return false;
    if (!needle) return true;
    return `${ic.id} ${ic.label} ${ic.cat}`.toLowerCase().includes(needle);
  });
}
