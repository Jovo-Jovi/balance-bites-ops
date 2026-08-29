import { curvePathD, hasArabic, letterLayout, letterStepMul } from "./deco";
import { dualFill } from "./fills";
import { getLetterStyle, letterGlyphIcon, iconPainted } from "./icons";

export const LETTER_RAINBOW = ["#ff5d7a", "#ff9f1c", "#ffd23f", "#7bd389", "#5dade2", "#c39bd3", "#e85d4c", "#c9a84c"];

export const MAX_LETTER_WORD = 16;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export function wordChars(text: string) {
  return [...String(text || "").replace(/\s+/g, " ").trim()].slice(0, MAX_LETTER_WORD);
}

export function wordRtl(text: string) {
  const chars = wordChars(text);
  const ar = chars.filter((c) => hasArabic(c)).length;
  const lat = chars.filter((c) => /[A-Za-z]/.test(c)).length;
  return ar > lat;
}

export function letterWordBox(count: number, unit: number, curved: boolean, space = 0, arabic = false) {
  const n = Math.max(1, count);
  const side = unit * 0.98;
  const step = side * letterStepMul(space, arabic);
  const span = n === 1 ? side : (n - 1) * step + side;
  const w = Math.min(92, Math.max(unit * 1.05, span * (curved ? 1.06 : 1)));
  const h = curved ? unit * 1.22 : unit * 0.96;
  return { w, h };
}

export function fitLetterWordSize(w: number, h: number, text: string, curve: number, space = 0) {
  const n = Math.max(1, wordChars(text).length);
  const curved = Math.abs(Number(curve) || 0) >= 2;
  const unit = Math.max(4, curved ? h / 1.22 : h / 0.96);
  return letterWordBox(n, unit, curved, space, wordRtl(text));
}

function svgLetterSpacing(space: unknown, fs: number, arabic: boolean) {
  const t = Number(space);
  const n = Number.isFinite(t) ? Math.max(-80, Math.min(80, t)) : 0;
  const em = (arabic ? -0.08 : 0) + (n / 80) * 0.22;
  return em * fs;
}

function colorSpans(chars: string[], rainbow: boolean) {
  return chars
    .map((ch, i) => {
      if (rainbow) {
        const color = LETTER_RAINBOW[i % LETTER_RAINBOW.length];
        return `<tspan fill="${esc(color)}">${esc(ch)}</tspan>`;
      }
      return `<tspan>${esc(ch)}</tspan>`;
    })
    .join("");
}

function arabicWordMarkup(opts: {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  text: string;
  curve?: number;
  color?: string;
  color2?: string;
  fillMode?: string;
  letterStyle?: string;
  letterPack?: string;
  letterSpace?: number;
  strokeWidth?: number;
}): string {
  const chars = wordChars(opts.text);
  if (!chars.length) return "";
  const st = getLetterStyle(opts.letterStyle, true);
  const n = chars.length;
  const fs = Math.max(2.2, Math.min(opts.h * 0.78, opts.w / Math.max(1.15, n * 0.36)));
  const tracking = svgLetterSpacing(opts.letterSpace, fs, true);
  const rainbow = opts.letterPack === "rainbow";
  const fill = dualFill(`aw${opts.id}`, opts.color || "#c9a84c", opts.color2, rainbow ? "solid" : opts.fillMode, "#c9a84c");
  const spans = colorSpans(chars, rainbow);
  const sw0 = opts.strokeWidth ?? 2;
  const sw = sw0 > 0 ? (sw0 * fs * (st.strokeMul || 1)) / 24 : 0;
  const stroke =
    sw > 0
      ? ` stroke="#1a1a1a" stroke-width="${sw}" paint-order="stroke fill" stroke-linejoin="round" stroke-linecap="round"`
      : ` stroke="none"`;
  const halo =
    st.soft && sw > 0
      ? ` stroke="#fff" stroke-opacity=".35" stroke-width="${sw * 2.2}" paint-order="stroke fill" stroke-linejoin="round" stroke-linecap="round"`
      : "";
  const face = ` font-family="${esc(st.family)}" font-size="${fs}" font-weight="${esc(st.weight)}" letter-spacing="${tracking.toFixed(3)}" direction="rtl" unicode-bidi="isolate"`;
  const d = curvePathD(opts.cx, opts.cy, opts.w, opts.h, opts.curve ?? 0);
  const defs = fill.defs && !rainbow ? `<defs>${fill.defs}</defs>` : "";
  const fillAttr = rainbow ? ` fill="none"` : ` fill="${esc(fill.paint)}"`;
  if (!d) {
    const haloText = halo
      ? `<text x="${opts.cx}" y="${opts.cy}" text-anchor="middle" dominant-baseline="middle" fill="none"${halo}${face}>${spans}</text>`
      : "";
    return `${defs}${haloText}<text x="${opts.cx}" y="${opts.cy}" text-anchor="middle" dominant-baseline="middle"${fillAttr}${stroke}${face}>${spans}</text>`;
  }
  const pid = `bbaw-${String(opts.id).replace(/[^a-zA-Z0-9_-]/g, "") || "x"}`;
  const pathDef = `<path id="${pid}" d="${esc(d)}" fill="none"/>`;
  const allDefs = `<defs>${fill.defs && !rainbow ? fill.defs : ""}${pathDef}</defs>`;
  const haloText = halo
    ? `<text fill="none"${halo}${face}><textPath href="#${pid}" xlink:href="#${pid}" startOffset="50%" text-anchor="middle">${spans}</textPath></text>`
    : "";
  return `${allDefs}${haloText}<text${fillAttr}${stroke}${face}><textPath href="#${pid}" xlink:href="#${pid}" startOffset="50%" text-anchor="middle">${spans}</textPath></text>`;
}

export function letterWordMarkup(opts: {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  text: string;
  curve?: number;
  color?: string;
  color2?: string;
  fillMode?: string;
  letterStyle?: string;
  letterPack?: string;
  letterSpace?: number;
  strokeWidth?: number;
}): string {
  const chars = wordChars(opts.text);
  if (!chars.length) return "";
  if (hasArabic(opts.text)) return arabicWordMarkup(opts);
  const rtl = wordRtl(opts.text);
  const slots = letterLayout(opts.cx, opts.cy, opts.w, opts.h, chars.length, opts.curve ?? 0, rtl, opts.letterSpace ?? 0);
  const rainbow = opts.letterPack === "rainbow";
  const sw = opts.strokeWidth ?? 2;
  const bits: string[] = [];
  chars.forEach((ch, i) => {
    if (ch === " ") return;
    const slot = slots[i];
    if (!slot) return;
    const color = rainbow ? LETTER_RAINBOW[i % LETTER_RAINBOW.length] : opts.color || "#c9a84c";
    const painted = iconPainted(letterGlyphIcon(ch), color, sw, opts.letterStyle, {
      color2: rainbow ? undefined : opts.color2,
      fillMode: rainbow ? "solid" : opts.fillMode,
      paintId: `${opts.id}-${i}`,
    });
    if (!painted.inner) return;
    const defs = painted.defs ? `<defs>${painted.defs}</defs>` : "";
    const half = slot.side / 2;
    const inner = `<svg x="${-half}" y="${-half}" width="${slot.side}" height="${slot.side}" viewBox="2 1 20 22" preserveAspectRatio="xMidYMid meet" overflow="visible">${defs}${painted.inner}</svg>`;
    bits.push(`<g transform="translate(${slot.x} ${slot.y}) rotate(${slot.rot})">${inner}</g>`);
  });
  return bits.join("");
}
