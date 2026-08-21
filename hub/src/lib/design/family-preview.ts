import { usableImage } from "./art";
import { getDesignSpec } from "./specs";
import {
  backPx,
  backSections,
  calcTaper,
  circleBoxes,
  flag,
  n,
  previewFace,
  s,
  topBoxes,
  type TaperGeo,
} from "./layout";
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

function polygon(sides: number, cx: number, cy: number, rx: number, ry: number, rot = -90) {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ((rot + (i * 360) / sides) * Math.PI) / 180;
    pts.push(`${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function starPts(cx: number, cy: number, rx: number, ry: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const f = i % 2 === 0 ? 1 : 0.45;
    pts.push(`${cx + rx * f * Math.cos(a)},${cy + ry * f * Math.sin(a)}`);
  }
  return pts.join(" ");
}

export function outlineClip(kind: string) {
  if (kind === "square") return `<rect x="0" y="0" width="100" height="100" />`;
  if (kind === "rounded_sq") return `<rect x="0" y="0" width="100" height="100" rx="12" />`;
  if (kind === "diamond") return `<polygon points="${polygon(4, 50, 50, 50, 50, 45)}" />`;
  if (kind === "hexagon") return `<polygon points="${polygon(6, 50, 50, 50, 50)}" />`;
  if (kind === "pentagon") return `<polygon points="${polygon(5, 50, 50, 50, 50)}" />`;
  if (kind === "octagon") return `<polygon points="${polygon(8, 50, 50, 48, 48, 22.5)}" />`;
  if (kind === "star") return `<polygon points="${starPts(50, 50, 50, 50)}" />`;
  return `<circle cx="50" cy="50" r="50" />`;
}

function outlineFill(kind: string, fill: string) {
  const c = esc(fill);
  if (kind === "square") return `<rect width="100" height="100" fill="${c}" />`;
  if (kind === "rounded_sq") return `<rect width="100" height="100" rx="12" fill="${c}" />`;
  if (kind === "diamond") return `<polygon points="${polygon(4, 50, 50, 50, 50, 45)}" fill="${c}" />`;
  if (kind === "hexagon") return `<polygon points="${polygon(6, 50, 50, 50, 50)}" fill="${c}" />`;
  if (kind === "pentagon") return `<polygon points="${polygon(5, 50, 50, 50, 50)}" fill="${c}" />`;
  if (kind === "octagon") return `<polygon points="${polygon(8, 50, 50, 48, 48, 22.5)}" fill="${c}" />`;
  if (kind === "star") return `<polygon points="${starPts(50, 50, 50, 50)}" fill="${c}" />`;
  return `<circle cx="50" cy="50" r="50" fill="${c}" />`;
}

export function circleShape(state: LabelState, specOutline: string | null) {
  const raw = s(state, "cShape", specOutline || "circle").toLowerCase();
  return raw === "round" ? "circle" : raw || "circle";
}

function gBox(x: number, y: number, w: number, h: number, rot: number, inner: string) {
  const rotAttr = rot ? ` transform="rotate(${rot} ${x} ${y})"` : "";
  return `<g${rotAttr}><svg x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="none">${inner}</svg></g>`;
}

function fillOf(state: LabelState) {
  return s(state, "cLabel", "#2e7d32");
}

function drawCircle(template: LabelTemplate, state: LabelState, lite: boolean) {
  const spec = getDesignSpec(template.designType);
  const shape = circleShape(state, spec.outline);
  const fill = fillOf(state);
  const ink = s(state, "cTxtMain", "#ffffff");
  const flavorClr = s(state, "cCFlavorClr", "#1a1a1a");
  const fh = font(state, "fntHeading", "Montserrat");
  const fb = font(state, "fntBody", "DM Sans");
  const clipId = `bbfam-${template.id.replace(/[^a-zA-Z0-9_-]/g, "") || "x"}`;
  const ring = s(state, "tLogoCircleStyle", "full") === "ring";
  const parts = [
    `<defs><clipPath id="${clipId}">${outlineClip(shape)}</clipPath></defs>`,
    `<g clip-path="url(#${clipId})">`,
    outlineFill(shape, fill),
    `<line x1="12.5" y1="68" x2="87.5" y2="68" stroke="${esc(flavorClr)}" stroke-width="0.4" opacity=".4" />`,
  ];
  for (const box of circleBoxes(state)) {
    if (box.id.endsWith(":logo")) {
      const txt = esc(s(state, "tLogoTxt", "BB"));
      parts.push(
        gBox(
          box.x,
          box.y,
          box.w,
          box.h,
          box.rot,
          ring
            ? `<circle cx="50" cy="50" r="46" fill="none" stroke="${esc(ink)}" stroke-width="4"/><text x="50" y="54" text-anchor="middle" font-size="34" font-weight="900" font-family="${esc(fh)}" fill="${esc(ink)}">${txt}</text>`
            : `<circle cx="50" cy="50" r="48" fill="${esc(ink)}"/><text x="50" y="54" text-anchor="middle" font-size="34" font-weight="900" font-family="${esc(fh)}" fill="${esc(fill)}">${txt}</text>`,
        ),
      );
    } else if (box.id.endsWith(":brand")) {
      const b1 = s(state, "eCBrand1");
      const b2 = s(state, "eCBrand2");
      const fs = Math.max(8, n(state, "sCBrandFS", 20) * 0.9);
      parts.push(
        gBox(
          box.x,
          box.y,
          box.w,
          box.h,
          box.rot,
          `<text x="50" y="${b2 ? 38 : 54}" text-anchor="middle" font-size="${fs}" font-weight="700" font-family="${esc(fh)}" fill="${esc(ink)}">${esc(b1)}</text>${
            b2
              ? `<text x="50" y="70" text-anchor="middle" font-size="${fs}" font-weight="700" font-family="${esc(fh)}" fill="${esc(ink)}">${esc(b2)}</text>`
              : ""
          }`,
        ),
      );
    } else if (box.id.endsWith(":flavor")) {
      const prod = s(state, "eCProdName");
      const flav = s(state, "eCFlavorTxt");
      parts.push(
        gBox(
          box.x,
          box.y,
          box.w,
          box.h,
          box.rot,
          `${prod ? `<text x="6" y="32" font-size="${n(state, "sCProdNameFS", 12)}" font-weight="700" font-family="${esc(fh)}" fill="${esc(flavorClr)}">${esc(prod)}</text>` : ""}${
            flav
              ? `<text x="6" y="${prod ? 72 : 50}" font-size="${n(state, "sCFlavorFS", 14)}" font-weight="900" font-family="${esc(fh)}" fill="${esc(flavorClr)}">${esc(flav)}</text>`
              : ""
          }`,
        ),
      );
    } else if (box.id === "__photo__") {
      const href = lite ? "" : usableImage(state.hxCProd);
      if (href) {
        parts.push(
          gBox(box.x, box.y, box.w, box.h, box.rot, `<image href="${esc(href)}" width="100" height="100" preserveAspectRatio="xMidYMid meet" />`),
        );
      }
    } else if (box.id.endsWith(":weight")) {
      const wt = s(state, "eWeight", "30 gm").replace(/^net\s*weight\s*:?\s*/i, "");
      parts.push(
        gBox(
          box.x,
          box.y,
          box.w,
          box.h,
          box.rot,
          `<text x="50" y="38" text-anchor="middle" font-size="18" font-family="${esc(fb)}" fill="${esc(flavorClr)}" opacity=".8">NET WEIGHT</text><text x="50" y="72" text-anchor="middle" font-size="${n(state, "sCWtFS", 8) * 3}" font-weight="700" font-family="${esc(fh)}" fill="${esc(flavorClr)}">${esc(wt)}</text>`,
        ),
      );
    } else if (box.id.endsWith(":dates")) {
      const d1 = flag(state, "bCShowDate1", true) ? s(state, "eCDate1") : "";
      const d2 = flag(state, "bCShowDate2", true) ? s(state, "eCDate2") : "";
      const qr = lite ? "" : usableImage(state.hxQr);
      parts.push(
        gBox(
          box.x,
          box.y,
          box.w,
          box.h,
          box.rot,
          `${d1 ? `<text x="50" y="22" text-anchor="middle" font-size="${n(state, "sCDateFS", 6) * 3}" font-family="${esc(fb)}" fill="${esc(flavorClr)}">${esc(d1)}</text>` : ""}${
            d2
              ? `<text x="50" y="44" text-anchor="middle" font-size="${n(state, "sCDateFS", 6) * 3}" font-family="${esc(fb)}" fill="${esc(flavorClr)}">${esc(d2)}</text>`
              : ""
          }${qr ? `<image href="${esc(qr)}" x="30" y="52" width="40" height="40" preserveAspectRatio="xMidYMid meet" />` : ""}`,
        ),
      );
    }
  }
  parts.push("</g>");
  return parts.join("");
}

function drawTop(template: LabelTemplate, state: LabelState) {
  const fill = fillOf(state);
  const ink = s(state, "cTxtMain", "#ffffff");
  const sub = s(state, "cTxtSub", "#cccccc");
  const fh = font(state, "fntHeading", "Montserrat");
  const shapeRaw = s(state, "tShape", "round").toLowerCase();
  const shape = shapeRaw === "round" ? "circle" : shapeRaw;
  const clipId = `bbtop-${template.id.replace(/[^a-zA-Z0-9_-]/g, "") || "x"}`;
  const ring = s(state, "tLogoCircleStyle", "full") === "ring";
  const parts = [
    `<defs><clipPath id="${clipId}">${outlineClip(shape)}</clipPath></defs>`,
    `<g clip-path="url(#${clipId})">${outlineFill(shape, fill)}`,
  ];
  for (const box of topBoxes(state)) {
    if (box.id.endsWith(":tlogo")) {
      const txt = esc(s(state, "tLogoTxt", "BB"));
      parts.push(
        gBox(
          box.x,
          box.y,
          box.w,
          box.h,
          box.rot,
          ring
            ? `<circle cx="50" cy="50" r="46" fill="none" stroke="${esc(ink)}" stroke-width="4"/><text x="50" y="54" text-anchor="middle" font-size="36" font-weight="900" font-family="${esc(fh)}" fill="${esc(ink)}">${txt}</text>`
            : `<circle cx="50" cy="50" r="48" fill="${esc(ink)}"/><text x="50" y="54" text-anchor="middle" font-size="36" font-weight="900" font-family="${esc(fh)}" fill="${esc(fill)}">${txt}</text>`,
        ),
      );
    } else if (box.id.endsWith(":ttitle")) {
      const t1 = s(state, "tTitle1");
      const t2 = s(state, "tTitle2");
      parts.push(
        gBox(
          box.x,
          box.y,
          box.w,
          box.h,
          box.rot,
          `${t1 ? `<text x="50" y="${t2 ? 38 : 54}" text-anchor="middle" font-size="${n(state, "sTTitleFS", 20)}" font-weight="700" font-family="${esc(fh)}" fill="${esc(ink)}">${esc(t1)}</text>` : ""}${
            t2
              ? `<text x="50" y="70" text-anchor="middle" font-size="${n(state, "sTTitleFS", 20)}" font-weight="700" font-family="${esc(fh)}" fill="${esc(ink)}">${esc(t2)}</text>`
              : ""
          }`,
        ),
      );
    } else if (box.id.endsWith(":tsub")) {
      const s1 = s(state, "tSub1");
      const s2 = s(state, "tSub2");
      parts.push(
        gBox(
          box.x,
          box.y,
          box.w,
          box.h,
          box.rot,
          `${s1 ? `<text x="50" y="${s2 ? 38 : 54}" text-anchor="middle" font-size="${n(state, "sTSubFS", 7) * 1.8}" font-family="${esc(fh)}" fill="${esc(sub)}">${esc(s1)}</text>` : ""}${
            s2
              ? `<text x="50" y="70" text-anchor="middle" font-size="${n(state, "sTSubFS", 7) * 1.8}" font-family="${esc(fh)}" fill="${esc(sub)}">${esc(s2)}</text>`
              : ""
          }`,
        ),
      );
    }
  }
  parts.push("</g>");
  return parts.join("");
}

function nutRows(state: LabelState) {
  const rows: string[] = [];
  if (flag(state, "cNFat", true)) rows.push(`Total Fat ${n(state, "nFat", 0)}g`);
  if (flag(state, "cNSatFat", true)) rows.push(`Sat. Fat ${n(state, "nSatFat", 0)}g`);
  if (flag(state, "cNChol", true)) rows.push(`Cholesterol ${n(state, "nChol", 0)}mg`);
  if (flag(state, "cNSod", true)) rows.push(`Sodium ${n(state, "nSod", 0)}mg`);
  if (flag(state, "cNCarb", true)) rows.push(`Carb. ${n(state, "nCarb", 0)}g`);
  if (flag(state, "cNFib", true)) rows.push(`Fiber ${n(state, "nFib", 0)}g`);
  if (flag(state, "cNSug", true)) rows.push(`Sugars ${n(state, "nSug", 0)}g`);
  if (flag(state, "cNProt", true)) rows.push(`Protein ${n(state, "nProt", 0)}g`);
  return rows;
}

function sectionHtml(k: string, state: LabelState, lite: boolean) {
  const ink = s(state, "cTxtMain", "#ffffff");
  const mut = s(state, "cTxtSub", "#cccccc");
  const fh = font(state, "fntHeading", "Montserrat");
  const fb = font(state, "fntBody", "DM Sans");
  const far = font(state, "fntArabic", "Tajawal");
  const wrap = (inner: string) =>
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;padding:6%;box-sizing:border-box;overflow:hidden;color:${ink}">${inner}</div>`;
  if (k === "1") {
    return wrap(
      `<div style="font-family:${fh};font-size:${n(state, "sIngFS", 6.5) * 1.3}px;text-transform:uppercase">${html(s(state, "eIngTitle", s(state, "eIngTitleAr", "Ingredients:")))}</div>
       <div style="font-family:${s(state, "eIngredientsAr") ? far : fb};font-size:${n(state, "sIngFS", 6.5)}px;opacity:.92;line-height:1.2;${s(state, "eIngredientsAr") ? "direction:rtl;text-align:right" : ""}">${html(s(state, "eIngredientsAr") || s(state, "eIngredients"))}</div>`,
    );
  }
  if (k === "2") {
    const rows = nutRows(state)
      .map((r) => `<div style="display:flex;justify-content:space-between;font-family:${fb};font-size:${n(state, "sNutBody", 6)}px;border-bottom:1px solid rgba(255,255,255,.12)">${html(r)}</div>`)
      .join("");
    return wrap(
      `<div style="font-family:${fh};font-weight:800;font-size:${n(state, "sNutTitle", 12)}px;border-bottom:2px solid ${ink}">Nutrition Facts</div>
       <div style="font-size:7px;color:${mut}">${html(s(state, "nSrv"))}</div>
       <div style="display:flex;justify-content:space-between;font-family:${fh}"><b>Calories</b><b style="font-size:${n(state, "sCalFS", 18)}px">${n(state, "nCal", 0)}</b></div>${rows}`,
    );
  }
  if (k === "3") {
    const names = [s(state, "eName1"), s(state, "eName2"), s(state, "eName3")].filter(Boolean);
    const ar = [s(state, "eName1Ar"), s(state, "eName2Ar")].filter(Boolean);
    const sz = n(state, "sLogoSz", 48);
    const ring = s(state, "eLogoCircleStyle", "full") === "ring";
    const circle = s(state, "cLogoCircle", "#ffffff");
    return wrap(
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:3px">
        <div style="width:${sz}px;height:${sz}px;border-radius:50%;${ring ? `border:2px solid ${circle}` : `background:${circle}`};display:flex;align-items:center;justify-content:center;font-family:${fh};font-weight:900;font-size:${n(state, "sLogoFS", 20)}px;color:${s(state, "cLogoTxt", fillOf(state))}">${html(s(state, "eBrand", "BB"))}</div>
        <div style="font-family:${fh};font-weight:900;font-size:${n(state, "sNameFS", 14)}px;text-align:center;text-transform:uppercase;line-height:1.1">${names.map((l) => `<div>${html(l)}</div>`).join("")}${ar.map((l) => `<div style="direction:rtl;font-family:${far}">${html(l)}</div>`).join("")}</div>
      </div>`,
    );
  }
  if (k === "4") {
    return wrap(
      `<div style="font-family:${fh};font-weight:700;font-size:${n(state, "sTipFS", 6.5) * 1.2}px;text-transform:uppercase">${html(s(state, "eTipTitle"))}</div>
       <div style="font-family:${fb};font-size:${n(state, "sTipFS", 6.5)}px;color:${mut}">${html(s(state, "eTipBody"))}</div>`,
    );
  }
  const qr = lite ? "" : usableImage(state.hxQr);
  return wrap(
    `<div style="font-family:${fb};font-size:${n(state, "sDateFS", 6)}px"><i style="color:${mut}">${html(s(state, "eDateLabel1") || s(state, "eDateLabel1Ar"))}</i><div>${html(s(state, "eDate1"))}</div></div>
     <div style="font-family:${fb};font-size:${n(state, "sDateFS", 6)}px;margin-top:3px">${html(s(state, "eDate2") || s(state, "eStore") || s(state, "eStoreAr"))}</div>
     ${qr ? `<img src="${esc(qr)}" width="${n(state, "sQrSz", 44)}" height="${n(state, "sQrSz", 44)}" style="background:#fff;margin-top:4px"/>` : ""}
     <div style="font-family:${fh};font-weight:700;font-size:${n(state, "sWtFS", 8)}px;text-align:center;margin-top:4px">${html(s(state, "eWeight"))}</div>`,
  );
}

function posKeys(k: string) {
  const x: Record<string, string> = { "1": "sIngPosX", "2": "sNutPosX", "3": "sLogoPosX", "4": "sTipPosX", "5": "sDatePosX" };
  const y: Record<string, string> = { "1": "sIngPosY", "2": "sNutPosY", "3": "sLogoPosY", "4": "sTipPosY", "5": "sDatePosY" };
  return { x: x[k] || "", y: y[k] || "" };
}

function bgLayer(state: LabelState, k: string, lite: boolean) {
  if (lite) return "";
  const href = usableImage(state[`hxBg${k}`]);
  if (!href) return "";
  const o = n(state, `sOpa${k}`, 0.5);
  const z = Math.max(0.05, n(state, `sZoom${k}`, 100) / 100);
  const size = 100 * z;
  return `<image href="${esc(href)}" x="${50 - size / 2}" y="${50 - size / 2}" width="${size}" height="${size}" opacity="${o}" preserveAspectRatio="xMidYMid slice" />`;
}

function drawBack(state: LabelState, lite: boolean) {
  const { W, H } = backPx(state);
  const fill = fillOf(state);
  const parts = [`<rect width="100" height="100" fill="${esc(fill)}" />`];
  for (const sec of backSections(state, W)) {
    const x = (sec.l / W) * 100;
    const w = (sec.w / W) * 100;
    const keys = posKeys(sec.k);
    const dx = keys.x ? (n(state, keys.x, 0) / W) * 100 : 0;
    const dy = keys.y ? (n(state, keys.y, 0) / H) * 100 : 0;
    const rot = n(state, `sSec${sec.k}Rot`, 0);
    parts.push(`<g transform="translate(${dx} ${dy}) rotate(${rot} ${x + w / 2} 50)">
      <svg x="${x}" y="0" width="${w}" height="100" viewBox="0 0 100 100" preserveAspectRatio="none">
        ${bgLayer(state, sec.k, lite)}
        <foreignObject x="0" y="0" width="100" height="100">${sectionHtml(sec.k, state, lite)}</foreignObject>
      </svg>
    </g>`);
    if (x > 0.4) parts.push(`<line x1="${x}" y1="4" x2="${x}" y2="96" stroke="rgba(255,255,255,.18)" stroke-width="0.35" />`);
  }
  return parts.join("");
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
  return { d: `M ${x1o} ${y1o} A ${R1} ${R1} 0 ${la} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${R2} ${R2} 0 ${la} 0 ${x2i} ${y2i} Z`, la, pts: [x1o, y1o, R1, R1, la, 1, x2o, y2o, x1i, y1i, R2, R2, la, 0, x2i, y2i] as number[] };
}

function mapT(g: TaperGeo, x: number, y: number) {
  return { x: ((x - g.minX) / g.vbW) * 100, y: ((y - g.minY) / g.vbH) * 100 };
}

function sectorPct(g: TaperGeo, sa: number, ea: number) {
  const raw = sectorPath(g.cx, g.cy, g.R1, g.R2, sa, ea);
  const p = raw.pts;
  const M = mapT(g, p[0], p[1]);
  const A1 = mapT(g, p[6], p[7]);
  const L = mapT(g, p[8], p[9]);
  const A2 = mapT(g, p[14], p[15]);
  const rx1 = (p[2] / g.vbW) * 100;
  const ry1 = (p[3] / g.vbH) * 100;
  const rx2 = (p[10] / g.vbW) * 100;
  const ry2 = (p[11] / g.vbH) * 100;
  return `M ${M.x.toFixed(3)} ${M.y.toFixed(3)} A ${rx1.toFixed(3)} ${ry1.toFixed(3)} 0 ${p[4]} 1 ${A1.x.toFixed(3)} ${A1.y.toFixed(3)} L ${L.x.toFixed(3)} ${L.y.toFixed(3)} A ${rx2.toFixed(3)} ${ry2.toFixed(3)} 0 ${p[12]} 0 ${A2.x.toFixed(3)} ${A2.y.toFixed(3)} Z`;
}

function drawTaper(state: LabelState, lite: boolean) {
  const g = calcTaper(state);
  const fill = fillOf(state);
  const { W } = backPx(state);
  const secs = backSections(state, W);
  const half = g.arcDeg / 2;
  const active = secs.reduce((a, sec) => a + sec.w, 0) || 1;
  let cur = -half;
  const parts = [`<path d="${sectorPct(g, -half, half)}" fill="${esc(fill)}" />`];
  secs.forEach((sec, i) => {
    const span = g.arcDeg * (sec.w / active);
    const sa = cur;
    const ea = cur + span;
    const mid = sa + span / 2;
    cur = ea;
    const clip = `tpc${i}`;
    const d = sectorPct(g, sa, ea);
    const midR = (g.R1 + g.R2) / 2;
    const aPts: number[][] = [];
    for (const ang of [sa, ea, mid]) {
      const r = (ang * Math.PI) / 180;
      aPts.push([g.cx + g.R1 * Math.sin(r), g.cy - g.R1 * Math.cos(r)]);
      aPts.push([g.cx + g.R2 * Math.sin(r), g.cy - g.R2 * Math.cos(r)]);
    }
    const fW = Math.max(...aPts.map((p) => p[0])) - Math.min(...aPts.map((p) => p[0]));
    const fH = Math.max(...aPts.map((p) => p[1])) - Math.min(...aPts.map((p) => p[1]));
    const apex = mapT(g, g.cx, g.cy);
    const fo = mapT(g, g.cx, g.cy - midR);
    const foW = (fW / g.vbW) * 100 * 0.92;
    const foH = (fH / g.vbH) * 100 * 0.82;
    parts.push(`<clipPath id="${clip}"><path d="${d}" /></clipPath>`);
    parts.push(`<g clip-path="url(#${clip})"><g transform="rotate(${mid} ${apex.x} ${apex.y})">
      <foreignObject x="${fo.x - foW / 2}" y="${fo.y - foH / 2}" width="${foW}" height="${foH}">${sectionHtml(sec.k, state, lite)}</foreignObject>
    </g></g>`);
  });
  return parts.join("");
}

export function familyPreviewSvg(template: LabelTemplate, state: LabelState, lite = false) {
  const face = previewFace(template);
  if (face === "circle") return drawCircle(template, state, lite);
  if (face === "top") return drawTop(template, state);
  if (face === "taper") return drawTaper(state, lite);
  if (face === "back") return drawBack(state, lite);
  return "";
}
