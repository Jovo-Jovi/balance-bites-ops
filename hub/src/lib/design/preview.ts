import { getDesignSpec } from "./specs";
import type { CompositePart, LabelState, LabelTemplate } from "./types";

function str(state: LabelState, key: string, fallback = "") {
  const v = state[key];
  return v == null || v === "" ? fallback : String(v);
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

function partShape(part: CompositePart) {
  const fill = part.color || "#2e7d32";
  const x = part.x;
  const y = part.y;
  const rx = part.w / 2;
  const ry = part.h / 2;
  const src = part.src || part.srcUrl || "";
  if (src && !src.startsWith("__asset__:")) {
    return `<image href="${esc(src)}" x="${x - rx}" y="${y - ry}" width="${part.w}" height="${part.h}" preserveAspectRatio="xMidYMid meet" />`;
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
  if (part.pathLocal) {
    const left = x - rx;
    const top = y - ry;
    return `<g transform="translate(${left} ${top}) scale(${part.w / 100} ${part.h / 100})"><path d="${esc(part.pathLocal)}" fill="${esc(fill)}" /></g>`;
  }
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${esc(fill)}" />`;
}

function outlineShape(kind: string, fill: string) {
  const c = esc(fill);
  if (kind === "square") {
    return `<rect x="12" y="12" width="76" height="76" fill="${c}" />`;
  }
  if (kind === "rounded_sq") {
    return `<rect x="12" y="12" width="76" height="76" rx="14" fill="${c}" />`;
  }
  if (kind === "diamond") return `<polygon points="${polygon(4, 50, 50, 38, 38, -45)}" fill="${c}" />`;
  if (kind === "hexagon") return `<polygon points="${polygon(6, 50, 50, 38, 38)}" fill="${c}" />`;
  if (kind === "pentagon") return `<polygon points="${polygon(5, 50, 50, 38, 38)}" fill="${c}" />`;
  if (kind === "octagon") return `<polygon points="${polygon(8, 50, 50, 38, 38)}" fill="${c}" />`;
  if (kind === "star") return `<polygon points="${starPoints(50, 50, 40, 40)}" fill="${c}" />`;
  return `<circle cx="50" cy="50" r="38" fill="${c}" />`;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

export function labelPreviewSvg(template: LabelTemplate, state: LabelState) {
  const spec = getDesignSpec(template.designType);
  const fill = str(state, "cLabel", "#2e7d32");
  const txt = str(state, "cTxtMain", "#ffffff");
  const brand = str(state, "eCBrand1", str(state, "eBrand", "BB"));
  const flavor = str(state, "eCFlavorTxt", str(state, "eName1", ""));
  const weight = str(state, "eWeight", "");
  const comp = state._composite;

  if (spec.composite && comp) {
    const bg = comp.bg || fill;
    const parts = [...(comp.parts || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
    const zones = [...(comp.zones || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
    const partMarkup = parts.map(partShape).join("");
    const zoneMarkup = zones
      .map((z) => {
        const color = z.color || comp.txt || txt;
        const text = esc(String(z.text || ""));
        const size = Math.max(3, Math.min(8, z.h * 0.45));
        return `<text x="${z.x}" y="${z.y}" text-anchor="middle" dominant-baseline="middle" fill="${esc(color)}" font-size="${size}" font-family="Tajawal, DM Sans, sans-serif">${text}</text>`;
      })
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img"><rect width="100" height="100" fill="${esc(bg)}" /><g>${partMarkup}${zoneMarkup}</g></svg>`;
  }

  const shape = spec.outline || (template.designType === "circular" ? "circle" : "rounded_sq");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img">
    ${outlineShape(shape, fill)}
    <text x="50" y="42" text-anchor="middle" fill="${esc(txt)}" font-size="7" font-family="Playfair Display, serif" font-weight="700">${esc(brand)}</text>
    <text x="50" y="56" text-anchor="middle" fill="${esc(txt)}" font-size="6" font-family="Tajawal, sans-serif">${esc(flavor)}</text>
    <text x="50" y="70" text-anchor="middle" fill="${esc(txt)}" font-size="3.6" font-family="DM Sans, sans-serif">${esc(weight)}</text>
  </svg>`;
}

export function artboardCm(state: LabelState) {
  const comp = state._composite?.artboard;
  const w = Number(comp?.wCm ?? state.cW ?? 8);
  const h = Number(comp?.hCm ?? state.cH ?? 8);
  return {
    wCm: Number.isFinite(w) && w > 0 ? w : 8,
    hCm: Number.isFinite(h) && h > 0 ? h : 8,
  };
}
