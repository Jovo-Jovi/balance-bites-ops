import catalog from "./icon-catalog.json";
import { dualFill } from "./fills";
import { hasArabic } from "./deco";

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

const ARABIC_FAMILY: Record<string, string> = {
  fatty: "Cairo, Tajawal, sans-serif",
  bubble: "'Baloo Bhaijaan 2', Cairo, Tajawal, sans-serif",
  jelly: "Cairo, Tajawal, sans-serif",
  candy: "'Baloo Bhaijaan 2', Cairo, cursive",
  sniglet: "Cairo, Tajawal, sans-serif",
  block: "Cairo, Tajawal, sans-serif",
};

const LETTER_STYLE_MAP = new Map(LETTER_STYLES.map((s) => [s.id, s]));

export function getLetterStyle(id?: string | null, arabic = false): LetterStyle {
  const base = LETTER_STYLE_MAP.get(id || "") || LETTER_STYLE_MAP.get("fatty") || LETTER_STYLES[0];
  if (!arabic) return base;
  return {
    ...base,
    family: ARABIC_FAMILY[base.id] || "Cairo, Tajawal, sans-serif",
    size: 16.2,
    y: 13.2,
  };
}

/** Hijāʾī 28 — same colorful letter tiles as A–Z. */
const ARABIC_ALPHABET: { id: string; ch: string }[] = [
  { id: "alef", ch: "ا" },
  { id: "ba", ch: "ب" },
  { id: "ta", ch: "ت" },
  { id: "tha", ch: "ث" },
  { id: "jim", ch: "ج" },
  { id: "ha", ch: "ح" },
  { id: "kha", ch: "خ" },
  { id: "dal", ch: "د" },
  { id: "dhal", ch: "ذ" },
  { id: "ra", ch: "ر" },
  { id: "zay", ch: "ز" },
  { id: "sin", ch: "س" },
  { id: "shin", ch: "ش" },
  { id: "sad", ch: "ص" },
  { id: "dad", ch: "ض" },
  { id: "tah", ch: "ط" },
  { id: "zah", ch: "ظ" },
  { id: "ayn", ch: "ع" },
  { id: "ghayn", ch: "غ" },
  { id: "fa", ch: "ف" },
  { id: "qaf", ch: "ق" },
  { id: "kaf", ch: "ك" },
  { id: "lam", ch: "ل" },
  { id: "mim", ch: "م" },
  { id: "nun", ch: "ن" },
  { id: "haa", ch: "ه" },
  { id: "waw", ch: "و" },
  { id: "ya", ch: "ي" },
];

function arabicLetterIcons(): IconDef[] {
  return ARABIC_ALPHABET.map((row) => ({
    id: `ar-${row.id}`,
    label: row.ch,
    cat: "ar-alpha",
    paths: "",
    fill: false,
    outline: false,
    letter: row.ch,
    viewBox: "0 0 24 24",
    thickCurve: false,
  }));
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
  { id: "ar-alpha", label: "أ–ي" },
] as const;

export const ICONS = [...(catalog as IconDef[]), ...arabicLetterIcons()];

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

function letterGlyph(ic: IconDef) {
  const raw = String(ic.letter || ic.label || "?").trim();
  const ch = [...raw][0] || "?";
  if (hasArabic(ch)) return ch;
  return ch.toUpperCase();
}

function letterBody(ic: IconDef, color: string, strokeWidth: number, letterStyle?: string) {
  const ch = esc(letterGlyph(ic));
  const arabic = hasArabic(ic.letter || ic.label || "");
  const st = getLetterStyle(letterStyle, arabic);
  let letterSw = strokeWidth > 0 ? strokeWidth : 0;
  if (letterSw > 0 && st.strokeMul) letterSw = letterSw * st.strokeMul;
  const stroke =
    letterSw > 0
      ? ` stroke="#1a1a1a" stroke-width="${letterSw}" paint-order="stroke fill" stroke-linejoin="round" stroke-linecap="round"`
      : ` stroke="none"`;
  const dir = arabic ? ` direction="rtl" unicode-bidi="isolate" dominant-baseline="middle"` : "";
  const y = arabic ? 12.2 : st.y;
  const halo =
    st.soft && letterSw > 0
      ? `<text x="12" y="${y}" text-anchor="middle" font-family="${esc(st.family)}" font-size="${st.size}" font-weight="${esc(st.weight)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${letterSw * 2.2}" stroke-linejoin="round" stroke-linecap="round"${dir}>${ch}</text>`
      : "";
  return `${halo}<text x="12" y="${y}" text-anchor="middle" font-family="${esc(st.family)}" font-size="${st.size}" font-weight="${esc(st.weight)}" fill="${esc(color)}"${stroke}${dir}>${ch}</text>`;
}

export type IconPaintOpts = {
  color2?: string;
  fillMode?: string;
  paintId?: string;
};

export function iconInner(
  iconOrId: string | IconDef,
  color = "#ffffff",
  strokeWidth = 2,
  letterStyle?: string,
  paint?: string,
) {
  const ic = typeof iconOrId === "string" ? getIcon(iconOrId) : iconOrId;
  if (!ic) return "";
  const col = paint || color || "#ffffff";
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

export function iconPainted(
  iconOrId: string | IconDef,
  color = "#ffffff",
  strokeWidth = 2,
  letterStyle?: string,
  opts?: IconPaintOpts,
) {
  const ic = typeof iconOrId === "string" ? getIcon(iconOrId) : iconOrId;
  if (!ic) return { defs: "", inner: "" };
  const fill = dualFill(opts?.paintId || ic.id, color, opts?.color2, opts?.fillMode, color || "#ffffff");
  return { defs: fill.defs, inner: iconInner(ic, color, strokeWidth, letterStyle, fill.paint) };
}

export function iconSvg(
  iconOrId: string | IconDef,
  color = "#ffffff",
  strokeWidth = 2,
  letterStyle?: string,
  opts?: IconPaintOpts,
) {
  const ic = typeof iconOrId === "string" ? getIcon(iconOrId) : iconOrId;
  if (!ic) return "";
  const vb = ic.viewBox || "0 0 24 24";
  const painted = iconPainted(ic, color, strokeWidth, letterStyle, opts);
  const defs = painted.defs ? `<defs>${painted.defs}</defs>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${esc(vb)}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" aria-hidden="true">${defs}${painted.inner}</svg>`;
}

function syntheticLetter(id: string, letter: string, cat: string, fill: boolean, outline: boolean): IconDef {
  return {
    id,
    label: letter,
    cat,
    paths: "",
    fill,
    outline,
    letter,
    viewBox: "0 0 24 24",
    thickCurve: false,
  };
}

export function letterGlyphIcon(ch: string): IconDef {
  const raw = String(ch || "").trim();
  let letter = [...raw][0] || "?";
  if (/[أإآٱ]/.test(letter)) letter = "ا";
  const latin = letter.toUpperCase();
  if (/^[A-Z]$/.test(latin)) {
    return getIcon(`letter-${latin.toLowerCase()}`) || syntheticLetter(`letter-${latin.toLowerCase()}`, latin, "alpha", true, true);
  }
  const ar = ARABIC_ALPHABET.find((row) => row.ch === letter);
  if (ar) return getIcon(`ar-${ar.id}`) || syntheticLetter(`ar-${ar.id}`, letter, "ar-alpha", false, false);
  return syntheticLetter(`glyph-${letter.charCodeAt(0)}`, letter, "alpha", false, false);
}

export function filterIcons(cat: string, query: string) {
  const needle = query.trim().toLowerCase();
  return ICONS.filter((ic) => {
    if (cat !== "all" && ic.cat !== cat) return false;
    if (!needle) return true;
    return `${ic.id} ${ic.label} ${ic.cat}`.toLowerCase().includes(needle);
  });
}
