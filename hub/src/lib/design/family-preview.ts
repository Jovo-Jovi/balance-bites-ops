import { usableImage } from "./art";
import { getDesignSpec } from "./specs";
import {
  PPC,
  artboardOf,
  backPx,
  backSections,
  calcTaper,
  flag,
  n,
  previewFace,
  s,
  taperSectors,
  topPx,
  circlePx,
  topStackLayout,
} from "./layout";
import { fillOf, inkOf, logoDiscFace, mutOf, sectionBox, sectionHtml } from "./section-html";
import { getIcon, iconInner } from "./icons";
import type { LabelState, LabelTemplate } from "./types";

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
function html(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function font(state: LabelState, key: string, fallback: string) {
  return s(state, key, fallback).replace(/^['"]+|['"]+$/g, "") || fallback;
}
function safeId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "") || "x";
}

function regularPoly(sides: number, cx: number, cy: number, rx: number, ry: number, rotationDeg = 0) {
  const rot = (rotationDeg * Math.PI) / 180;
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(`${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function starPoly(cx: number, cy: number, rox: number, roy: number, rix: number, riy: number, rotationDeg = 0) {
  const nPts = 5;
  const rot = (rotationDeg * Math.PI) / 180;
  const pts: string[] = [];
  for (let i = 0; i < nPts * 2; i++) {
    const ox = i % 2 === 0 ? rox : rix;
    const oy = i % 2 === 0 ? roy : riy;
    const a = rot + (Math.PI * i) / nPts - Math.PI / 2;
    pts.push(`${cx + ox * Math.cos(a)},${cy + oy * Math.sin(a)}`);
  }
  return pts.join(" ");
}

export function circleShape(state: LabelState, specOutline: string | null) {
  const raw = s(state, "cShape", specOutline || "circle").toLowerCase();
  return raw === "round" ? "circle" : raw || "circle";
}

function outlineGeomPx(kind: string, W: number, H: number, radiusPx = 0) {
  const cx = W / 2;
  const cy = H / 2;
  const rx = W / 2;
  const ry = H / 2;
  const rr = Math.max(radiusPx, kind === "rounded_sq" ? 18 : 0);
  if (kind === "square") return `<rect x="0" y="0" width="${W}" height="${H}" rx="${radiusPx}" />`;
  if (kind === "rounded_sq") return `<rect x="0" y="0" width="${W}" height="${H}" rx="${rr}" />`;
  if (kind === "diamond") return `<polygon points="${regularPoly(4, cx, cy, rx, ry, 45)}" />`;
  if (kind === "hexagon") return `<polygon points="${regularPoly(6, cx, cy, rx, ry)}" />`;
  if (kind === "pentagon") return `<polygon points="${regularPoly(5, cx, cy, rx, ry)}" />`;
  if (kind === "octagon") return `<polygon points="${regularPoly(8, cx, cy, rx * 0.96, ry * 0.96, 22.5)}" />`;
  if (kind === "star") return `<polygon points="${starPoly(cx, cy, rx, ry, W * 0.22, H * 0.22)}" />`;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`;
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rr <= 0) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  return `M ${x + rr} ${y} H ${x + w - rr} A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V ${y + h - rr} A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} H ${x + rr} A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr} V ${y + rr} A ${rr} ${rr} 0 0 1 ${x + rr} ${y} Z`;
}

function polyPath(pts: string) {
  const pairs = pts.trim().split(/\s+/).filter(Boolean);
  if (!pairs.length) return "";
  return `${pairs.map((p, i) => `${i ? "L" : "M"}${p.replace(",", " ")}`).join(" ")} Z`;
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

function outlinePathD(kind: string, W: number, H: number, radiusPx = 0) {
  const cx = W / 2;
  const cy = H / 2;
  const rx = W / 2;
  const ry = H / 2;
  const rr = Math.max(radiusPx, kind === "rounded_sq" ? 18 : 0);
  if (kind === "square") return roundedRectPath(0, 0, W, H, radiusPx);
  if (kind === "rounded_sq") return roundedRectPath(0, 0, W, H, rr);
  if (kind === "diamond") return polyPath(regularPoly(4, cx, cy, rx, ry, 45));
  if (kind === "hexagon") return polyPath(regularPoly(6, cx, cy, rx, ry));
  if (kind === "pentagon") return polyPath(regularPoly(5, cx, cy, rx, ry));
  if (kind === "octagon") return polyPath(regularPoly(8, cx, cy, rx * 0.96, ry * 0.96, 22.5));
  if (kind === "star") return polyPath(starPoly(cx, cy, rx, ry, W * 0.22, H * 0.22));
  return ellipsePath(cx, cy, rx, ry);
}

export type FamilyDieView = {
  minX: number;
  minY: number;
  vbW: number;
  vbH: number;
  d: string;
};

/** Die path in the same user space as `familyPreviewSvg` (pixel viewBox, not 0–100). */
export function familyDieView(template: LabelTemplate, state: LabelState): FamilyDieView {
  const face = previewFace(template);
  if (face === "taper") {
    const g = calcTaper(state);
    const half = g.arcDeg / 2;
    return {
      minX: g.minX,
      minY: g.minY,
      vbW: g.vbW,
      vbH: g.vbH,
      d: sectorPath(g.cx, g.cy, g.R1, g.R2, -half, half),
    };
  }
  if (face === "circle") {
    const { W, H } = circlePx(state);
    const spec = getDesignSpec(template.designType);
    const shape = circleShape(state, spec.outline);
    return {
      minX: 0,
      minY: 0,
      vbW: W,
      vbH: H,
      d: outlinePathD(shape, W, H, n(state, "sCRadius", 0)),
    };
  }
  if (face === "top") {
    const { W, H } = topPx(state);
    const shapeRaw = s(state, "tShape", "round").toLowerCase();
    const shape = shapeRaw === "round" ? "circle" : shapeRaw;
    return { minX: 0, minY: 0, vbW: W, vbH: H, d: outlinePathD(shape, W, H) };
  }
  const { W, H } = backPx(state);
  return { minX: 0, minY: 0, vbW: W, vbH: H, d: `M 0 0 H ${W} V ${H} H 0 Z` };
}

const PRINT_STYLE = `<style type="text/css"><![CDATA[
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=DM+Sans:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@400;700&family=Fredoka:wght@500;600;700&family=Baloo+2:wght@600;700;800&family=Nunito:wght@700;800;900&family=Bubblegum+Sans&family=Sniglet:wght@400;800&family=Bitter:ital,wght@0,400;0,700&display=swap");
*{color-interpolation:sRGB;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;forced-color-adjust:none!important;}
foreignObject,div,span,img,svg,circle,rect,text{color-adjust:exact!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
]]></style>`;

function svgDoc(
  viewBox: string,
  inner: string,
  opts?: { wCm?: number; hCm?: number; printCss?: boolean; padPx?: number },
) {
  const physical = Boolean(opts?.wCm && opts?.hCm);
  const size = physical ? `width="${opts!.wCm}cm" height="${opts!.hCm}cm"` : `width="100%" height="100%"`;
  const par = physical ? "none" : "xMidYMid meet";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="${par}" ${size} overflow="visible" color-interpolation="sRGB" role="img">${opts?.printCss ? PRINT_STYLE : ""}${inner}</svg>`;
}

function cutStroke(state: LabelState) {
  const raw = Number(state.sCutStrokeMm);
  const mm = Number.isFinite(raw) ? raw : 0.25;
  const clamped = Math.max(0, Math.min(8, mm));
  return { px: clamped * (PPC / 10), color: s(state, "cCutStroke", "#FF00FF") };
}

function pinBox(
  parentW: number,
  parentH: number,
  cxPct: number,
  cyPct: number,
  w: number,
  h: number,
  tx: number,
  ty: number,
  rot: number,
  extra: string,
  inner: string,
) {
  const x = (cxPct / 100) * parentW - w / 2 + tx;
  const y = (cyPct / 100) * parentH - h / 2 + ty;
  const xf = rot ? `transform:rotate(${rot}deg);transform-origin:center;` : "";
  return `<div style="position:absolute;left:${x}px;top:${y}px;right:auto;width:${w}px;height:${h}px;box-sizing:border-box;direction:ltr;unicode-bidi:isolate;${xf}${extra}">${inner}</div>`;
}

function htmlShapeStyle(kind: string, radiusPx = 0) {
  if (kind === "square") return `border-radius:${radiusPx}px;overflow:hidden`;
  if (kind === "rounded_sq") return `border-radius:${Math.max(radiusPx, 18)}px;overflow:hidden`;
  if (kind === "diamond") return `clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);overflow:hidden`;
  if (kind === "hexagon") return `clip-path:polygon(50% 0%,93.3% 25%,93.3% 75%,50% 100%,6.7% 75%,6.7% 25%);overflow:hidden`;
  if (kind === "pentagon") return `clip-path:polygon(50% 0%,100% 38.2%,80.9% 100%,19.1% 100%,0% 38.2%);overflow:hidden`;
  if (kind === "octagon") return `clip-path:polygon(29.3% 2%,70.7% 2%,98% 29.3%,98% 70.7%,70.7% 98%,29.3% 98%,2% 70.7%,2% 29.3%);overflow:hidden`;
  if (kind === "star")
    return `clip-path:polygon(50% 0%,61.8% 35.4%,98.2% 35.4%,68.2% 57.3%,79.4% 90.9%,50% 69.1%,20.6% 90.9%,31.8% 57.3%,1.8% 35.4%,38.2% 35.4%);overflow:hidden`;
  return `border-radius:50%;overflow:hidden`;
}

function stampLayer(state: LabelState, minX: number, minY: number, vbW: number, vbH: number) {
  const stamps = state._stamps || [];
  if (!stamps.length || !(vbW > 0) || !(vbH > 0)) return "";
  return stamps
    .map((st) => {
      const inner = iconInner(st.iconId, st.color || "#c9a84c", st.strokeWidth ?? 2, st.letterStyle);
      if (!inner) return "";
      const cx = minX + (st.x / 100) * vbW;
      const cy = minY + (st.y / 100) * vbH;
      const side = Math.max(4, Math.min((st.w / 100) * vbW, (st.h / 100) * vbH));
      const vb = getIcon(st.iconId)?.viewBox || "0 0 24 24";
      const body = `<svg x="${cx - side / 2}" y="${cy - side / 2}" width="${side}" height="${side}" viewBox="${esc(vb)}" preserveAspectRatio="xMidYMid meet" overflow="visible">${inner}</svg>`;
      return st.rot ? `<g transform="rotate(${st.rot} ${cx} ${cy})">${body}</g>` : body;
    })
    .join("");
}

function framed(
  state: LabelState,
  showCut: boolean,
  minX: number,
  minY: number,
  vbW: number,
  vbH: number,
  geom: string,
  painted: string,
  svgOpts: { wCm?: number; hCm?: number; printCss?: boolean; padPx?: number },
) {
  const stroke = cutStroke(state);
  const pad = showCut && stroke.px > 0 ? svgOpts.padPx ?? 0 : 0;
  const under =
    showCut && stroke.px > 0
      ? `<g fill="none" stroke="${esc(stroke.color)}" stroke-width="${stroke.px * 2}" stroke-linejoin="round" stroke-linecap="round">${geom}</g>`
      : "";
  return svgDoc(`${minX - pad} ${minY - pad} ${vbW + 2 * pad} ${vbH + 2 * pad}`, `${under}${painted}`, svgOpts);
}

function sectorPath(cx: number, cy: number, R1: number, R2: number, startDeg: number, endDeg: number) {
  const sr = (startDeg * Math.PI) / 180;
  const er = (endDeg * Math.PI) / 180;
  const la = endDeg - startDeg > 180 ? 1 : 0;
  const x1o = cx + R1 * Math.sin(sr);
  const y1o = cy - R1 * Math.cos(sr);
  const x2o = cx + R1 * Math.sin(er);
  const y2o = cy - R1 * Math.cos(er);
  const x1i = cx + R2 * Math.sin(er);
  const y1i = cy - R2 * Math.cos(er);
  const x2i = cx + R2 * Math.sin(sr);
  const y2i = cy - R2 * Math.cos(sr);
  return `M ${x1o} ${y1o} A ${R1} ${R1} 0 ${la} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${R2} ${R2} 0 ${la} 0 ${x2i} ${y2i} Z`;
}

function drawCircle(
  template: LabelTemplate,
  state: LabelState,
  lite: boolean,
  showCut: boolean,
  svgOpts: { wCm?: number; hCm?: number; printCss?: boolean; padPx?: number },
) {
  const spec = getDesignSpec(template.designType);
  const { W, H } = circlePx(state);
  const shape = circleShape(state, spec.outline);
  const fill = fillOf(state);
  const ink = inkOf(state);
  const flavor = s(state, "cCFlavorClr", "#1a1a1a");
  const fh = font(state, "fntHeading", "Montserrat");
  const fb = font(state, "fntBody", "DM Sans");
  const fWH = s(state, "fWHead", "700");
  const clipId = `bbfam-${safeId(template.id)}`;
  const radius = n(state, "sCRadius", 0);
  const ring = s(state, "tLogoCircleStyle", "full") === "ring";
  const thick = n(state, "tLogoCircleThick", 1.5);
  const logoSz = n(state, "sCLogoSz", 45);
  const logoFS = logoSz * 0.45;
  const pSz = n(state, "sCProdSz", 80);
  const pSc = n(state, "sCProdScale", 1);
  const pPct = W ? (pSz / W) * 100 : 0;
  const photo = lite ? "" : usableImage(state.hxCProd);
  const qr = lite ? "" : usableImage(state.hxQr);
  const qrSz = n(state, "sCQRSize", 26);
  const wtShow = s(state, "eWeight", "30 gm").replace(/^net\s*weight\s*:?\s*/i, "");
  const d1 = flag(state, "bCShowDate1", true) ? s(state, "eCDate1") : "";
  const d2 = flag(state, "bCShowDate2", true) ? s(state, "eCDate2") : "";
  const botX = n(state, "sCBotX", 0);
  const botY = n(state, "sCBotY", 0);
  const brandW = n(state, "sCBrandW", 160);
  const brandH = n(state, "sCBrandH", 52);
  const flavorW = n(state, "sCFlavorW", 140);
  const flavorH = n(state, "sCFlavorH", 60);
  const wtW = n(state, "sCWtW", 90);
  const wtH = n(state, "sCWtH", 44);
  const dateW = n(state, "sCDateW", 100);
  const dateH = n(state, "sCDateH", 70);

  const body = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px;position:relative;box-sizing:border-box;direction:ltr;unicode-bidi:isolate;background:transparent;color:${esc(ink)};font-family:${esc(fh)},sans-serif;${htmlShapeStyle(shape, radius)};-webkit-print-color-adjust:exact;print-color-adjust:exact">
    ${pinBox(W, H, 50, 10, logoSz, logoSz, n(state, "sCLogoX", 0), n(state, "sCLogoY", 0), n(state, "sCLogoRot", 0), "z-index:5;overflow:hidden;", logoDiscFace(logoSz, ring, thick, ink, ring ? ink : fill, s(state, "tLogoTxt", "BB"), fh, logoFS))}
    ${
      s(state, "eCBrand1") || s(state, "eCBrand2")
        ? pinBox(
            W,
            H,
            50,
            28,
            brandW,
            brandH,
            n(state, "sCBrandX", 0),
            n(state, "sCBrandY", 0),
            n(state, "sCBrandRot", 0),
            `z-index:4;text-align:center;font-weight:${esc(fWH)};font-size:${n(state, "sCBrandFS", 20)}px;line-height:1.05;letter-spacing:.5px;color:${esc(ink)};display:flex;flex-direction:column;align-items:center;justify-content:center;`,
            `${s(state, "eCBrand1") ? `<div>${html(s(state, "eCBrand1"))}</div>` : ""}${s(state, "eCBrand2") ? `<div>${html(s(state, "eCBrand2"))}</div>` : ""}`,
          )
        : ""
    }
    ${pinBox(
      W,
      H,
      50,
      52,
      flavorW,
      flavorH,
      n(state, "sCFlavorX", 0),
      n(state, "sCFlavorY", 0),
      n(state, "sCFlavorRot", 0),
      `z-index:3;text-align:left;padding:2px 5px;display:flex;flex-direction:column;justify-content:center;`,
      `${s(state, "eCProdName") ? `<div style="font-weight:${esc(fWH)};font-size:${n(state, "sCProdNameFS", 12)}px;color:${esc(flavor)};text-transform:uppercase;letter-spacing:1px;margin-bottom:1px;line-height:1.1">${html(s(state, "eCProdName"))}</div>` : ""}${
        s(state, "eCFlavorTxt")
          ? `<div style="font-weight:900;font-size:${n(state, "sCFlavorFS", 14)}px;color:${esc(flavor)};text-transform:uppercase;letter-spacing:.5px;line-height:1.1">${html(s(state, "eCFlavorTxt"))}</div>`
          : ""
      }`,
    )}
    ${
      photo
        ? pinBox(
            W,
            H,
            92 - pPct / 2,
            52,
            pSz,
            pSz,
            n(state, "sCProdX", 0),
            n(state, "sCProdY", 0),
            n(state, "sCProdRot", 0),
            "z-index:4;",
            `<img src="${esc(photo)}" style="width:100%;height:100%;object-fit:contain;transform:scale(${pSc});transform-origin:center" alt=""/>`,
          )
        : ""
    }
    ${pinBox(W, H, 50, 68, W * 0.75, 1, botX, botY, 0, `background:${esc(flavor)};opacity:.4;z-index:2;`, "")}
    ${pinBox(
      W,
      H,
      28,
      84,
      wtW,
      wtH,
      n(state, "sCWtX", 0) + botX,
      n(state, "sCWtY", 0) + botY,
      n(state, "sCWtRot", 0),
      "z-index:2;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;",
      `<div style="font-family:${esc(fb)},sans-serif;font-size:${n(state, "sCWtFS", 8) * 0.7}px;color:${esc(flavor)};text-transform:uppercase;letter-spacing:.5px;opacity:.8">NET WEIGHT</div>
       <div style="font-weight:700;font-size:${n(state, "sCWtFS", 8)}px;color:${esc(flavor)}">${html(wtShow)}</div>`,
    )}
    ${pinBox(
      W,
      H,
      72,
      84,
      dateW,
      dateH,
      n(state, "sCDateX", 0) + botX,
      n(state, "sCDateY", 0) + botY,
      n(state, "sCDateRot", 0),
      "z-index:2;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:1px;padding:2px;",
      `${d1 ? `<div style="font-family:${esc(fb)},sans-serif;font-size:${n(state, "sCDateFS", 6)}px;color:${esc(flavor)};opacity:.9;line-height:1">${html(d1)}</div>` : ""}
       ${d2 ? `<div style="font-family:${esc(fb)},sans-serif;font-size:${n(state, "sCDateFS", 6)}px;color:${esc(flavor)};opacity:.9;line-height:1">${html(d2)}</div>` : ""}
       ${qr ? `<div style="width:${qrSz}px;height:${qrSz}px;background:#fff;padding:1px;border-radius:2px;margin-top:2px;transform:translate(${n(state, "sCQRX", 0)}px,${n(state, "sCQRY", 0)}px)"><img src="${esc(qr)}" style="width:100%;height:100%;object-fit:contain" alt=""/></div>` : ""}`,
    )}
  </div>`;

  const geom = outlineGeomPx(shape, W, H, radius);
  const painted = `<defs><clipPath id="${clipId}">${geom}</clipPath></defs>
    <g clip-path="url(#${clipId})">
      <g fill="${esc(fill)}">${geom}</g>
      <foreignObject x="0" y="0" width="${W}" height="${H}" overflow="hidden">${body}</foreignObject>
      ${stampLayer(state, 0, 0, W, H)}
    </g>`;
  return framed(state, showCut, 0, 0, W, H, geom, painted, svgOpts);
}

function drawTop(
  template: LabelTemplate,
  state: LabelState,
  showCut: boolean,
  svgOpts: { wCm?: number; hCm?: number; printCss?: boolean; padPx?: number },
) {
  const fill = fillOf(state);
  const ink = inkOf(state);
  const sub = mutOf(state);
  const fh = font(state, "fntHeading", "Montserrat");
  const fWH = s(state, "fWHead", "700");
  const fWB = s(state, "fWBody", "400");
  const shapeRaw = s(state, "tShape", "round").toLowerCase();
  const shape = shapeRaw === "round" ? "circle" : shapeRaw;
  const clipId = `bbtop-${safeId(template.id)}`;
  const ring = s(state, "tLogoCircleStyle", "full") === "ring";
  const thick = n(state, "tLogoCircleThick", 1.5);
  const stack = topStackLayout(state);
  const { W, H } = stack;
  const restX = (cx: number) => (W ? (cx / W) * 100 : 50);
  const restY = (cy: number) => (H ? (cy / H) * 100 : 50);
  const logoBlock = stack.logo
    ? pinBox(
        W,
        H,
        restX(stack.logo.cx),
        restY(stack.logo.cy),
        stack.logo.w,
        stack.logo.h,
        n(state, "sTLogoX", 0),
        n(state, "sTLogoY", 0),
        n(state, "sTLogoRot", 0),
        "z-index:3;overflow:hidden;",
        logoDiscFace(stack.logo.w, ring, thick, ink, ring ? ink : fill, s(state, "tLogoTxt"), fh, n(state, "sTLogoFS", 15)),
      )
    : "";
  const titleBlock = stack.title
    ? pinBox(
        W,
        H,
        restX(stack.title.cx),
        restY(stack.title.cy),
        stack.title.w,
        stack.title.h,
        n(state, "sTTitleX", 0),
        n(state, "sTTitleY", 0),
        n(state, "sTTitleRot", 0),
        `z-index:2;text-align:center;font-weight:${esc(fWH)};font-size:${n(state, "sTTitleFS", 20)}px;line-height:1.1;letter-spacing:.5px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:visible;`,
        `${s(state, "tTitle1") ? `<div>${html(s(state, "tTitle1"))}</div>` : ""}${s(state, "tTitle2") ? `<div>${html(s(state, "tTitle2"))}</div>` : ""}`,
      )
    : "";
  const subBlock = stack.sub
    ? pinBox(
        W,
        H,
        restX(stack.sub.cx),
        restY(stack.sub.cy),
        stack.sub.w,
        stack.sub.h,
        n(state, "sTSubX", 0),
        n(state, "sTSubY", 0),
        n(state, "sTSubRot", 0),
        `z-index:2;text-align:center;font-weight:${esc(fWB)};font-size:${n(state, "sTSubFS", 7)}px;line-height:1.2;color:${esc(sub)};display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:visible;`,
        `${s(state, "tSub1") ? `<div>${html(s(state, "tSub1"))}</div>` : ""}${s(state, "tSub2") ? `<div>${html(s(state, "tSub2"))}</div>` : ""}`,
      )
    : "";
  const body = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px;background:transparent;color:${esc(ink)};position:relative;box-sizing:border-box;direction:ltr;unicode-bidi:isolate;font-family:${esc(fh)},sans-serif;${htmlShapeStyle(shape)};-webkit-print-color-adjust:exact;print-color-adjust:exact">${logoBlock}${titleBlock}${subBlock}</div>`;
  const geom = outlineGeomPx(shape, W, H);
  const painted = `<defs><clipPath id="${clipId}">${geom}</clipPath></defs>
    <g clip-path="url(#${clipId})">
      <g fill="${esc(fill)}">${geom}</g>
      <foreignObject x="0" y="0" width="${W}" height="${H}" overflow="hidden">${body}</foreignObject>
      ${stampLayer(state, 0, 0, W, H)}
    </g>`;
  return framed(state, showCut, 0, 0, W, H, geom, painted, svgOpts);
}

function drawBack(
  template: LabelTemplate,
  state: LabelState,
  lite: boolean,
  showCut: boolean,
  svgOpts: { wCm?: number; hCm?: number; printCss?: boolean; padPx?: number },
) {
  const { W, H } = backPx(state);
  const fill = fillOf(state);
  const uid = `bk-${safeId(template.id)}`;
  const secs = backSections(state, W);
  const clips: string[] = [];
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${esc(fill)}" />`];
  for (const sec of secs) {
    const clip = `${uid}c${sec.k}`;
    clips.push(`<clipPath id="${clip}"><rect x="${sec.l}" y="0" width="${sec.w}" height="${H}" /></clipPath>`);
    const href = lite ? "" : usableImage(state[`hxBg${sec.k}`]);
    if (href) {
      const o = n(state, `sOpa${sec.k}`, 0.5);
      const z = Math.max(0.05, n(state, `sZoom${sec.k}`, 100) / 100);
      const cx = sec.l + sec.w / 2;
      const cy = H / 2;
      parts.push(
        `<g clip-path="url(#${clip})"><g transform="translate(${cx} ${cy}) scale(${z}) translate(${-cx} ${-cy})"><image href="${esc(href)}" x="${sec.l}" y="0" width="${sec.w}" height="${H}" opacity="${o}" preserveAspectRatio="xMidYMid meet" /></g></g>`,
      );
    }
    if (sec.l > 0) {
      parts.push(`<line x1="${sec.l}" y1="0" x2="${sec.l}" y2="${H}" stroke="rgba(255,255,255,.18)" stroke-width="1" />`);
    }
  }
  const columns = secs
    .map((sec) => {
      const rot = n(state, `sSec${sec.k}Rot`, 0);
      return `<div style="position:absolute;left:${sec.l}px;top:0;width:${sec.w}px;height:${H}px;overflow:hidden;box-sizing:border-box;direction:ltr;unicode-bidi:isolate;transform:rotate(${rot}deg);transform-origin:center center">${sectionBox(sec.w, H, sectionHtml(sec.k, state, sec.w, H, lite))}</div>`;
    })
    .join("");
  parts.push(
    `<foreignObject x="0" y="0" width="${W}" height="${H}" overflow="hidden"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;direction:ltr;unicode-bidi:isolate;-webkit-print-color-adjust:exact;print-color-adjust:exact">${columns}</div></foreignObject>`,
  );
  const geom = `<rect x="0" y="0" width="${W}" height="${H}" />`;
  const painted = `<defs>${clips.join("")}<clipPath id="${uid}die">${geom}</clipPath></defs><g clip-path="url(#${uid}die)">${parts.join("")}${stampLayer(state, 0, 0, W, H)}</g>`;
  return framed(state, showCut, 0, 0, W, H, geom, painted, svgOpts);
}

function drawTaper(
  template: LabelTemplate,
  state: LabelState,
  lite: boolean,
  showCut: boolean,
  svgOpts: { wCm?: number; hCm?: number; printCss?: boolean; padPx?: number },
) {
  const { g, secs } = taperSectors(state);
  if (!g.R1 || !g.R2 || !g.arcDeg || !g.vbW || !g.vbH) {
    return svgDoc("0 0 100 100", `<text x="8" y="54" font-size="10" fill="#c00">Taper geometry error</text>`, svgOpts);
  }
  const fill = fillOf(state);
  const half = g.arcDeg / 2;
  const uid = `tp-${safeId(template.id)}`;
  const secData = secs.map((sec) => ({
    ...sec,
    saG: sec.sa - 0.25,
    eaG: sec.ea + 0.25,
    clipId: `${uid}c${sec.k}`,
  }));

  const fan = sectorPath(g.cx, g.cy, g.R1, g.R2, -half, half);
  const clips = secData.map(
    (d) => `<clipPath id="${d.clipId}"><path d="${sectorPath(g.cx, g.cy, g.R1, g.R2, d.saG, d.eaG)}" /></clipPath>`,
  );
  const parts = [`<path d="${fan}" fill="${esc(fill)}" />`];
  if (!lite) {
    for (const d of secData) {
      const href = usableImage(state[`hxBg${d.k}`]);
      if (!href) continue;
      const z = n(state, `sZoom${d.k}`, 100) / 100;
      const imgSz = Math.max(d.fW, d.fH) * 1.5 * z;
      const r = (d.mid * Math.PI) / 180;
      const ix = g.cx + ((g.R1 + g.R2) / 2) * Math.sin(r) - imgSz / 2;
      const iy = g.cy - ((g.R1 + g.R2) / 2) * Math.cos(r) - imgSz / 2;
      const o = n(state, `sOpa${d.k}`, 0.5);
      parts.push(
        `<g clip-path="url(#${d.clipId})"><image href="${esc(href)}" x="${ix}" y="${iy}" width="${imgSz}" height="${imgSz}" opacity="${o}" preserveAspectRatio="xMidYMid slice" /></g>`,
      );
    }
  }
  secData.forEach((d, i) => {
    if (i === 0) return;
    const r = (d.sa * Math.PI) / 180;
    parts.push(
      `<line x1="${g.cx + g.R2 * Math.sin(r)}" y1="${g.cy - g.R2 * Math.cos(r)}" x2="${g.cx + g.R1 * Math.sin(r)}" y2="${g.cy - g.R1 * Math.cos(r)}" stroke="rgba(255,255,255,0.15)" stroke-width="0.5" />`,
    );
  });
  for (const d of secData) {
    const Rmid = (g.R1 + g.R2) / 2;
    const innerW = d.fW * 0.92;
    const innerH = d.fH * 0.82;
    parts.push(`<g clip-path="url(#${d.clipId})">
      <g transform="rotate(${d.mid + n(state, `sSec${d.k}Rot`, 0)},${g.cx},${g.cy})">
        <foreignObject x="${g.cx - d.fW / 2}" y="${g.cy - Rmid - d.fH / 2}" width="${d.fW}" height="${d.fH}" overflow="hidden">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${d.fW}px;height:${d.fH}px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;direction:ltr;unicode-bidi:isolate;-webkit-print-color-adjust:exact;print-color-adjust:exact">
            <div style="width:${innerW}px;height:${innerH}px;overflow:hidden">${sectionHtml(d.k, state, innerW, innerH, lite)}</div>
          </div>
        </foreignObject>
      </g>
    </g>`);
  }
  const dieId = `${uid}die`;
  const painted = `<defs><clipPath id="${dieId}"><path d="${fan}" /></clipPath>${clips.join("")}</defs><g clip-path="url(#${dieId})">${parts.join("")}${stampLayer(state, g.minX, g.minY, g.vbW, g.vbH)}</g>`;
  return framed(state, showCut, g.minX, g.minY, g.vbW, g.vbH, `<path d="${fan}" />`, painted, svgOpts);
}

/** Complete SVG document. Native pixel viewBox — do not remap to 0–100. */
export function familyPreviewSvg(
  template: LabelTemplate,
  state: LabelState,
  lite = false,
  showCut = false,
  physical = false,
) {
  const board = artboardOf(template, state);
  const stroke = cutStroke(state);
  const padPx = physical && showCut && stroke.px > 0 ? stroke.px : 0;
  const padCm = padPx / PPC;
  const svgOpts = {
    ...(physical ? { wCm: board.wCm + 2 * padCm, hCm: board.hCm + 2 * padCm, printCss: true } : {}),
    padPx,
  };
  const face = previewFace(template);
  if (face === "circle") return drawCircle(template, state, lite, showCut, svgOpts);
  if (face === "top") return drawTop(template, state, showCut, svgOpts);
  if (face === "taper") return drawTaper(template, state, lite, showCut, svgOpts);
  if (face === "back") return drawBack(template, state, lite, showCut, svgOpts);
  return svgDoc("0 0 100 100", "", svgOpts);
}

