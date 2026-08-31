import type { FillMode } from "./types";

export type { FillMode };

export const FILL_MODES: { id: FillMode; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "half", label: "Half" },
  { id: "gradient", label: "Gradient" },
];

export function isFillMode(value: string | undefined | null): value is FillMode {
  return value === "solid" || value === "half" || value === "gradient";
}

export function fillModeOf(value: string | undefined | null): FillMode {
  return isFillMode(value) ? value : "solid";
}

export function safePaintId(prefix: string, raw: string) {
  return `${prefix}-${String(raw || "x").replace(/[^a-zA-Z0-9_-]/g, "") || "x"}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Second stop when the designer turns Half / Gradient on and has not picked color 2 yet. */
export function pairColor(hex: string) {
  const v = hex.trim();
  const long = v.match(/^#([0-9a-f]{6})$/i);
  const short = v.match(/^#([0-9a-f]{3})$/i);
  let r = 201;
  let g = 168;
  let b = 76;
  if (long) {
    r = parseInt(long[1].slice(0, 2), 16);
    g = parseInt(long[1].slice(2, 4), 16);
    b = parseInt(long[1].slice(4, 6), 16);
  } else if (short) {
    r = parseInt(short[1][0] + short[1][0], 16);
    g = parseInt(short[1][1] + short[1][1], 16);
    b = parseInt(short[1][2] + short[1][2], 16);
  }
  const r2 = Math.max(0, Math.min(255, Math.round(r * 0.35 + 232 * 0.65)));
  const g2 = Math.max(0, Math.min(255, Math.round(g * 0.25 + 80 * 0.75)));
  const b2 = Math.max(0, Math.min(255, Math.round(b * 0.3 + 90 * 0.7)));
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r2)}${h(g2)}${h(b2)}`;
}

export function dualFill(
  id: string,
  color: string | undefined,
  color2: string | undefined,
  mode: string | undefined,
  fallback = "#2e7d32",
): { defs: string; paint: string } {
  const c1 = (color || fallback).trim() || fallback;
  const resolved = fillModeOf(mode);
  const c2 = (color2 || "").trim() || pairColor(c1);
  if (resolved === "solid") return { defs: "", paint: c1 };
  const gid = safePaintId("bbf", id);
  if (resolved === "half") {
    return {
      defs: `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox"><stop offset="0%" stop-color="${esc(c1)}"/><stop offset="50%" stop-color="${esc(c1)}"/><stop offset="50%" stop-color="${esc(c2)}"/><stop offset="100%" stop-color="${esc(c2)}"/></linearGradient>`,
      paint: `url(#${gid})`,
    };
  }
  return {
    defs: `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox"><stop offset="0%" stop-color="${esc(c1)}"/><stop offset="100%" stop-color="${esc(c2)}"/></linearGradient>`,
    paint: `url(#${gid})`,
  };
}

export function cssFill(color: string | undefined, color2: string | undefined, mode: string | undefined, fallback = "#c9a84c") {
  const c1 = color || fallback;
  const resolved = fillModeOf(mode);
  if (resolved === "solid") return c1;
  const c2 = color2 || pairColor(c1);
  if (resolved === "half") return `linear-gradient(90deg, ${c1} 50%, ${c2} 50%)`;
  return `linear-gradient(90deg, ${c1}, ${c2})`;
}

export function toHexColor(value: string, fallback = "#c9a84c") {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return fallback;
}

/** Box / pack plate. Empty, `none`, and `transparent` mean off. */
export function plateFillOf(value?: string | null) {
  const v = String(value || "").trim();
  if (!v || /^none$/i.test(v) || /^transparent$/i.test(v)) return "";
  return v;
}

export function plateShapeMarkup(opts: {
  cx: number;
  cy: number;
  w: number;
  h: number;
  fill?: string | null;
  shape: "circle" | "square" | "round";
}) {
  const color = plateFillOf(opts.fill);
  if (!color) return "";
  if (opts.shape === "circle") {
    const r = Math.min(opts.w, opts.h) / 2;
    return `<circle cx="${opts.cx}" cy="${opts.cy}" r="${r}" fill="${esc(color)}" stroke="none" />`;
  }
  const rx = opts.shape === "round" ? Math.min(opts.w, opts.h) * 0.12 : 0;
  return `<rect x="${opts.cx - opts.w / 2}" y="${opts.cy - opts.h / 2}" width="${opts.w}" height="${opts.h}" rx="${rx}" fill="${esc(color)}" stroke="none" />`;
}
