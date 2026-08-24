import { usableImage } from "./art";
import { FAM, flag, n, s, wrapLayerBorderKeys } from "./layout";
import type { LabelState } from "./types";

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
function html(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function outBorder(state: LabelState, id: string) {
  const keys = wrapLayerBorderKeys(id);
  if (!keys) return "";
  const bw = n(state, keys.w, 0);
  if (bw <= 0) return "";
  const bc = s(state, keys.c, "#ffffff");
  return `box-shadow:0 0 0 ${bw}px ${esc(bc)};`;
}
function font(state: LabelState, key: string, fallback: string) {
  return s(state, key, fallback).replace(/^['"]+|['"]+$/g, "") || fallback;
}

export function inkOf(state: LabelState) {
  return s(state, "cTxtMain", "#ffffff");
}
export function mutOf(state: LabelState) {
  return s(state, "cTxtSub", "#cccccc");
}
export function fillOf(state: LabelState) {
  return s(state, "cLabel", "#2e7d32");
}

const PRINT_INK =
  "-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;forced-color-adjust:none";

/** Live `iz-face` disc — HTML, not nested SVG (FO flex/SVG intrinsic size zooms the lid logo). */
export function logoDiscFace(
  _sz: number,
  ring: boolean,
  thick: number,
  disc: string,
  ink: string,
  text: string,
  fontName: string,
  fs: number,
  outlineColor?: string,
) {
  const outline =
    !ring && outlineColor && thick > 0
      ? `border:none;box-shadow:0 0 0 ${thick}px ${esc(outlineColor)}`
      : ring
        ? ""
        : "border:none";
  const face = ring
    ? `background:transparent;border:${thick}px solid ${esc(disc)};color:${esc(disc)}`
    : `background:${esc(disc)};${outline};color:${esc(ink)}`;
  return `<div style="width:100%;height:100%;border-radius:50%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;min-width:0;min-height:0;direction:ltr;unicode-bidi:isolate;${face};${PRINT_INK}"><span style="font-family:${esc(fontName)},sans-serif;font-weight:900;font-size:${fs}px;line-height:1;letter-spacing:0;display:flex;align-items:center;justify-content:center">${html(text)}</span></div>`;
}

function qrMark(size: number, bg: string, fg: string) {
  const p = [
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1],
  ];
  const pad = 2;
  const cell = Math.max(1, Math.floor((size - pad * 2) / 17));
  const grid = cell * 17;
  const bits = p.flatMap((row) =>
    row.map(
        (bit) =>
        `<div style="width:${cell}px;height:${cell}px;background:${bit ? fg : bg};${PRINT_INK}"></div>`,
    ),
  );
  return `<div style="width:${size}px;height:${size}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:${bg};padding:${pad}px;${PRINT_INK}"><div style="display:grid;grid-template-columns:repeat(17,${cell}px);width:${grid}px;height:${grid}px">${bits.join("")}</div></div>`;
}

function badges(state: LabelState, lite: boolean, scale = 1) {
  if (!flag(state, "chkIngBadges", true) && !flag(state, "chkLogoBadges", true)) return "";
  const sz = n(state, "sBadgeSz", 22) * scale;
  const fs = n(state, "sBadgeFS", 5.5) * scale;
  const mut = mutOf(state);
  const items = [1, 2, 3, 4, 5, 6].map((i) => ({
    ic: s(state, `eIcon${i}`),
    tx: s(state, `eBadge${i}`),
    hx: lite ? "" : usableImage(state[`hxIcon${i}`]),
  }));
  const shown = items.filter((b) => b.ic || b.tx || b.hx);
  if (!shown.length) return "";
  return `<div style="display:flex;gap:8px;margin-top:auto;padding-top:8px;justify-content:center">${shown
    .map((b) => {
      const mark = b.hx
        ? `<img src="${esc(b.hx)}" style="width:100%;height:100%;object-fit:cover" alt=""/>`
        : html(b.ic);
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">${
        b.ic || b.hx
          ? `<div style="width:${sz}px;height:${sz}px;font-size:${sz * 0.55}px;overflow:hidden;border-radius:50%;border:1px solid ${mut};opacity:.7;display:flex;align-items:center;justify-content:center">${mark}</div>`
          : ""
      }${b.tx ? `<div style="font-size:${fs}px;max-width:${sz + 4}px;color:${mut};text-align:center">${html(b.tx).replace(" ", "<br/>")}</div>` : ""}</div>`;
    })
    .join("")}</div>`;
}

/** Live getSectionHTML, using stored bb_* field names. */
export function sectionHtml(k: string, state: LabelState, w: number, h: number, lite = false) {
  const FH = font(state, "fntHeading", "Montserrat");
  const FB = font(state, "fntBody", "DM Sans");
  const FAR = font(state, "fntArabic", "Tajawal");
  const ink = inkOf(state);
  const mut = mutOf(state);
  const pad = Math.round(h * 0.07);
  const padS = Math.round(h * 0.04);
  const wrap = (inner: string) =>
    `<div style="width:100%;height:100%;overflow:visible;box-sizing:border-box;direction:ltr;unicode-bidi:isolate;${PRINT_INK}">${inner}</div>`;

  const pin = (
    cxPct: number,
    cyPct: number,
    boxW: number,
    boxH: number,
    tx: number,
    ty: number,
    rot: number,
    extra: string,
    inner: string,
  ) => {
    const x = (cxPct / 100) * w - boxW / 2 + tx;
    const y = (cyPct / 100) * h - boxH / 2 + ty;
    const xf = rot ? `transform:rotate(${rot}deg);transform-origin:center;` : "";
    return `<div style="position:absolute;left:${x}px;top:${y}px;right:auto;width:${boxW}px;height:${boxH}px;box-sizing:border-box;direction:ltr;unicode-bidi:isolate;${xf}${extra}">${inner}</div>`;
  };

  if (k === "1") {
    const lang = s(state, "eLangIng", "both");
    const scale = n(state, "sIngScale", 1);
    const fs = n(state, "sIngFS", 6.5);
    const x = n(state, "sIngPosX", 0);
    const y = n(state, "sIngPosY", 0);
    const en =
      lang !== "ar"
        ? `<div style="font-family:${esc(FH)};font-size:${fs * 1.4}px;color:${ink};margin-bottom:4px;text-transform:uppercase">${html(s(state, "eIngTitle", "Ingredients:"))}</div>
           <div style="font-family:${esc(FB)};font-size:${fs}px;color:${ink};opacity:.9;line-height:1.2">${html(s(state, "eIngredients"))}</div>
           ${s(state, "eAllergen") ? `<div style="font-family:${esc(FB)};font-style:italic;font-size:${fs * 0.9}px;color:${mut};margin-top:3px;opacity:.8">${html(s(state, "eAllergen"))}</div>` : ""}`
        : "";
    const ar =
      lang !== "en" && (s(state, "eIngTitleAr") || s(state, "eIngredientsAr"))
        ? `${lang === "both" ? `<div style="border-top:1px solid rgba(255,255,255,.2);margin:4px 0"></div>` : ""}
           ${s(state, "eIngTitleAr") ? `<div style="direction:rtl;text-align:right;font-family:${esc(FAR)};font-size:${fs * 1.3}px;color:${ink}">${html(s(state, "eIngTitleAr"))}</div>` : ""}
           ${s(state, "eIngredientsAr") ? `<div style="direction:rtl;text-align:right;font-family:${esc(FAR)};font-size:${fs}px;color:${ink};opacity:.9;margin-top:2px">${html(s(state, "eIngredientsAr"))}</div>` : ""}
           ${s(state, "eAllergenAr") ? `<div style="direction:rtl;text-align:right;font-family:${esc(FAR)};font-style:italic;font-size:${fs * 0.9}px;color:${mut};margin-top:2px;opacity:.8">${html(s(state, "eAllergenAr"))}</div>` : ""}`
        : "";
    return wrap(
      `<div style="width:100%;height:100%;padding:${pad}px ${padS}px;display:flex;flex-direction:column;justify-content:center;transform:scale(${scale}) translate(${x}px,${y}px);color:${ink};overflow:visible;${outBorder(state, FAM.ing)}">${en}${ar}${flag(state, "chkIngBadges", true) ? badges(state, lite) : ""}</div>`,
    );
  }

  if (k === "2") {
    const userScale = n(state, "sNutScale", 1);
    const auto = Math.min(1.2, Math.min(h / 170, w / 160));
    const scale = auto * userScale;
    const sTitle = n(state, "sNutTitle", 12) * scale;
    const sBody = n(state, "sNutBody", 6) * scale;
    const sCal = n(state, "sCalFS", 30) * scale;
    const x = n(state, "sNutPosX", 0);
    const y = n(state, "sNutPosY", 0);
    const rows: { l: string; r: string }[] = [];
    if (flag(state, "cNFat", true)) rows.push({ l: `<b>Total Fat</b> ${n(state, "nFat", 0)}g`, r: `${n(state, "nFatDV", 5)}%` });
    if (flag(state, "cNSatFat", true))
      rows.push({ l: `<span style="padding-left:8px">Saturated Fat ${n(state, "nSatFat", 0)}g</span>`, r: `${n(state, "nSatFatDV", 3)}%` });
    if (flag(state, "cNChol", true)) rows.push({ l: `<b>Cholesterol</b> ${n(state, "nChol", 0)}mg`, r: `${n(state, "nCholDV", 0)}%` });
    if (flag(state, "cNSod", true)) rows.push({ l: `<b>Sodium</b> ${n(state, "nSod", 0)}mg`, r: `${n(state, "nSodDV", 5)}%` });
    if (flag(state, "cNCarb", true)) rows.push({ l: `<b>Total Carb.</b> ${n(state, "nCarb", 0)}g`, r: `${n(state, "nCarbDV", 7)}%` });
    if (flag(state, "cNFib", true))
      rows.push({ l: `<span style="padding-left:8px">Dietary Fiber ${n(state, "nFib", 0)}g</span>`, r: `${n(state, "nFibDV", 11)}%` });
    if (flag(state, "cNSug", true))
      rows.push({ l: `<span style="padding-left:8px">Total Sugars ${n(state, "nSug", 0)}g</span>`, r: "" });
    if (flag(state, "cNProt", true)) rows.push({ l: `<b>Protein</b> ${n(state, "nProt", 0)}g`, r: "" });
    return wrap(
      `<div style="width:100%;height:100%;padding:${pad}px ${padS}px;background:rgba(0,0,0,.15);${PRINT_INK};display:flex;align-items:center;justify-content:center">
        <div style="border:1px solid rgba(255,255,255,.3);border-radius:2px;padding:4px 5px;width:100%;height:100%;display:flex;flex-direction:column;overflow:visible;transform:scale(${scale}) translate(${x}px,${y}px);${outBorder(state, FAM.nut)}">
          <div style="font-family:${esc(FH)};font-weight:800;font-size:${sTitle}px;color:${ink};border-bottom:2.5px solid ${ink};line-height:1.1">Nutrition Facts</div>
          <div style="font-size:${sBody * 0.9}px;color:${mut};padding:2px 0">${html(s(state, "nSrv"))}</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid ${ink};padding:2px 0">
            <span style="font-family:${esc(FH)};font-weight:800;font-size:${sBody * 1.2}px;color:${ink}">Calories</span>
            <span style="font-family:${esc(FH)};font-weight:900;font-size:${sCal}px;color:${ink}">${n(state, "nCal", 130)}</span>
          </div>
          <div style="font-size:${sBody * 0.85}px;color:${mut};text-align:right;padding:1px 0">% Daily Value*</div>
          <div style="flex:1;min-height:0;overflow:hidden">${rows
            .map(
              (r) =>
                `<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.1);padding:1px 0;font-family:${esc(FB)};font-size:${sBody}px;color:${ink}"><div>${r.l}</div><div style="font-weight:700">${r.r}</div></div>`,
            )
            .join("")}</div>
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1px 8px;font-family:${esc(FB)};color:${mut};margin-top:auto;padding-top:2px;font-size:${sBody * 0.75}px;border-top:1.5px solid rgba(255,255,255,.3)">
            <span>Vit D ${n(state, "nVitD", 0)}mcg</span><span>Ca ${n(state, "nCalc", 20)}mg</span><span>Fe ${n(state, "nIron", 1.5)}mg</span><span>K ${n(state, "nPot", 80)}mg</span>
          </div>
        </div>
      </div>`,
    );
  }

  if (k === "3") {
    const lang = s(state, "eLangLogo", "both");
    const sz = n(state, "sLogoSz", 48);
    const ring = s(state, "eLogoCircleStyle", "full") === "ring";
    const thick = n(state, "sLogoCircleThick", 1.5);
    const circle = s(state, "cLogoCircle", "#ffffff");
    const outline = s(state, "cLogoBorder");
    const names = [s(state, "eName1"), s(state, "eName2"), s(state, "eName3")].filter(Boolean);
    const arNames = [s(state, "eName1Ar"), s(state, "eName2Ar")].filter(Boolean);
    const boxOn = flag(state, "chkName2Box", false);
    const nameHtml =
      lang !== "ar"
        ? names
            .map((l) =>
              boxOn && l === s(state, "eName2")
                ? `<div style="background:${s(state, "cName2Bg", "#ffffff")};color:${s(state, "cName2Txt", fillOf(state))};padding:1px 6px;border-radius:2px;display:inline-block;margin:1px 0;${PRINT_INK}">${html(l)}</div>`
                : `<div>${html(l)}</div>`,
            )
            .join("")
        : "";
    const arHtml =
      lang !== "en" && arNames.length
        ? `${lang === "both" ? `<div style="border-top:1px solid rgba(255,255,255,.2);margin:2px 0"></div>` : ""}${arNames
            .map((l) => `<div style="direction:rtl;font-family:${esc(FAR)}">${html(l)}</div>`)
            .join("")}`
        : "";
    const nameOwn = state.sNamePosX != null && String(state.sNamePosX) !== "";
    const nx = nameOwn ? n(state, "sNamePosX", 0) : n(state, "sLogoPosX", 0);
    const ny = nameOwn ? n(state, "sNamePosY", 0) : n(state, "sLogoPosY", 0);
    const lx = n(state, "sLogoPosX", 0);
    const ly = n(state, "sLogoPosY", 0);
    const lrot = n(state, "sLogoRot", 0);
    const nrot = n(state, "sNameRot", 0);
    const nameW = w * 0.88;
    const nameH = h * 0.36;
    const badgeW = w * 0.92;
    const badgeH = Math.max(36, h * 0.22);
    return wrap(
      `<div style="position:relative;width:100%;height:100%;overflow:visible;direction:ltr;unicode-bidi:isolate">
        ${pin(50, 28, sz, sz, lx, ly, lrot, "overflow:visible;", logoDiscFace(sz, ring, thick, circle, s(state, "cLogoTxt", fillOf(state)), s(state, "eBrand", "BB"), FH, n(state, "sLogoFS", 20), outline || undefined))}
        ${pin(50, 58, nameW, nameH, nx, ny, nrot, `overflow:visible;font-family:${esc(FH)};font-weight:900;font-size:${n(state, "sNameFS", 14)}px;color:${ink};text-align:center;text-transform:uppercase;line-height:1.1;display:flex;flex-direction:column;align-items:center;justify-content:center;${outBorder(state, FAM.bname)}`, `${nameHtml}${arHtml}`)}
        ${
          flag(state, "chkLogoBadges", true)
            ? pin(50, 82, badgeW, badgeH, nx, ny, nrot, "display:flex;align-items:center;justify-content:center;", badges(state, lite, 0.9))
            : ""
        }
      </div>`,
    );
  }

  if (k === "4") {
    const lang = s(state, "eLangTip", "both");
    const fs = n(state, "sTipFS", 6.5);
    const ico = n(state, "sTipIconSz", 24);
    const t1 = lite ? "" : usableImage(state.hxTipIcon1);
    const t2 = lite ? "" : usableImage(state.hxTipIcon2);
    const i1 = t1 || s(state, "eTipIcon1");
    const i2 = t2 || s(state, "eTipIcon2");
    const en =
      lang !== "ar"
        ? `<div style="font-family:${esc(FH)};font-weight:700;font-size:${fs * 1.2}px;margin-bottom:3px;color:${ink};text-transform:uppercase">${html(s(state, "eTipTitle"))}</div>
           <div style="font-family:${esc(FB)};font-size:${fs}px;color:${mut}">${html(s(state, "eTipBody"))}</div>`
        : "";
    const ar =
      lang !== "en" && (s(state, "eTipTitleAr") || s(state, "eTipBodyAr"))
        ? `${lang === "both" ? `<div style="border-top:1px solid rgba(255,255,255,.2);margin:2px 0"></div>` : ""}
           ${s(state, "eTipTitleAr") ? `<div style="direction:rtl;text-align:right;font-family:${esc(FAR)};font-weight:700;font-size:${fs * 1.1}px;color:${ink}">${html(s(state, "eTipTitleAr"))}</div>` : ""}
           ${s(state, "eTipBodyAr") ? `<div style="direction:rtl;text-align:right;font-family:${esc(FAR)};font-size:${fs}px;color:${mut}">${html(s(state, "eTipBodyAr"))}</div>` : ""}`
        : "";
    const iconBox = (src: string, img: string) =>
      `<div style="width:${ico}px;height:${ico}px;font-size:${ico * 0.55}px;overflow:hidden;border:1px solid ${mut};border-radius:50%;display:flex;align-items:center;justify-content:center">${
        img ? `<img src="${esc(img)}" style="width:100%;height:100%;object-fit:cover" alt=""/>` : html(src)
      }</div>`;
    return wrap(
      `<div style="width:100%;height:100%;padding:${padS}px;display:flex;flex-direction:column;justify-content:center;overflow:visible;transform:translate(${n(state, "sTipPosX", 0)}px,${n(state, "sTipPosY", 0)}px);${outBorder(state, FAM.tip)}">${en}${ar}
        <div style="margin-top:10px;display:flex;align-items:center;gap:6px">${i1 ? iconBox(s(state, "eTipIcon1"), t1) : ""}${i1 && i2 ? `<span style="color:${mut}">+</span>` : ""}${i2 ? iconBox(s(state, "eTipIcon2"), t2) : ""}</div>
      </div>`,
    );
  }

  if (k === "6") {
    const fs = n(state, "sTipFS", 6.5);
    return wrap(
      `<div style="width:100%;height:100%;padding:${pad}px ${padS}px;display:flex;flex-direction:column;justify-content:center;text-align:center;overflow:visible;${outBorder(state, FAM.cus)}">
        <div style="font-family:${esc(FH)};font-weight:700;font-size:${fs * 1.4}px;margin-bottom:4px;color:${ink};text-transform:uppercase">${html(s(state, "eCusTitle"))}</div>
        <div style="font-family:${esc(FB)};font-size:${fs * 1.1}px;color:${mut}">${html(s(state, "eCusBody"))}</div>
        ${s(state, "eCusBodyAr") ? `<div style="direction:rtl;margin-top:4px;font-family:${esc(FAR)};font-size:${fs * 1.1}px;color:${mut}">${html(s(state, "eCusBodyAr"))}</div>` : ""}
      </div>`,
    );
  }

  const lang = s(state, "eLangDates", "both");
  const fs = n(state, "sDateFS", 6);
  const ds = n(state, "sDateScale", 1);
  const qrSz = n(state, "sQrSz", 44);
  const qr = lite ? "" : usableImage(state.hxQr);
  const en =
    lang !== "ar"
      ? `<div style="font-family:${esc(FB)};font-size:${fs}px;color:${ink}"><div style="font-style:italic;color:${mut};opacity:.8;font-size:.9em">${html(s(state, "eDateLabel1"))}</div>${html(s(state, "eDate1"))}</div>
         <div style="font-family:${esc(FB)};font-size:${fs}px;margin-top:4px;color:${ink}"><div style="font-style:italic;color:${mut};opacity:.8;font-size:.9em">${html(s(state, "eDateLabel2"))}</div>${html(s(state, "eDate2"))}</div>
         <div style="font-family:${esc(FB)};font-size:${fs}px;margin-top:4px;color:${mut};opacity:.8">${html(s(state, "eStore"))}</div>`
      : "";
  const ar =
    lang !== "en" && (s(state, "eDateLabel1Ar") || s(state, "eStoreAr"))
      ? `${lang === "both" ? `<div style="border-top:1px solid rgba(255,255,255,.2);margin:6px 0"></div>` : ""}
         ${s(state, "eDateLabel1Ar") ? `<div style="direction:rtl;text-align:right;font-size:${fs}px;color:${ink}"><div style="opacity:.8;font-size:.9em">${html(s(state, "eDateLabel1Ar"))}</div>${html(s(state, "eDate1"))}</div>` : ""}
         ${s(state, "eDateLabel2Ar") ? `<div style="direction:rtl;text-align:right;font-size:${fs}px;color:${ink};margin-top:4px"><div style="opacity:.8;font-size:.9em">${html(s(state, "eDateLabel2Ar"))}</div>${html(s(state, "eDate2"))}</div>` : ""}
         ${s(state, "eStoreAr") ? `<div style="direction:rtl;text-align:right;font-size:${fs}px;color:${mut};margin-top:4px;opacity:.8">${html(s(state, "eStoreAr"))}</div>` : ""}`
      : "";
  const qrInner = qr
    ? `<img src="${esc(qr)}" width="${qrSz}" height="${qrSz}" style="width:${qrSz}px;height:${qrSz}px;object-fit:contain;display:block;background:#fff;box-sizing:border-box;padding:2px;border-radius:2px" alt=""/>`
    : qrMark(qrSz, "#fff", "#111");
  const dateW = Math.max(24, w * 0.92);
  const dateH = Math.max(40, h * 0.4);
  const wtH = Math.max(16, h * 0.16);
  const dateScale = ds !== 1 ? `transform:scale(${ds});transform-origin:center;` : "";
  return wrap(
    `<div style="position:relative;width:100%;height:100%;overflow:visible;direction:ltr;unicode-bidi:isolate">
      ${pin(50, 28, dateW, dateH, n(state, "sDatePosX", 0), n(state, "sDatePosY", 0), 0, `${dateScale}z-index:1;overflow:visible;${outBorder(state, FAM.bdates)}`, `<div>${en}${ar}</div>`)}
      ${pin(50, 70, qrSz, qrSz, n(state, "sQrPosX", 0), n(state, "sQrPosY", 0), 0, `z-index:2;overflow:visible;border-radius:2px;background:#fff;${outBorder(state, FAM.qr)}`, qrInner)}
      ${pin(50, 90, dateW, wtH, n(state, "sWtPosX", 0), n(state, "sWtPosY", 0), 0, `z-index:2;overflow:visible;font-family:${esc(FH)};font-weight:700;font-size:${n(state, "sWtFS", 8)}px;color:${ink};text-align:center;display:flex;align-items:center;justify-content:center;${outBorder(state, FAM.bwt)}`, html(s(state, "eWeight")))}
    </div>`,
  );
}

export function sectionBox(w: number, h: number, inner: string) {
  return `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${Math.max(1, w)}px;height:${Math.max(1, h)}px;overflow:visible;box-sizing:border-box;direction:ltr;unicode-bidi:isolate;${PRINT_INK}">${inner}</div>`;
}
