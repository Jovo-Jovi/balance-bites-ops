import { hasArabic, letterLayout } from "./deco";
import { letterGlyphIcon, iconPainted } from "./icons";

export const LETTER_RAINBOW = ["#ff5d7a", "#ff9f1c", "#ffd23f", "#7bd389", "#5dade2", "#c39bd3", "#e85d4c", "#c9a84c"];

export const MAX_LETTER_WORD = 16;

export function wordChars(text: string) {
  return [...String(text || "").replace(/\s+/g, " ").trim()].slice(0, MAX_LETTER_WORD);
}

export function wordRtl(text: string) {
  const chars = wordChars(text);
  const ar = chars.filter((c) => hasArabic(c)).length;
  const lat = chars.filter((c) => /[A-Za-z]/.test(c)).length;
  return ar > lat;
}

export function letterWordBox(count: number, unit: number, curved: boolean) {
  const n = Math.max(1, count);
  const w = Math.min(88, Math.max(unit * 1.15, n * unit * (curved ? 0.7 : 0.66)));
  const h = curved ? unit * 1.22 : unit * 0.96;
  return { w, h };
}

export function fitLetterWordSize(w: number, h: number, text: string, curve: number) {
  const n = Math.max(1, wordChars(text).length);
  const curved = Math.abs(Number(curve) || 0) >= 2;
  const unit = Math.max(4, curved ? h / 1.22 : h / 0.96);
  return letterWordBox(n, unit, curved);
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
  strokeWidth?: number;
}): string {
  const chars = wordChars(opts.text);
  if (!chars.length) return "";
  const rtl = wordRtl(opts.text);
  const slots = letterLayout(opts.cx, opts.cy, opts.w, opts.h, chars.length, opts.curve ?? 0, rtl);
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
    const inner = `<svg x="${-half}" y="${-half}" width="${slot.side}" height="${slot.side}" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" overflow="visible">${defs}${painted.inner}</svg>`;
    bits.push(`<g transform="translate(${slot.x} ${slot.y}) rotate(${slot.rot})">${inner}</g>`);
  });
  return bits.join("");
}
