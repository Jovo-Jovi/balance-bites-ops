import { previewImage, usableImage } from "./art";
import { presetThumbFill } from "./art-presets";
import { partFillPath } from "./boolean-cut";
import { familyPreviewSvg, circleShape } from "./family-preview";
import { getIcon, iconInner } from "./icons";
import { artboardOf, circlePx, previewFace } from "./layout";
import { getDesignSpec } from "./specs";
import type { CompositeBlob, CompositePart, CompositeZone, LabelState, LabelTemplate } from "./types";

function str(state: LabelState, key: string, fallback = "") {
  const v = state[key];
  return v == null || v === "" ? fallback : String(v);
}

function num(state: LabelState, key: string, fallback: number) {
  const n = Number(state[key]);
  return Number.isFinite(n) ? n : fallback;
}

export function bgPanKeys(srcKey: string) {
  const n = String(srcKey).replace(/^hxBg/i, "") || "1";
  return { x: `sPan${n}X`, y: `sPan${n}Y` };
}

export function productPhotoBox(state: LabelState, circular: boolean) {
  const sz = num(state, "sCProdSz", 80);
  if (circular) {
    const { W, H } = circlePx(state);
    const pW = W ? (sz / W) * 100 : 20;
    const pH = H ? (sz / H) * 100 : 20;
    return {
      x: 92 - pW / 2 + (W ? (num(state, "sCProdX", 0) / W) * 100 : 0),
      y: 52 + (H ? (num(state, "sCProdY", 0) / H) * 100 : 0),
      w: pW,
      h: pH,
    };
  }
  const w = Math.max(10, Math.min(70, sz * 0.45));
  return { x: num(state, "sCProdX", 50), y: num(state, "sCProdY", 50), w, h: w };
}

function polygon(n: number, cx: number, cy: number, rx: number, ry: number, rot = -90) {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (i * 360) / n) * Math.PI) / 180;
    pts.push(`${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function starPoints(cx: number, cy: number, rx: number, ry: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const f = i % 2 === 0 ? 1 : 0.45;
    pts.push(`${cx + rx * f * Math.cos(a)},${cy + ry * f * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function colorRgb(color: string): { r: number; g: number; b: number } | null {
  const h = color.trim().toLowerCase();
  if (h === "black") return { r: 0, g: 0, b: 0 };
  if (h === "white") return { r: 255, g: 255, b: 255 };
  const short = h.match(/^#([0-9a-f]{3})$/i);
  const long = h.match(/^#([0-9a-f]{6})$/i);
  if (short) {
    return {
      r: parseInt(short[1][0] + short[1][0], 16),
      g: parseInt(short[1][1] + short[1][1], 16),
      b: parseInt(short[1][2] + short[1][2], 16),
    };
  }
  if (long) {
    return {
      r: parseInt(long[1].slice(0, 2), 16),
      g: parseInt(long[1].slice(2, 4), 16),
      b: parseInt(long[1].slice(4, 6), 16),
    };
  }
  return null;
}

function colorLum(color: string) {
  const rgb = colorRgb(color);
  if (!rgb) return 128;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

export function isCutBlack(color: string) {
  const rgb = colorRgb(color);
  if (!rgb) return color.trim().toLowerCase() === "black";
  return rgb.r < 40 && rgb.g < 40 && rgb.b < 40;
}

export function partBorderWidth(part: CompositePart) {
  let w = 1.2;
  if (part.borderWidth != null && part.borderWidth !== "") {
    const n = Number(part.borderWidth);
    if (Number.isFinite(n) && n >= 0) w = n;
  } else if (part.type === "silhouette") {
    w = 0;
  }
  if (part.type === "silhouette" && part.showImage && isCutBlack(String(part.borderColor || "#1a1a1a"))) {
    return 0;
  }
  return w;
}

function strokePaint(part: CompositePart) {
  const bw = partBorderWidth(part);
  if (bw <= 0) return ` stroke="none"`;
  return ` stroke="${esc(part.borderColor || "#1a1a1a")}" stroke-width="${bw}" stroke-linejoin="round" stroke-linecap="round"`;
}

function partLocalGroup(part: CompositePart, inner: string) {
  const left = part.x - part.w / 2;
  const top = part.y - part.h / 2;
  const rot = part.rot ? ` transform="rotate(${part.rot} ${part.x} ${part.y})"` : "";
  const stroke =
    part.pathLocal && partBorderWidth(part) > 0
      ? `<path d="${esc(part.pathLocal)}" fill="none"${strokePaint(part)}/>`
      : "";
  return `<g${rot}><g transform="translate(${left} ${top}) scale(${part.w / 100} ${part.h / 100})">${inner}${stroke}</g></g>`;
}

function partRot(part: CompositePart, inner: string) {
  if (!part.rot) return inner;
  return `<g transform="rotate(${part.rot} ${part.x} ${part.y})">${inner}</g>`;
}

function partShape(part: CompositePart, lite = false) {
  const fill = part.color || "#2e7d32";
  const x = part.x;
  const y = part.y;
  const rx = part.w / 2;
  const ry = part.h / 2;
  const src = previewImage(part.src || part.srcUrl, part.artKey, lite);
  const wantImage = Boolean(src) && part.showImage === true;
  if (wantImage) {
    return partLocalGroup(
      part,
      `<image href="${esc(src)}" x="0" y="0" width="100" height="100" preserveAspectRatio="none" />`,
    );
  }
  if (part.pathLocal) {
    return partLocalGroup(part, `<path d="${esc(part.pathLocal)}" fill="${esc(fill)}" />`);
  }
  const t = part.type;
  const ink = `fill="${esc(fill)}"${strokePaint(part)}`;
  if (t === "circle" || t === "oval") {
    return partRot(part, `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${ink} />`);
  }
  if (t === "square" || t === "rectangle" || t === "rounded_sq" || t === "rounded_rect") {
    const rr = t.startsWith("rounded") ? Math.min(rx, ry) * 0.22 : 0;
    return partRot(part, `<rect x="${x - rx}" y="${y - ry}" width="${part.w}" height="${part.h}" rx="${rr}" ${ink} />`);
  }
  if (t === "diamond") return partRot(part, `<polygon points="${polygon(4, x, y, rx, ry, -45)}" ${ink} />`);
  if (t === "hexagon") return partRot(part, `<polygon points="${polygon(6, x, y, rx, ry)}" ${ink} />`);
  if (t === "pentagon") return partRot(part, `<polygon points="${polygon(5, x, y, rx, ry)}" ${ink} />`);
  if (t === "octagon") return partRot(part, `<polygon points="${polygon(8, x, y, rx, ry)}" ${ink} />`);
  if (t === "star") return partRot(part, `<polygon points="${starPoints(x, y, rx, ry)}" ${ink} />`);
  const d = partFillPath(part);
  if (d) return `<path d="${esc(d)}" ${ink} />`;
  return partRot(part, `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${ink} />`);
}

function familyClipKind(designType: string, outline: string | null) {
  if (designType === "taper_top") return "taper";
  if (designType === "rect_top") return "rect";
  return outline || (designType === "circular" ? "circle" : "rounded_sq");
}

function compositeClip(comp: CompositeBlob) {
  const union = String(comp.unionPath || "").trim();
  if (union) return `<path d="${esc(union)}" />`;
  const part = (comp.parts || [])[0];
  if (part?.pathLocal) {
    const left = part.x - part.w / 2;
    const top = part.y - part.h / 2;
    return `<path d="${esc(part.pathLocal)}" transform="translate(${left} ${top}) scale(${part.w / 100} ${part.h / 100})" />`;
  }
  return `<rect width="100" height="100" />`;
}

function bgLayers(state: LabelState, lite = false) {
  if (lite) return "";
  const slots: Array<[string, string, string]> = [
    ["hxBg1", "sOpa1", "sZoom1"],
    ["hxBg2", "sOpa2", "sZoom2"],
    ["hxBg3", "sOpa3", "sZoom3"],
    ["hxBg4", "sOpa4", "sZoom4"],
    ["hxBg5", "sOpa5", "sZoom5"],
  ];
  return slots
    .map(([srcKey, opaKey, zoomKey]) => {
      const href = usableImage(state[srcKey]);
      if (!href) return "";
      const o = num(state, opaKey, 1);
      const z = Math.max(0.05, num(state, zoomKey, 100) / 100);
      const size = 100 * z;
      const pan = bgPanKeys(srcKey);
      const cx = num(state, pan.x, 50);
      const cy = num(state, pan.y, 50);
      const x = cx - size / 2;
      const y = cy - size / 2;
      return `<image href="${esc(href)}" x="${x}" y="${y}" width="${size}" height="${size}" opacity="${o}" preserveAspectRatio="xMidYMid slice" />`;
    })
    .join("");
}

function productLayer(state: LabelState, circular: boolean, lite = false) {
  if (lite) return "";
  const href = usableImage(state.hxCProd);
  if (!href) return "";
  const box = productPhotoBox(state, circular);
  const x = box.x - box.w / 2;
  const y = box.y - box.h / 2;
  return `<image href="${esc(href)}" x="${x}" y="${y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid meet" />`;
}

function qrLayer(state: LabelState, lite = false) {
  if (lite) return "";
  const href = usableImage(state.hxQr);
  if (!href) return "";
  const w = Math.max(8, num(state, "sQRSize", 16));
  const x = num(state, "sQRX", 86);
  const y = num(state, "sQRY", 86);
  return `<image href="${esc(href)}" x="${x - w / 2}" y="${y - w / 2}" width="${w}" height="${w}" preserveAspectRatio="xMidYMid meet" />`;
}

function iconMark(
  iconId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  strokeWidth: number,
  rot?: number,
  letterStyle?: string,
) {
  const inner = iconInner(iconId, color, strokeWidth, letterStyle);
  if (!inner) return "";
  const side = Math.max(2, Math.min(w, h));
  const left = x - side / 2;
  const top = y - side / 2;
  const vb = getIcon(iconId)?.viewBox || "0 0 24 24";
  const body = `<svg x="${left}" y="${top}" width="${side}" height="${side}" viewBox="${esc(vb)}" preserveAspectRatio="xMidYMid meet" overflow="visible">${inner}</svg>`;
  if (!rot) return body;
  return `<g transform="rotate(${rot} ${x} ${y})">${body}</g>`;
}

function cssFont(raw: string, fallback: string) {
  const s = String(raw || "")
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
  return s || fallback;
}

function fontOf(state: LabelState, keys: string[], fallback: string) {
  for (const key of keys) {
    const v = cssFont(str(state, key), "");
    if (v) return v;
  }
  return fallback;
}

function zoneMarkup(z: CompositeZone, fallback: string, state: LabelState, lite = false) {
  if (z.kind === "icon" && z.iconId) {
    return iconMark(
      z.iconId,
      z.x,
      z.y,
      z.w,
      z.h,
      z.color || z.textColor || fallback,
      z.strokeWidth ?? 2,
      z.rot,
      z.letterStyle,
    );
  }
  if (z.kind === "image") {
    const src = previewImage(z.src || z.srcUrl, undefined, lite);
    if (!src) return "";
    const left = z.x - z.w / 2;
    const top = z.y - z.h / 2;
    const bw = Number(z.borderWidth);
    const stroke =
      Number.isFinite(bw) && bw > 0
        ? `<rect x="${left}" y="${top}" width="${z.w}" height="${z.h}" fill="none" stroke="${esc(z.borderColor || "#1a1a1a")}" stroke-width="${bw}" />`
        : "";
    const img = `<image href="${esc(src)}" x="${left}" y="${top}" width="${z.w}" height="${z.h}" preserveAspectRatio="xMidYMid meet" />${stroke}`;
    if (!z.rot) return img;
    return `<g transform="rotate(${z.rot} ${z.x} ${z.y})">${img}</g>`;
  }
  if (z.kind === "logo") {
    const r = Math.min(z.w, z.h) / 2;
    const fill = z.color || "#ffffff";
    const ink = z.textColor || "#1a1a1a";
    const fs = Math.max(3, r * (z.fontScale || 0.7));
    const family = z.fontFamily || fontOf(state, ["fntHead", "fntH"], "Bitter, serif");
    const sw = z.strokeWidth ?? Number(z.borderWidth);
    const ring =
      Number.isFinite(sw) && sw > 0
        ? ` stroke="${esc(z.borderColor || "#1a1a1a")}" stroke-width="${sw}"`
        : ` stroke="none"`;
    const body = `<g>
      <circle cx="${z.x}" cy="${z.y}" r="${r}" fill="${esc(fill)}"${ring} />
      <text x="${z.x}" y="${z.y}" text-anchor="middle" dominant-baseline="middle" fill="${esc(ink)}" font-size="${fs}" font-weight="700" font-family="${esc(family)}">${esc(String(z.text || "BB"))}</text>
    </g>`;
    if (!z.rot) return body;
    return `<g transform="rotate(${z.rot} ${z.x} ${z.y})">${body}</g>`;
  }
  const lines = String(z.text || "").split("\n");
  const color = z.color || z.textColor || fallback;
  const size = Math.max(2.2, Math.min(10, z.h / Math.max(lines.length, 1) * 0.7));
  const startY = z.y - ((lines.length - 1) * size * 0.55);
  const family = z.fontFamily || fontOf(state, ["fntBody", "fntB", "fntArabic", "fntAr"], "Montserrat, Tajawal, sans-serif");
  const weight = z.fontWeight || "700";
  const bw = Number(z.borderWidth);
  const boxStroke =
    Number.isFinite(bw) && bw > 0
      ? ` stroke="${esc(z.borderColor || "#1a1a1a")}" stroke-width="${bw}"`
      : "";
  const plate = z.fill && z.fill !== "none"
    ? `<rect x="${z.x - z.w / 2}" y="${z.y - z.h / 2}" width="${z.w}" height="${z.h}" rx="${Math.min(z.w, z.h) * 0.12}" fill="${esc(z.fill)}"${boxStroke} />`
    : Number.isFinite(bw) && bw > 0
      ? `<rect x="${z.x - z.w / 2}" y="${z.y - z.h / 2}" width="${z.w}" height="${z.h}" rx="${Math.min(z.w, z.h) * 0.12}" fill="none"${boxStroke} />`
      : "";
  const text = lines
    .map(
      (line, i) =>
        `<text x="${z.x}" y="${startY + i * size * 1.12}" text-anchor="middle" dominant-baseline="middle" fill="${esc(color)}" font-size="${size}" font-weight="${esc(weight)}" font-family="${esc(family)}">${esc(line)}</text>`,
    )
    .join("");
  const body = `${plate}${text}`;
  if (!z.rot) return body;
  return `<g transform="rotate(${z.rot} ${z.x} ${z.y})">${body}</g>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export const CUT_STROKE_MM = 0.25;
export const CUT_STROKE_COLOR = "#FF00FF";

export type LabelPreviewOpts = { showCut?: boolean; lite?: boolean; physical?: boolean };

export function cutStrokeOf(state: LabelState) {
  const raw = Number(state.sCutStrokeMm);
  const mm = Number.isFinite(raw) ? raw : CUT_STROKE_MM;
  const color = str(state, "cCutStroke", CUT_STROKE_COLOR);
  return { mm: Math.max(0, Math.min(8, mm)), color };
}

function clipIdOf(template: LabelTemplate) {
  return `bbcut-${template.id.replace(/[^a-zA-Z0-9_-]/g, "") || "x"}`;
}

function scalePts(pts: string, sx: number, sy: number) {
  return pts
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",");
      return `${Number(x) * sx},${Number(y) * sy}`;
    })
    .join(" ");
}

function scalePathD(d: string, sx: number, sy: number) {
  const tokens = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]?\d+)?/g) || [];
  let cmd = "";
  let pair = 0;
  let arc = 0;
  const out: string[] = [];
  for (const tok of tokens) {
    if (/^[MmLlHhVvCcSsQqTtAaZz]$/.test(tok)) {
      cmd = tok;
      pair = 0;
      arc = 0;
      out.push(tok);
      continue;
    }
    const n = Number(tok);
    if (/[Hh]/.test(cmd)) {
      out.push((n * sx).toFixed(3));
    } else if (/[Vv]/.test(cmd)) {
      out.push((n * sy).toFixed(3));
    } else if (/[Aa]/.test(cmd)) {
      const idx = arc % 7;
      if (idx === 0 || idx === 5) out.push((n * sx).toFixed(3));
      else if (idx === 1 || idx === 6) out.push((n * sy).toFixed(3));
      else out.push(tok);
      arc += 1;
    } else {
      out.push((n * (pair % 2 === 0 ? sx : sy)).toFixed(3));
      pair += 1;
    }
  }
  return out.join(" ");
}

function familyCutMm(kind: string, wMm: number, hMm: number) {
  const sx = wMm / 100;
  const sy = hMm / 100;
  const rr = (v: number) => (v * Math.min(sx, sy)).toFixed(3);
  if (kind === "square") return `<rect x="${8 * sx}" y="${8 * sy}" width="${84 * sx}" height="${84 * sy}" />`;
  if (kind === "rounded_sq") {
    return `<rect x="${8 * sx}" y="${8 * sy}" width="${84 * sx}" height="${84 * sy}" rx="${rr(14)}" />`;
  }
  if (kind === "diamond") return `<polygon points="${scalePts(polygon(4, 50, 50, 42, 42, -45), sx, sy)}" />`;
  if (kind === "hexagon") return `<polygon points="${scalePts(polygon(6, 50, 50, 44, 44), sx, sy)}" />`;
  if (kind === "pentagon") return `<polygon points="${scalePts(polygon(5, 50, 50, 44, 44), sx, sy)}" />`;
  if (kind === "octagon") return `<polygon points="${scalePts(polygon(8, 50, 50, 44, 44), sx, sy)}" />`;
  if (kind === "star") return `<polygon points="${scalePts(starPoints(50, 50, 44, 44), sx, sy)}" />`;
  if (kind === "rect") {
    return `<rect x="${4 * sx}" y="${18 * sy}" width="${92 * sx}" height="${78 * sy}" rx="${rr(3)}" />`;
  }
  if (kind === "taper") return `<polygon points="${scalePts("14,16 86,16 100,96 0,96", sx, sy)}" />`;
  return `<ellipse cx="${50 * sx}" cy="${50 * sy}" rx="${48 * sx}" ry="${48 * sy}" />`;
}

function compositeCutMm(comp: CompositeBlob, wMm: number, hMm: number) {
  const sx = wMm / 100;
  const sy = hMm / 100;
  const union = String(comp.unionPath || "").trim();
  if (union) return `<path d="${esc(scalePathD(union, sx, sy))}" />`;
  const part = (comp.parts || [])[0];
  if (part?.pathLocal) {
    const left = (part.x - part.w / 2) * sx;
    const top = (part.y - part.h / 2) * sy;
    const d = scalePathD(part.pathLocal, (part.w / 100) * sx, (part.h / 100) * sy);
    return `<path d="${esc(d)}" transform="translate(${left} ${top})" />`;
  }
  return `<rect x="0" y="0" width="${wMm}" height="${hMm}" />`;
}

function cutGeomMm(template: LabelTemplate, state: LabelState, wMm: number, hMm: number) {
  const spec = getDesignSpec(template.designType);
  const face = previewFace(template);
  if (spec.composite && state._composite) return compositeCutMm(state._composite, wMm, hMm);
  return familyCutMm(
    face === "taper" ? "taper" : face === "back" ? "rect" : circleShape(state, spec.outline),
    wMm,
    hMm,
  );
}

function wrapPreviewSvg(inner: string, template: LabelTemplate, state: LabelState, opts?: LabelPreviewOpts) {
  const { wCm, hCm } = artboardOf(template, state);
  const stroke = cutStrokeOf(state);
  const showCut = Boolean(opts?.showCut) && stroke.mm > 0;
  const padMm = opts?.physical && showCut ? stroke.mm : 0;
  const outW = wCm + (2 * padMm) / 10;
  const outH = hCm + (2 * padMm) / 10;
  const size = opts?.physical ? `width="${outW}cm" height="${outH}cm"` : `width="100%" height="100%"`;
  // Composite 0–100 is percent of the artboard rectangle (live). Stretch onto cW×cH so
  // portrait dies (popcorn 5×6.5) keep Size/overlay aligned. Family faces do not use this helper.
  const par = "none";
  const css = opts?.physical
    ? `<style type="text/css"><![CDATA[@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=DM+Sans:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@400;700&display=swap");*{color-interpolation:sRGB;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;forced-color-adjust:none!important;}]]></style>`
    : "";
  if (!showCut) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="${par}" ${size} overflow="visible" color-interpolation="sRGB" role="img">${css}${inner}</svg>`;
  }
  const wMm = wCm * 10;
  const hMm = hCm * 10;
  const under = `<g fill="none" stroke="${esc(stroke.color)}" stroke-width="${stroke.mm * 2}" stroke-linejoin="round" stroke-linecap="round">${cutGeomMm(template, state, wMm, hMm)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-padMm} ${-padMm} ${wMm + 2 * padMm} ${hMm + 2 * padMm}" preserveAspectRatio="${par}" ${size} overflow="visible" color-interpolation="sRGB" role="img">${css}
    ${under}
    <svg viewBox="0 0 100 100" x="0" y="0" width="${wMm}" height="${hMm}" preserveAspectRatio="none">${inner}</svg>
  </svg>`;
}

export function labelPreviewSvg(template: LabelTemplate, state: LabelState, opts?: LabelPreviewOpts) {
  const spec = getDesignSpec(template.designType);
  const lite = Boolean(opts?.lite);
  if (!spec.composite || !state._composite) {
    return familyPreviewSvg(template, state, lite, Boolean(opts?.showCut), Boolean(opts?.physical));
  }

  const fill = str(state, "cLabel", "#2e7d32");
  const txt = str(state, "cTxtMain", "#ffffff");
  const comp = state._composite;
  const clipId = clipIdOf(template);
  const stamps = [...(state._stamps || [])];

  if (spec.composite && comp) {
    const parts = [...(comp.parts || [])];
    const zones = [...(comp.zones || [])];
    const exactArt = parts.some((p) => p.showImage);
    const boardFill =
      lite || !exactArt ? `<rect width="100" height="100" fill="${esc(comp.bg || fill)}" />` : "";
    const stack: { z: number; html: string }[] = [];
    for (const p of parts) stack.push({ z: p.z || 0, html: partShape(p, lite) });
    for (const z of zones) stack.push({ z: z.z || 0, html: zoneMarkup(z, comp.txt || txt, state, lite) });
    for (const s of stamps) {
      stack.push({
        z: s.z || 0,
        html: iconMark(s.iconId, s.x, s.y, s.w, s.h, s.color || txt, s.strokeWidth ?? 2, s.rot, s.letterStyle),
      });
    }
    const photo = productLayer(state, false, lite);
    if (photo) stack.push({ z: 0.5, html: photo });
    stack.sort((a, b) => a.z - b.z);
    const inner = `
      <defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${compositeClip(comp)}</clipPath></defs>
      <g clip-path="url(#${clipId})">
        ${boardFill}
        ${bgLayers(state, lite)}
        ${stack.map((item) => item.html).join("")}
        ${qrLayer(state, lite)}
      </g>`;
    return wrapPreviewSvg(inner, template, state, opts);
  }

  return wrapPreviewSvg("", template, state, opts);
}

function thumbStroke(fill: string, minSide: number) {
  const sw = Math.max(0.8, minSide * 0.02);
  const stroke = colorLum(fill) > 160 ? "#1a1a1a" : "#c9a84c";
  return ` stroke="${stroke}" stroke-width="${sw}"`;
}

function thumbPartFill(part: CompositePart, bg: string) {
  const preset = presetThumbFill(part.artKey);
  const fill = String(part.color || bg || "#888888");
  if (preset && (colorLum(fill) > 220 || Math.abs(colorLum(fill) - colorLum(bg)) < 28)) return preset;
  if (colorLum(fill) > 220) return preset || "#c9a84c";
  return fill;
}

function thumbPartShape(part: CompositePart, bg: string) {
  const fill = thumbPartFill(part, bg);
  const ink = `fill="${esc(fill)}" stroke="#1a1a1a" stroke-width="1.2"`;
  if (part.pathLocal) return partLocalGroup(part, `<path d="${esc(part.pathLocal)}" ${ink} />`);
  const x = part.x;
  const y = part.y;
  const rx = part.w / 2;
  const ry = part.h / 2;
  const t = part.type;
  if (t === "circle" || t === "oval") return partRot(part, `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${ink} />`);
  if (t === "square" || t === "rectangle" || t === "rounded_sq" || t === "rounded_rect") {
    const rr = t.startsWith("rounded") ? Math.min(rx, ry) * 0.22 : 0;
    return partRot(part, `<rect x="${x - rx}" y="${y - ry}" width="${part.w}" height="${part.h}" rx="${rr}" ${ink} />`);
  }
  if (t === "diamond") return partRot(part, `<polygon points="${polygon(4, x, y, rx, ry, -45)}" ${ink} />`);
  if (t === "hexagon") return partRot(part, `<polygon points="${polygon(6, x, y, rx, ry)}" ${ink} />`);
  if (t === "pentagon") return partRot(part, `<polygon points="${polygon(5, x, y, rx, ry)}" ${ink} />`);
  if (t === "octagon") return partRot(part, `<polygon points="${polygon(8, x, y, rx, ry)}" ${ink} />`);
  if (t === "star") return partRot(part, `<polygon points="${starPoints(x, y, rx, ry)}" ${ink} />`);
  const d = partFillPath(part);
  if (d) return `<path d="${esc(d)}" ${ink} />`;
  return partRot(part, `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${ink} />`);
}

function compositeThumbSvg(template: LabelTemplate, state: LabelState) {
  const comp = state._composite;
  if (!comp) return familyThumbSvg(template, state);
  const bg = str(state, "cLabel", String(comp.bg || "#2e7d32"));
  const parts = [...(comp.parts || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  const shapes = parts.map((p) => thumbPartShape(p, bg)).join("");
  const fallback =
    !parts.length && String(comp.unionPath || "").trim()
      ? `<path d="${esc(comp.unionPath || "")}" fill="${esc(presetThumbFill(parts[0]?.artKey) || "#c9a84c")}" />`
      : "";
  const clipId = `lt-${clipIdOf(template)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" overflow="hidden" role="img">
    <defs><clipPath id="${clipId}">${compositeClip(comp)}</clipPath></defs>
    <g clip-path="url(#${clipId})">${shapes}${fallback}</g>
  </svg>`;
}

function familyThumbSvg(template: LabelTemplate, state: LabelState) {
  const spec = getDesignSpec(template.designType);
  const fill = str(state, "cLabel", "#2e7d32");
  const face = previewFace(template);
  const board = artboardOf(template, state);
  const wCm = Math.max(0.8, board.wCm || 6);
  const hCm = Math.max(0.8, board.hCm || 6);
  const W = Math.max(12, wCm * 20);
  const H = Math.max(12, hCm * 20);
  const kind =
    face === "taper" ? "taper" : face === "back" ? "rect" : familyClipKind(template.designType, spec.outline);
  const ink = esc(fill);
  const edge = thumbStroke(fill, Math.min(W, H));
  let inner = "";
  if (kind === "rect") {
    const rr = Math.min(W, H) * 0.12;
    inner = `<rect x="0.6" y="0.6" width="${W - 1.2}" height="${H - 1.2}" rx="${rr}" fill="${ink}"${edge}/>`;
    const bands = [0.14, 0.2, 0.18, 0.16, 0.32];
    let x = 0;
    inner += `<g fill="#fff" opacity=".2">`;
    for (const b of bands) {
      inner += `<rect x="${x * W}" y="${H * 0.1}" width="${b * W}" height="${H * 0.8}" rx="${rr * 0.15}"/>`;
      x += b;
    }
    inner += `</g>`;
  } else if (kind === "taper") {
    inner = `<polygon points="${W * 0.14},0 ${W * 0.86},0 ${W},${H} 0,${H}" fill="${ink}"${edge}/>`;
    inner += `<g fill="#fff" opacity=".18">
      <polygon points="${W * 0.18},${H * 0.08} ${W * 0.32},${H * 0.08} ${W * 0.28},${H * 0.92} ${W * 0.08},${H * 0.92}"/>
      <polygon points="${W * 0.36},${H * 0.08} ${W * 0.54},${H * 0.08} ${W * 0.58},${H * 0.92} ${W * 0.32},${H * 0.92}"/>
      <polygon points="${W * 0.58},${H * 0.08} ${W * 0.78},${H * 0.08} ${W * 0.9},${H * 0.92} ${W * 0.62},${H * 0.92}"/>
    </g>`;
  } else {
    const cx = W / 2;
    const cy = H / 2;
    const rx = W * 0.46;
    const ry = H * 0.46;
    if (kind === "square") inner = `<rect x="${W * 0.08}" y="${H * 0.08}" width="${W * 0.84}" height="${H * 0.84}" fill="${ink}"${edge}/>`;
    else if (kind === "rounded_sq") {
      inner = `<rect x="${W * 0.08}" y="${H * 0.08}" width="${W * 0.84}" height="${H * 0.84}" rx="${Math.min(rx, ry) * 0.28}" fill="${ink}"${edge}/>`;
    } else if (kind === "diamond") inner = `<polygon points="${polygon(4, cx, cy, rx, ry, -45)}" fill="${ink}"${edge}/>`;
    else if (kind === "hexagon") inner = `<polygon points="${polygon(6, cx, cy, rx, ry)}" fill="${ink}"${edge}/>`;
    else if (kind === "pentagon") inner = `<polygon points="${polygon(5, cx, cy, rx, ry)}" fill="${ink}"${edge}/>`;
    else if (kind === "octagon") inner = `<polygon points="${polygon(8, cx, cy, rx, ry)}" fill="${ink}"${edge}/>`;
    else if (kind === "star") inner = `<polygon points="${starPoints(cx, cy, rx, ry)}" fill="${ink}"${edge}/>`;
    else inner = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${ink}"${edge}/>`;
  }
  if (face === "top") {
    inner += `<circle cx="${W / 2}" cy="${H * 0.1}" r="${Math.min(W, H) * 0.09}" fill="${ink}" stroke="#fff" stroke-width="${Math.min(W, H) * 0.012}" opacity="0.95"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" overflow="hidden" role="img">${inner}</svg>`;
}

const LITE_THUMB_MAX = 64;
const liteThumbs = new Map<string, string>();

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function libraryThumbSvg(template: LabelTemplate) {
  const spec = getDesignSpec(template.designType);
  if (spec.composite && template.state._composite) return compositeThumbSvg(template, template.state);
  return familyThumbSvg(template, template.state);
}

/** Cheap Library silhouette. Never loads /design-presets SVGs. Cached. */
export function libraryCardSrc(template: LabelTemplate) {
  const key = `v6|${template.id}|${template.labelMode}|${template.updatedAt}|${template.designType}|${String(template.state.cLabel || "")}`;
  const hit = liteThumbs.get(key);
  if (hit) return hit;
  const src = svgDataUrl(libraryThumbSvg(template));
  if (liteThumbs.size >= LITE_THUMB_MAX) {
    const oldest = liteThumbs.keys().next().value;
    if (oldest) liteThumbs.delete(oldest);
  }
  liteThumbs.set(key, src);
  return src;
}

/** @deprecated use libraryCardSrc — kept for any leftover inline SVG callers */
export function libraryCardSvg(template: LabelTemplate) {
  return libraryThumbSvg(template);
}

export function artboardCm(template: LabelTemplate) {
  return artboardOf(template, template.state);
}
