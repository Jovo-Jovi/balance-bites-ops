import { usableImage } from "./art";
import { iconInner } from "./icons";
import { getDesignSpec } from "./specs";
import type { CompositeBlob, CompositePart, CompositeZone, LabelStamp, LabelState, LabelTemplate } from "./types";

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
  const w = Math.max(10, Math.min(70, sz * 0.45));
  const xRaw = num(state, "sCProdX", circular ? 40 : 50);
  const yRaw = num(state, "sCProdY", circular ? 0 : 50);
  if (circular && xRaw === 40 && yRaw === 0) {
    return { x: 80, y: 48, w, h: w };
  }
  return { x: xRaw || 50, y: yRaw || 50, w, h: w };
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

function partBorderWidth(part: CompositePart) {
  if (part.borderWidth != null && part.borderWidth !== "") {
    const n = Number(part.borderWidth);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (part.type === "silhouette") return 0;
  return 1.2;
}

function partLocalGroup(part: CompositePart, inner: string) {
  const left = part.x - part.w / 2;
  const top = part.y - part.h / 2;
  const rot = part.rot ? ` transform="rotate(${part.rot} ${part.x} ${part.y})"` : "";
  const bw = partBorderWidth(part);
  const stroke =
    bw > 0 && part.pathLocal
      ? `<path d="${esc(part.pathLocal)}" fill="none" stroke="${esc(part.borderColor || "#1a1a1a")}" stroke-width="${bw}" stroke-linejoin="round" stroke-linecap="round"/>`
      : "";
  return `<g${rot}><g transform="translate(${left} ${top}) scale(${part.w / 100} ${part.h / 100})">${inner}${stroke}</g></g>`;
}

function partShape(part: CompositePart, lite = false) {
  const fill = part.color || "#2e7d32";
  const x = part.x;
  const y = part.y;
  const rx = part.w / 2;
  const ry = part.h / 2;
  const src = lite ? "" : usableImage(part.src || part.srcUrl, part.artKey);
  const wantImage = Boolean(src) && part.showImage === true;
  if (wantImage) {
    return partLocalGroup(
      part,
      `<image href="${esc(src)}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />`,
    );
  }
  if (part.pathLocal) {
    return partLocalGroup(part, `<path d="${esc(part.pathLocal)}" fill="${esc(fill)}" />`);
  }
  const t = part.type;
  if (t === "circle" || t === "oval") {
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${esc(fill)}" />`;
  }
  if (t === "square" || t === "rectangle" || t === "rounded_sq" || t === "rounded_rect") {
    const rr = t.startsWith("rounded") ? Math.min(rx, ry) * 0.22 : 0;
    return `<rect x="${x - rx}" y="${y - ry}" width="${part.w}" height="${part.h}" rx="${rr}" fill="${esc(fill)}" />`;
  }
  if (t === "diamond") return `<polygon points="${polygon(4, x, y, rx, ry, -45)}" fill="${esc(fill)}" />`;
  if (t === "hexagon") return `<polygon points="${polygon(6, x, y, rx, ry)}" fill="${esc(fill)}" />`;
  if (t === "pentagon") return `<polygon points="${polygon(5, x, y, rx, ry)}" fill="${esc(fill)}" />`;
  if (t === "octagon") return `<polygon points="${polygon(8, x, y, rx, ry)}" fill="${esc(fill)}" />`;
  if (t === "star") return `<polygon points="${starPoints(x, y, rx, ry)}" fill="${esc(fill)}" />`;
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${esc(fill)}" />`;
}

function outlineShape(kind: string, fill: string) {
  const c = esc(fill);
  if (kind === "square") return `<rect x="8" y="8" width="84" height="84" fill="${c}" />`;
  if (kind === "rounded_sq") return `<rect x="8" y="8" width="84" height="84" rx="14" fill="${c}" />`;
  if (kind === "diamond") return `<polygon points="${polygon(4, 50, 50, 42, 42, -45)}" fill="${c}" />`;
  if (kind === "hexagon") return `<polygon points="${polygon(6, 50, 50, 44, 44)}" fill="${c}" />`;
  if (kind === "pentagon") return `<polygon points="${polygon(5, 50, 50, 44, 44)}" fill="${c}" />`;
  if (kind === "octagon") return `<polygon points="${polygon(8, 50, 50, 44, 44)}" fill="${c}" />`;
  if (kind === "star") return `<polygon points="${starPoints(50, 50, 44, 44)}" fill="${c}" />`;
  if (kind === "rect") return `<rect x="4" y="18" width="92" height="78" rx="3" fill="${c}" />`;
  if (kind === "taper") return `<polygon points="14,16 86,16 100,96 0,96" fill="${c}" />`;
  return `<circle cx="50" cy="50" r="48" fill="${c}" />`;
}

function familyClipKind(designType: string, outline: string | null) {
  if (designType === "taper_top") return "taper";
  if (designType === "rect_top") return "rect";
  return outline || (designType === "circular" ? "circle" : "rounded_sq");
}

function topLid(fill: string) {
  const c = esc(fill);
  return `<circle cx="50" cy="10" r="9" fill="${c}" /><circle cx="50" cy="10" r="4" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.45" />`;
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
  const left = x - w / 2;
  const top = y - h / 2;
  const body = `<svg x="${left}" y="${top}" width="${w}" height="${h}" viewBox="0 0 24 24">${inner}</svg>`;
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
    if (lite) return "";
    const src = usableImage(z.src || z.srcUrl);
    if (!src) return "";
    const left = z.x - z.w / 2;
    const top = z.y - z.h / 2;
    return `<image href="${esc(src)}" x="${left}" y="${top}" width="${z.w}" height="${z.h}" preserveAspectRatio="xMidYMid meet" />`;
  }
  if (z.kind === "logo") {
    const r = Math.min(z.w, z.h) / 2;
    const fill = z.color || "#ffffff";
    const ink = z.textColor || "#1a1a1a";
    const fs = Math.max(3, r * (z.fontScale || 0.7));
    const family = z.fontFamily || fontOf(state, ["fntHead", "fntH"], "Bitter, serif");
    return `<g>
      <circle cx="${z.x}" cy="${z.y}" r="${r}" fill="${esc(fill)}" />
      <text x="${z.x}" y="${z.y}" text-anchor="middle" dominant-baseline="middle" fill="${esc(ink)}" font-size="${fs}" font-weight="700" font-family="${esc(family)}">${esc(String(z.text || "BB"))}</text>
    </g>`;
  }
  const lines = String(z.text || "").split("\n");
  const color = z.color || z.textColor || fallback;
  const size = Math.max(2.2, Math.min(10, z.h / Math.max(lines.length, 1) * 0.7));
  const startY = z.y - ((lines.length - 1) * size * 0.55);
  const family = z.fontFamily || fontOf(state, ["fntBody", "fntB", "fntArabic", "fntAr"], "Montserrat, Tajawal, sans-serif");
  const weight = z.fontWeight || "700";
  const plate = z.fill && z.fill !== "none"
    ? `<rect x="${z.x - z.w / 2}" y="${z.y - z.h / 2}" width="${z.w}" height="${z.h}" rx="${Math.min(z.w, z.h) * 0.12}" fill="${esc(z.fill)}" />`
    : "";
  const text = lines
    .map(
      (line, i) =>
        `<text x="${z.x}" y="${startY + i * size * 1.12}" text-anchor="middle" dominant-baseline="middle" fill="${esc(color)}" font-size="${size}" font-weight="${esc(weight)}" font-family="${esc(family)}">${esc(line)}</text>`,
    )
    .join("");
  return `${plate}${text}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export const CUT_STROKE_MM = 0.25;
export const CUT_STROKE_COLOR = "#FF00FF";

export type LabelPreviewOpts = { showCut?: boolean; lite?: boolean };

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

function cutOverlayMm(template: LabelTemplate, state: LabelState, wMm: number, hMm: number) {
  const stroke = cutStrokeOf(state);
  if (stroke.mm <= 0) return "";
  const spec = getDesignSpec(template.designType);
  const geom =
    spec.composite && state._composite
      ? compositeCutMm(state._composite, wMm, hMm)
      : familyCutMm(familyClipKind(template.designType, spec.outline), wMm, hMm);
  return `<g fill="none" stroke="${esc(stroke.color)}" stroke-width="${stroke.mm}" stroke-linejoin="round" stroke-linecap="round">${geom}</g>`;
}

function wrapPreviewSvg(inner: string, template: LabelTemplate, state: LabelState, opts?: LabelPreviewOpts) {
  if (!opts?.showCut) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" role="img">${inner}</svg>`;
  }
  const { wCm, hCm } = artboardCm(state, template.designType);
  const wMm = wCm * 10;
  const hMm = hCm * 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wMm} ${hMm}" preserveAspectRatio="none" width="100%" height="100%" role="img">
    <svg viewBox="0 0 100 100" x="0" y="0" width="${wMm}" height="${hMm}" preserveAspectRatio="none">${inner}</svg>
    ${cutOverlayMm(template, state, wMm, hMm)}
  </svg>`;
}

export function labelPreviewSvg(template: LabelTemplate, state: LabelState, opts?: LabelPreviewOpts) {
  const spec = getDesignSpec(template.designType);
  const lite = Boolean(opts?.lite);
  const fill = str(state, "cLabel", "#2e7d32");
  const txt = str(state, "cTxtMain", "#ffffff");
  const brand = str(state, "eCBrand1", str(state, "eBrand", "BB"));
  const flavor = str(state, "eCFlavorTxt", str(state, "eName1", ""));
  const name2 = str(state, "eName2", "");
  const weight = str(state, "eWeight", "");
  const heading = fontOf(state, ["fntHead", "fntH"], "Playfair Display, serif");
  const body = fontOf(state, ["fntBody", "fntB"], "DM Sans, sans-serif");
  const arabic = fontOf(state, ["fntArabic", "fntAr"], "Tajawal, sans-serif");
  const flavorFont = /[\u0600-\u06FF]/.test(flavor) ? arabic : body;
  const name2Font = /[\u0600-\u06FF]/.test(name2) ? arabic : body;
  const comp = state._composite;
  const clipId = clipIdOf(template);
  const stamps = lite ? [] : [...(state._stamps || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  const stampMarkup = stamps
    .map((s: LabelStamp) =>
      iconMark(s.iconId, s.x, s.y, s.w, s.h, s.color || txt, s.strokeWidth ?? 2, s.rot, s.letterStyle),
    )
    .join("");

  if (spec.composite && comp) {
    const parts = [...(comp.parts || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
    const zones = [...(comp.zones || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
    const exactArt = parts.some((p) => p.showImage);
    const boardFill =
      lite || !exactArt ? `<rect width="100" height="100" fill="${esc(comp.bg || fill)}" />` : "";
    const inner = `
      <defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${compositeClip(comp)}</clipPath></defs>
      <g clip-path="url(#${clipId})">
        ${boardFill}
        ${bgLayers(state, lite)}
        ${parts.map((p) => partShape(p, lite)).join("")}
        ${productLayer(state, false, lite)}
        ${zones.map((z) => zoneMarkup(z, comp.txt || txt, state, lite)).join("")}
        ${stampMarkup}
        ${qrLayer(state, lite)}
      </g>`;
    return wrapPreviewSvg(inner, template, state, opts);
  }

  const clipKind = familyClipKind(template.designType, spec.outline);
  const wrap = outlineShape(clipKind, fill);
  const lid = clipKind === "taper" || clipKind === "rect" ? topLid(fill) : "";
  const yBrand = clipKind === "taper" || clipKind === "rect" ? 44 : 38;
  const yFlavor = clipKind === "taper" || clipKind === "rect" ? 56 : 52;
  const yName2 = clipKind === "taper" || clipKind === "rect" ? 68 : 64;
  const yWeight = clipKind === "taper" || clipKind === "rect" ? (name2 ? 80 : 72) : name2 ? 78 : 70;
  const name2Box = name2
    ? `<rect x="18" y="${yName2 - 5}" width="64" height="10" rx="2" fill="${esc(str(state, "cName2Bg", "#473929"))}" />
      <text x="50" y="${yName2}" text-anchor="middle" dominant-baseline="middle" fill="${esc(str(state, "cName2Txt", txt))}" font-size="4.2" font-family="${esc(name2Font)}" font-weight="700">${esc(name2)}</text>`
    : "";
  const inner = `
    <defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${wrap}</clipPath></defs>
    ${lid}
    <g clip-path="url(#${clipId})">
      ${wrap}
      ${bgLayers(state, lite)}
      ${productLayer(state, template.designType === "circular", lite)}
      <text x="50" y="${yBrand}" text-anchor="middle" fill="${esc(txt)}" font-size="7" font-family="${esc(heading)}" font-weight="700">${esc(brand)}</text>
      <text x="50" y="${yFlavor}" text-anchor="middle" fill="${esc(txt)}" font-size="5.4" font-family="${esc(flavorFont)}">${esc(flavor)}</text>
      ${name2Box}
      <text x="50" y="${yWeight}" text-anchor="middle" fill="${esc(txt)}" font-size="3.4" font-family="${esc(body)}">${esc(weight)}</text>
      ${stampMarkup}
      ${qrLayer(state, lite)}
    </g>`;
  return wrapPreviewSvg(inner, template, state, opts);
}

export function artboardCm(state: LabelState, designType?: string) {
  const type = String(designType || state._designType || "");
  const comp = state._composite?.artboard;
  const w = Number(comp?.wCm ?? state.cW);
  const h = Number(comp?.hCm ?? state.cH);
  if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
    return { wCm: w, hCm: h };
  }
  if (type === "taper_top") return { wCm: 10, hCm: 7 };
  if (type === "rect_top") return { wCm: 8, hCm: 5 };
  return { wCm: 6, hCm: 6 };
}
