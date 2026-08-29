import { dualFill } from "./fills";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export function hasArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export const ARC_SWEEP_THIRD = 120;
export const ARC_SWEEP_HALF = 180;

export function clampCurve(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-100, Math.min(100, n));
}

export function clampSweep(value: unknown, fallback = ARC_SWEEP_HALF) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(30, Math.min(330, n));
}

export function clampArcStroke(value: unknown, fallback = 5.5) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1.2, Math.min(16, n));
}

/** Circular arc along a chord. Positive curve arches up (rainbow). 0 = straight. */
export function curvePathD(cx: number, cy: number, w: number, h: number, curve: number): string | null {
  const t = clampCurve(curve);
  if (Math.abs(t) < 2) return null;
  const chord = Math.max(4, w * 0.92);
  const sagCap = chord * 0.46;
  const sag = Math.max(0.4, Math.min(sagCap, (Math.abs(t) / 100) * Math.max(2.2, h * 0.5)));
  const r = (chord * chord) / (8 * sag) + sag / 2;
  const x0 = cx - chord / 2;
  const x1 = cx + chord / 2;
  const up = t > 0;
  const yChord = up ? cy + sag * 0.12 : cy - sag * 0.12;
  const sweep = up ? 1 : 0;
  const large = sag > chord / 2 ? 1 : 0;
  return `M ${x0.toFixed(3)} ${yChord.toFixed(3)} A ${r.toFixed(3)} ${r.toFixed(3)} 0 ${large} ${sweep} ${x1.toFixed(3)} ${yChord.toFixed(3)}`;
}

export function curvePathLength(w: number, h: number, curve: number) {
  const t = clampCurve(curve);
  const chord = Math.max(4, w * 0.92);
  if (Math.abs(t) < 2) return chord;
  const sagCap = chord * 0.46;
  const sag = Math.max(0.4, Math.min(sagCap, (Math.abs(t) / 100) * Math.max(2.2, h * 0.5)));
  const r = (chord * chord) / (8 * sag) + sag / 2;
  const half = Math.min(Math.PI * 0.98, 2 * Math.asin(Math.min(1, chord / (2 * r))));
  return r * half;
}

export function arcPathD(cx: number, cy: number, w: number, h: number, sweepDeg: number) {
  const sweep = clampSweep(sweepDeg);
  const rx = Math.max(1.2, w / 2);
  const ry = Math.max(1.2, h / 2);
  const half = (sweep * Math.PI) / 360;
  const a0 = -Math.PI / 2 - half;
  const a1 = -Math.PI / 2 + half;
  const x0 = cx + rx * Math.cos(a0);
  const y0 = cy + ry * Math.sin(a0);
  const x1 = cx + rx * Math.cos(a1);
  const y1 = cy + ry * Math.sin(a1);
  const large = sweep > 180 ? 1 : 0;
  return `M ${x0.toFixed(3)} ${y0.toFixed(3)} A ${rx.toFixed(3)} ${ry.toFixed(3)} 0 ${large} 1 ${x1.toFixed(3)} ${y1.toFixed(3)}`;
}

export function curvedTextMarkup(opts: {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  text: string;
  curve: number;
  color?: string;
  color2?: string;
  fillMode?: string;
  family: string;
  weight?: string;
  fontSize?: number;
}): { defs: string; body: string } {
  const text = String(opts.text || "").replace(/\n/g, " ").trim() || "TEXT";
  const d = curvePathD(opts.cx, opts.cy, opts.w, opts.h, opts.curve);
  const fill = dualFill(`t${opts.id}`, opts.color, opts.color2, opts.fillMode, "#ffffff");
  const pathLen = curvePathLength(opts.w, opts.h, opts.curve);
  const chars = Math.max(1, [...text].length);
  const fs =
    opts.fontSize ||
    Math.max(1.4, Math.min(opts.h * 0.62, pathLen / (chars * (hasArabic(text) ? 0.78 : 0.62))));
  const pid = `bbtp-${String(opts.id).replace(/[^a-zA-Z0-9_-]/g, "") || "x"}`;
  const rtl = hasArabic(text);
  const family = esc(opts.family);
  const weight = esc(opts.weight || "800");
  if (!d) {
    return {
      defs: fill.defs ? `<defs>${fill.defs}</defs>` : "",
      body: `<text x="${opts.cx}" y="${opts.cy}" text-anchor="middle" dominant-baseline="middle" fill="${esc(fill.paint)}" font-size="${fs}" font-weight="${weight}" font-family="${family}" direction="${rtl ? "rtl" : "ltr"}" unicode-bidi="isolate">${esc(text)}</text>`,
    };
  }
  return {
    defs: `<defs>${fill.defs}<path id="${pid}" d="${esc(d)}" fill="none"/></defs>`,
    body: `<text fill="${esc(fill.paint)}" font-size="${fs}" font-weight="${weight}" font-family="${family}" direction="${rtl ? "rtl" : "ltr"}" unicode-bidi="isolate"><textPath href="#${pid}" xlink:href="#${pid}" startOffset="50%" text-anchor="middle">${esc(text)}</textPath></text>`,
  };
}

export function arcLineMarkup(opts: {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  sweep: number;
  strokeWidth?: number;
  color?: string;
  color2?: string;
  fillMode?: string;
}): { defs: string; body: string } {
  const d = arcPathD(opts.cx, opts.cy, opts.w, opts.h, opts.sweep);
  const sw = clampArcStroke(opts.strokeWidth);
  const mode = opts.fillMode && opts.fillMode !== "solid" ? opts.fillMode : "gradient";
  const fill = dualFill(`a${opts.id}`, opts.color || "#ff5d7a", opts.color2 || "#ffd23f", mode, "#ff5d7a");
  return {
    defs: fill.defs ? `<defs>${fill.defs}</defs>` : "",
    body: `<path d="${esc(d)}" fill="none" stroke="${esc(fill.paint)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
}
