import { getDesignSpec } from "./specs";
import type { LabelMode, LabelState, LabelTemplate } from "./types";

export const PPC = 37.795;

export type PreviewFace = "composite" | "circle" | "top" | "back" | "taper";

export function n(state: LabelState, key: string, fallback: number) {
  const raw = state[key];
  if (raw == null || raw === "") return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

export function s(state: LabelState, key: string, fallback = "") {
  const v = state[key];
  return v == null || v === "" ? fallback : String(v);
}

export function flag(state: LabelState, key: string, fallback = true) {
  const v = state[key];
  if (v === undefined || v === null || v === "") return fallback;
  return v === true || v === "true";
}

export function previewFace(template: LabelTemplate): PreviewFace {
  const spec = getDesignSpec(template.designType);
  if (spec.composite && template.state._composite) return "composite";
  const mode: LabelMode = spec.modes.includes(template.labelMode)
    ? template.labelMode
    : spec.defaultMode;
  if (mode === "top") return "top";
  if (mode === "circle") return "circle";
  if (spec.isTapered || template.isTapered || template.state._isTapered) return "taper";
  return "back";
}

export function circlePx(state: LabelState) {
  const wCm = n(state, "cW", 6);
  const hCm = n(state, "cH", 6);
  return { wCm, hCm, W: wCm * PPC, H: hCm * PPC };
}

export function topPx(state: LabelState) {
  const sz = n(state, "tSz", 4);
  return { wCm: sz, hCm: sz, W: sz * PPC, H: sz * PPC };
}

export function backPx(state: LabelState) {
  const wCm = n(state, "sW", 17);
  const hCm = n(state, "sH", 4.5);
  return { wCm, hCm, W: wCm * PPC, H: hCm * PPC };
}

export type TaperGeo = {
  R1: number;
  R2: number;
  R1_cm: number;
  R2_cm: number;
  arcDeg: number;
  bbW_cm: number;
  bbH_cm: number;
  cx: number;
  cy: number;
  minX: number;
  minY: number;
  vbW: number;
  vbH: number;
};

export function calcTaper(state: LabelState): TaperGeo {
  let dTop = n(state, "tpDTop", 9);
  const dBot = n(state, "tpDBot", 7);
  const hCup = n(state, "tpCupH", 9);
  const hLbl = n(state, "tpLblH", 7);
  const offsetBot = n(state, "tpOffsetBot", 0.5);
  const wrapFrac = n(state, "tpWrap", 85) / 100;
  if (dTop <= dBot + 0.01) dTop = dBot + 0.1;
  const rTop = dTop / 2;
  const rBot = dBot / 2;
  const L_cup = Math.sqrt(hCup * hCup + (rTop - rBot) * (rTop - rBot));
  const heightFromBottom_bot = offsetBot;
  const heightFromBottom_top = offsetBot + hLbl;
  const r_at_bot = rBot + (rTop - rBot) * (heightFromBottom_bot / hCup);
  const r_at_top = rBot + (rTop - rBot) * (heightFromBottom_top / hCup);
  const R2_cm = (r_at_bot * L_cup) / (rTop - rBot);
  const R1_cm = (r_at_top * L_cup) / (rTop - rBot);
  const arcDeg = (360 * r_at_top * wrapFrac) / R1_cm;
  const R1 = R1_cm * PPC;
  const R2 = R2_cm * PPC;
  const haRad = (arcDeg / 2) * (Math.PI / 180);
  const bbW_cm = 2 * R1_cm * Math.sin(haRad);
  const bbH_cm = R1_cm - R2_cm * Math.cos(haRad);
  const pad = 100;
  const cx = R1 + pad;
  const cy = R1 + pad;
  const sr = -arcDeg / 2;
  const er = arcDeg / 2;
  const pts: number[][] = [];
  for (let a = sr; a <= er; a += 1) {
    const r = (a * Math.PI) / 180;
    pts.push([cx + R1 * Math.sin(r), cy - R1 * Math.cos(r)]);
    pts.push([cx + R2 * Math.sin(r), cy - R2 * Math.cos(r)]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs) - 60;
  const maxX = Math.max(...xs) + 60;
  const minY = Math.min(...ys) - 60;
  const maxY = Math.max(...ys) + 60;
  return {
    R1,
    R2,
    R1_cm,
    R2_cm,
    arcDeg,
    bbW_cm,
    bbH_cm,
    cx,
    cy,
    minX,
    minY,
    vbW: maxX - minX,
    vbH: maxY - minY,
  };
}

export function artboardOf(template: LabelTemplate, state: LabelState = template.state) {
  const face = previewFace(template);
  if (face === "composite") {
    const board = state._composite?.artboard;
    const w = Number(board?.wCm ?? state.cW);
    const h = Number(board?.hCm ?? state.cH);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      return { wCm: w, hCm: h };
    }
    return { wCm: 6, hCm: 6 };
  }
  if (face === "top") {
    const d = topPx(state);
    return { wCm: d.wCm, hCm: d.hCm };
  }
  if (face === "circle") {
    const d = circlePx(state);
    return { wCm: d.wCm, hCm: d.hCm };
  }
  if (face === "taper") {
    const g = calcTaper(state);
    return { wCm: g.vbW / PPC, hCm: g.vbH / PPC };
  }
  const d = backPx(state);
  return { wCm: d.wCm, hCm: d.hCm };
}

export type FamilyBox = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  /** Sector fan angle in degrees. Overlay rot = fan + stored sSec*Rot. */
  fan?: number;
  lock: boolean;
  restX: number;
  restY: number;
  ox?: string;
  oy?: string;
  size?: string;
  wKey?: string;
  hKey?: string;
};

function rotOffset(localX: number, localY: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: localX * c - localY * s, y: localX * s + localY * c };
}

function unrotOffset(dx: number, dy: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

export const FAM = {
  logo: "__fam:logo",
  brand: "__fam:brand",
  flavor: "__fam:flavor",
  photo: "__photo__",
  weight: "__fam:weight",
  dates: "__fam:dates",
  qr: "__qr__",
  tlogo: "__fam:tlogo",
  ttitle: "__fam:ttitle",
  tsub: "__fam:tsub",
  ing: "__fam:ing",
  nut: "__fam:nut",
  blogo: "__fam:blogo",
  bname: "__fam:bname",
  tip: "__fam:tip",
  bdates: "__fam:bdates",
  bwt: "__fam:bwt",
  cus: "__fam:cus",
} as const;

function pct(px: number, total: number) {
  return total ? (px / total) * 100 : 0;
}

export function circleBoxes(state: LabelState): FamilyBox[] {
  const { W, H } = circlePx(state);
  const boxes: FamilyBox[] = [];
  const logoTxt = s(state, "tLogoTxt", "BB");
  if (logoTxt) {
    const sz = n(state, "sCLogoSz", 45);
    boxes.push({
      id: FAM.logo,
      label: "Logo",
      x: 50 + pct(n(state, "sCLogoX", 0), W),
      y: 10 + pct(n(state, "sCLogoY", 0), H),
      w: pct(sz, W),
      h: pct(sz, H),
      rot: n(state, "sCLogoRot", 0),
      lock: false,
      restX: 50,
      restY: 10,
      ox: "sCLogoX",
      oy: "sCLogoY",
      size: "sCLogoSz",
    });
  }
  if (s(state, "eCBrand1") || s(state, "eCBrand2")) {
    boxes.push({
      id: FAM.brand,
      label: "Brand",
      x: 50 + pct(n(state, "sCBrandX", 0), W),
      y: 28 + pct(n(state, "sCBrandY", 0), H),
      w: pct(n(state, "sCBrandW", 160), W),
      h: pct(n(state, "sCBrandH", 52), H),
      rot: n(state, "sCBrandRot", 0),
      lock: false,
      restX: 50,
      restY: 28,
      ox: "sCBrandX",
      oy: "sCBrandY",
      wKey: "sCBrandW",
      hKey: "sCBrandH",
    });
  }
  boxes.push({
    id: FAM.flavor,
    label: "Flavor",
    x: 50 + pct(n(state, "sCFlavorX", 0), W),
    y: 52 + pct(n(state, "sCFlavorY", 0), H),
    w: pct(n(state, "sCFlavorW", 140), W),
    h: pct(n(state, "sCFlavorH", 60), H),
    rot: n(state, "sCFlavorRot", 0),
    lock: false,
    restX: 50,
    restY: 52,
    ox: "sCFlavorX",
    oy: "sCFlavorY",
    wKey: "sCFlavorW",
    hKey: "sCFlavorH",
  });
  if (s(state, "hxCProd")) {
    const pSz = n(state, "sCProdSz", 80);
    const pPct = pct(pSz, W);
    boxes.push({
      id: FAM.photo,
      label: "Product photo",
      x: 92 - pPct / 2 + pct(n(state, "sCProdX", 0), W),
      y: 52 + pct(n(state, "sCProdY", 0), H),
      w: pPct,
      h: pct(pSz, H),
      rot: n(state, "sCProdRot", 0),
      lock: false,
      restX: 92 - pPct / 2,
      restY: 52,
      ox: "sCProdX",
      oy: "sCProdY",
      size: "sCProdSz",
    });
  }
  boxes.push({
    id: FAM.weight,
    label: "Weight",
    x: 28 + pct(n(state, "sCWtX", 0) + n(state, "sCBotX", 0), W),
    y: 84 + pct(n(state, "sCWtY", 0) + n(state, "sCBotY", 0), H),
    w: pct(n(state, "sCWtW", 90), W),
    h: pct(n(state, "sCWtH", 44), H),
    rot: n(state, "sCWtRot", 0),
    lock: false,
    restX: 28,
    restY: 84,
    ox: "sCWtX",
    oy: "sCWtY",
    wKey: "sCWtW",
    hKey: "sCWtH",
  });
  boxes.push({
    id: FAM.dates,
    label: "Dates",
    x: 72 + pct(n(state, "sCDateX", 0) + n(state, "sCBotX", 0), W),
    y: 84 + pct(n(state, "sCDateY", 0) + n(state, "sCBotY", 0), H),
    w: pct(n(state, "sCDateW", 100), W),
    h: pct(n(state, "sCDateH", 70), H),
    rot: n(state, "sCDateRot", 0),
    lock: false,
    restX: 72,
    restY: 84,
    ox: "sCDateX",
    oy: "sCDateY",
    wKey: "sCDateW",
    hKey: "sCDateH",
  });
  return boxes;
}

/** Live `buildTopLabel` flex-column rest points (centered stack). Paint pins at these percents. */
export function topStackLayout(state: LabelState) {
  const { W, H } = topPx(state);
  const hasLogo = Boolean(s(state, "tLogoTxt"));
  const hasTitle = Boolean(s(state, "tTitle1") || s(state, "tTitle2"));
  const hasSub = Boolean(s(state, "tSub1") || s(state, "tSub2"));
  const sz = n(state, "sTCircleSz", 32);
  const titleW = n(state, "sTTitleW", 180);
  const titleH = n(state, "sTTitleH", 52);
  const subW = n(state, "sTSubW", 160);
  const subH = n(state, "sTSubH", 36);
  let total = 0;
  if (hasLogo) total += sz + 8;
  if (hasTitle) total += titleH + 6;
  if (hasSub) total += subH;
  let y = (H - total) / 2;
  let logo: { cx: number; cy: number; w: number; h: number } | null = null;
  let title: { cx: number; cy: number; w: number; h: number } | null = null;
  let sub: { cx: number; cy: number; w: number; h: number } | null = null;
  if (hasLogo) {
    logo = { cx: W / 2, cy: y + sz / 2, w: sz, h: sz };
    y += sz + 8;
  }
  if (hasTitle) {
    title = { cx: W / 2, cy: y + titleH / 2, w: titleW, h: titleH };
    y += titleH + 6;
  }
  if (hasSub) {
    sub = { cx: W / 2, cy: y + subH / 2, w: subW, h: subH };
  }
  return { W, H, logo, title, sub };
}

export function topBoxes(state: LabelState): FamilyBox[] {
  const { W, H, logo, title, sub } = topStackLayout(state);
  const boxes: FamilyBox[] = [];
  if (logo) {
    boxes.push({
      id: FAM.tlogo,
      label: "Top logo",
      x: pct(logo.cx + n(state, "sTLogoX", 0), W),
      y: pct(logo.cy + n(state, "sTLogoY", 0), H),
      w: pct(logo.w, W),
      h: pct(logo.h, H),
      rot: n(state, "sTLogoRot", 0),
      lock: false,
      restX: pct(logo.cx, W),
      restY: pct(logo.cy, H),
      ox: "sTLogoX",
      oy: "sTLogoY",
      size: "sTCircleSz",
    });
  }
  if (title) {
    boxes.push({
      id: FAM.ttitle,
      label: "Title",
      x: pct(title.cx + n(state, "sTTitleX", 0), W),
      y: pct(title.cy + n(state, "sTTitleY", 0), H),
      w: pct(title.w, W),
      h: pct(title.h, H),
      rot: n(state, "sTTitleRot", 0),
      lock: false,
      restX: pct(title.cx, W),
      restY: pct(title.cy, H),
      ox: "sTTitleX",
      oy: "sTTitleY",
      wKey: "sTTitleW",
      hKey: "sTTitleH",
    });
  }
  if (sub) {
    boxes.push({
      id: FAM.tsub,
      label: "Subtitle",
      x: pct(sub.cx + n(state, "sTSubX", 0), W),
      y: pct(sub.cy + n(state, "sTSubY", 0), H),
      w: pct(sub.w, W),
      h: pct(sub.h, H),
      rot: n(state, "sTSubRot", 0),
      lock: false,
      restX: pct(sub.cx, W),
      restY: pct(sub.cy, H),
      ox: "sTSubX",
      oy: "sTSubY",
      wKey: "sTSubW",
      hKey: "sTSubH",
    });
  }
  return boxes;
}

export type BackSection = { k: string; l: number; w: number };

export function backSections(state: LabelState, W: number): BackSection[] {
  const sw1 = n(state, "sw1", 22);
  const sw2 = n(state, "sw2", 28);
  const sw3 = n(state, "sw3", 20);
  const sw4 = n(state, "sw4", 18);
  const raw: Record<string, { on: boolean; p: number }> = {
    "1": { on: flag(state, "chkS1", true), p: sw1 },
    "2": { on: flag(state, "chkS2", true), p: sw2 },
    "3": { on: flag(state, "chkS3", true), p: sw3 },
    "4": { on: flag(state, "chkS4", true), p: sw4 },
    "5": { on: flag(state, "chkS5", true), p: Math.max(0, 100 - sw1 - sw2 - sw3 - sw4) },
    "6": { on: flag(state, "chkS6", false), p: 20 },
  };
  const order = s(state, "eSecOrd", "1,2,3,4,5,6")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  let active = 0;
  for (const k of order) if (raw[k]?.on) active += raw[k].p;
  if (active === 0) active = 1;
  let left = 0;
  const wanted = order.filter((k) => raw[k]?.on);
  const out: BackSection[] = [];
  wanted.forEach((k, i) => {
    const last = i === wanted.length - 1;
    const w = last ? Math.max(0, W - left) : Math.round(W * (raw[k].p / active));
    if (w <= 0 && !last) return;
    out.push({ k, l: left, w: Math.max(1, w) });
    left += Math.max(1, w);
  });
  return out;
}

export type TaperSector = {
  k: string;
  sa: number;
  ea: number;
  mid: number;
  fW: number;
  fH: number;
};

export function taperSectors(state: LabelState): { g: TaperGeo; secs: TaperSector[] } {
  const g = calcTaper(state);
  const { W } = backPx(state);
  const secs = backSections(state, W);
  const half = g.arcDeg / 2;
  const active = secs.reduce((a, sec) => a + sec.w, 0) || 1;
  let cur = -half;
  return {
    g,
    secs: secs.map((sec) => {
      const span = g.arcDeg * (sec.w / active);
      const sa = cur;
      const ea = cur + span;
      const mid = (sa + ea) / 2;
      cur = ea;
      const aPts: number[][] = [];
      for (const ang of [sa, ea, mid]) {
        const r = (ang * Math.PI) / 180;
        aPts.push([g.cx + g.R1 * Math.sin(r), g.cy - g.R1 * Math.cos(r)]);
        aPts.push([g.cx + g.R2 * Math.sin(r), g.cy - g.R2 * Math.cos(r)]);
      }
      const xs = aPts.map((p) => p[0]);
      const ys = aPts.map((p) => p[1]);
      return {
        k: sec.k,
        sa,
        ea,
        mid,
        fW: Math.max(...xs) - Math.min(...xs),
        fH: Math.max(...ys) - Math.min(...ys),
      };
    }),
  };
}

function fanXy(g: TaperGeo, ang: number, radius: number) {
  const r = (ang * Math.PI) / 180;
  return { x: g.cx + radius * Math.sin(r), y: g.cy - radius * Math.cos(r) };
}

function vbPct(g: TaperGeo, x: number, y: number) {
  return {
    x: g.vbW ? ((x - g.minX) / g.vbW) * 100 : 50,
    y: g.vbH ? ((y - g.minY) / g.vbH) * 100 : 50,
  };
}

const WRAP_META: Record<string, { id: string; label: string; ox: string; oy: string }> = {
  "1": { id: FAM.ing, label: "Ingredients", ox: "sIngPosX", oy: "sIngPosY" },
  "2": { id: FAM.nut, label: "Nutrition", ox: "sNutPosX", oy: "sNutPosY" },
  "3": { id: FAM.blogo, label: "Logo", ox: "sLogoPosX", oy: "sLogoPosY" },
  "4": { id: FAM.tip, label: "Tips", ox: "sTipPosX", oy: "sTipPosY" },
  "5": { id: FAM.bdates, label: "Dates", ox: "sDatePosX", oy: "sDatePosY" },
  "6": { id: FAM.cus, label: "Custom", ox: "", oy: "" },
};

export type FamilyFocusTab = "copy" | "nutrition" | "type";

export function familyFocus(id: string | null | undefined): { tab: FamilyFocusTab; block: string } | null {
  if (!id) return null;
  const map: Record<string, { tab: FamilyFocusTab; block: string }> = {
    [FAM.ing]: { tab: "copy", block: "ing" },
    [FAM.nut]: { tab: "nutrition", block: "nut" },
    [FAM.blogo]: { tab: "copy", block: "logo" },
    [FAM.bname]: { tab: "copy", block: "brand" },
    [FAM.tip]: { tab: "copy", block: "tip" },
    [FAM.bdates]: { tab: "copy", block: "dates" },
    [FAM.bwt]: { tab: "copy", block: "weight" },
    [FAM.cus]: { tab: "copy", block: "custom" },
    [FAM.qr]: { tab: "copy", block: "dates" },
    [FAM.logo]: { tab: "copy", block: "clogo" },
    [FAM.brand]: { tab: "copy", block: "cbrand" },
    [FAM.flavor]: { tab: "copy", block: "cflavor" },
    [FAM.photo]: { tab: "copy", block: "cphoto" },
    [FAM.weight]: { tab: "copy", block: "cweight" },
    [FAM.dates]: { tab: "copy", block: "cdates" },
    [FAM.tlogo]: { tab: "copy", block: "tlogo" },
    [FAM.ttitle]: { tab: "copy", block: "ttitle" },
    [FAM.tsub]: { tab: "copy", block: "tsub" },
  };
  return map[id] || null;
}

export function familyTextField(id: string): { field: string; multiline: boolean } | null {
  const map: Record<string, { field: string; multiline: boolean }> = {
    [FAM.ing]: { field: "eIngredients", multiline: true },
    [FAM.nut]: { field: "nCal", multiline: false },
    [FAM.blogo]: { field: "eBrand", multiline: false },
    [FAM.bname]: { field: "eName1", multiline: false },
    [FAM.tip]: { field: "eTipBody", multiline: true },
    [FAM.bdates]: { field: "eDate1", multiline: false },
    [FAM.bwt]: { field: "eWeight", multiline: false },
    [FAM.cus]: { field: "eCusBody", multiline: true },
    [FAM.logo]: { field: "tLogoTxt", multiline: false },
    [FAM.brand]: { field: "eCBrand1", multiline: false },
    [FAM.flavor]: { field: "eCFlavorTxt", multiline: false },
    [FAM.weight]: { field: "eWeight", multiline: false },
    [FAM.dates]: { field: "eCDate1", multiline: false },
    [FAM.tlogo]: { field: "tLogoTxt", multiline: false },
    [FAM.ttitle]: { field: "tTitle1", multiline: false },
    [FAM.tsub]: { field: "tSub1", multiline: false },
  };
  return map[id] || null;
}

export function backBoxes(state: LabelState): FamilyBox[] {
  const { W, H } = backPx(state);
  const boxes: FamilyBox[] = [];
  for (const sec of backSections(state, W)) {
    const meta = WRAP_META[sec.k] || { id: `__fam:sec${sec.k}`, label: `Section ${sec.k}`, ox: "", oy: "" };
    const restX = pct(sec.l + sec.w / 2, W);
    const cw = pct(Math.max(24, sec.w * 0.88), W);
    const rot = n(state, `sSec${sec.k}Rot`, 0);
    const homeAt = (restYPct: number, ox: number, oy: number) => {
      const fromC = ((restYPct - 50) / 100) * H;
      const rest = rotOffset(0, fromC, rot);
      const world = rotOffset(ox, fromC + oy, rot);
      return {
        x: restX + pct(world.x, W),
        y: 50 + pct(world.y, H),
        restX: restX + pct(rest.x, W),
        restY: 50 + pct(rest.y, H),
      };
    };
    const home = (restYPct: number, ox: string, oy: string) => homeAt(restYPct, n(state, ox, 0), n(state, oy, 0));
    if (sec.k === "3") {
      const logoSz = n(state, "sLogoSz", 48);
      const logo = home(28, "sLogoPosX", "sLogoPosY");
      boxes.push({
        id: FAM.blogo,
        label: "Logo",
        x: logo.x,
        y: logo.y,
        w: pct(logoSz, W),
        h: pct(logoSz, H),
        rot: rot + n(state, "sLogoRot", 0),
        fan: 0,
        lock: false,
        restX: logo.restX,
        restY: logo.restY,
        ox: "sLogoPosX",
        oy: "sLogoPosY",
        size: "sLogoSz",
      });
      const nameOwn = state.sNamePosX != null && String(state.sNamePosX) !== "";
      const names = nameOwn ? home(58, "sNamePosX", "sNamePosY") : homeAt(58, n(state, "sLogoPosX", 0), n(state, "sLogoPosY", 0));
      boxes.push({
        id: FAM.bname,
        label: "Brand",
        x: names.x,
        y: names.y,
        w: cw,
        h: 36,
        rot: rot + n(state, "sNameRot", 0),
        fan: 0,
        lock: false,
        restX: names.restX,
        restY: names.restY,
        ox: "sNamePosX",
        oy: "sNamePosY",
      });
      continue;
    }
    if (sec.k === "5") {
      const dates = home(28, "sDatePosX", "sDatePosY");
      boxes.push({
        id: FAM.bdates,
        label: "Dates",
        x: dates.x,
        y: dates.y,
        w: cw,
        h: 40,
        rot,
        fan: 0,
        lock: false,
        restX: dates.restX,
        restY: dates.restY,
        ox: "sDatePosX",
        oy: "sDatePosY",
      });
      const qsz = n(state, "sQrSz", 44);
      const qr = home(70, "sQrPosX", "sQrPosY");
      boxes.push({
        id: FAM.qr,
        label: "QR",
        x: qr.x,
        y: qr.y,
        w: pct(qsz, W),
        h: pct(qsz, H),
        rot,
        fan: 0,
        lock: false,
        restX: qr.restX,
        restY: qr.restY,
        ox: "sQrPosX",
        oy: "sQrPosY",
        size: "sQrSz",
      });
      const wt = home(90, "sWtPosX", "sWtPosY");
      boxes.push({
        id: FAM.bwt,
        label: "Weight",
        x: wt.x,
        y: wt.y,
        w: cw,
        h: 16,
        rot,
        fan: 0,
        lock: false,
        restX: wt.restX,
        restY: wt.restY,
        ox: "sWtPosX",
        oy: "sWtPosY",
      });
      continue;
    }
    const at = meta.ox ? home(50, meta.ox, meta.oy) : { x: restX, y: 50, restX, restY: 50 };
    boxes.push({
      id: meta.id,
      label: meta.label,
      x: at.x,
      y: at.y,
      w: cw,
      h: 78,
      rot,
      fan: 0,
      lock: false,
      restX: at.restX,
      restY: at.restY,
      ox: meta.ox || undefined,
      oy: meta.oy || undefined,
    });
  }
  return boxes;
}

function taperPlaced(
  g: TaperGeo,
  state: LabelState,
  deg: number,
  radius: number,
  ox: string,
  oy: string,
  rot: number,
) {
  const p = fanXy(g, deg, radius);
  const rest = vbPct(g, p.x, p.y);
  const world = rotOffset(n(state, ox, 0), n(state, oy, 0), rot);
  return {
    x: rest.x + pct(world.x, g.vbW),
    y: rest.y + pct(world.y, g.vbH),
    restX: rest.x,
    restY: rest.y,
    rot,
  };
}

export function taperBoxes(state: LabelState): FamilyBox[] {
  const { g, secs } = taperSectors(state);
  const boxes: FamilyBox[] = [];
  for (const sec of secs) {
    const meta = WRAP_META[sec.k] || { id: `__fam:sec${sec.k}`, label: `Section ${sec.k}`, ox: "", oy: "" };
    const userRot = n(state, `sSec${sec.k}Rot`, 0);
    const rot = sec.mid + userRot;
    const midR = (g.R1 + g.R2) / 2;
    const w = g.vbW ? (sec.fW / g.vbW) * 100 * 0.72 : 14;
    const h = g.vbH ? (sec.fH / g.vbH) * 100 * 0.55 : 18;
    if (sec.k === "3") {
      const logoSz = n(state, "sLogoSz", 48);
      const logoAt = taperPlaced(g, state, rot, g.R2 + (g.R1 - g.R2) * 0.72, "sLogoPosX", "sLogoPosY", rot);
      boxes.push({
        id: FAM.blogo,
        label: "Logo",
        x: logoAt.x,
        y: logoAt.y,
        w: g.vbW ? (logoSz / g.vbW) * 100 : 8,
        h: g.vbH ? (logoSz / g.vbH) * 100 : 8,
        rot: rot + n(state, "sLogoRot", 0),
        fan: sec.mid,
        lock: false,
        restX: logoAt.restX,
        restY: logoAt.restY,
        ox: "sLogoPosX",
        oy: "sLogoPosY",
        size: "sLogoSz",
      });
      const nameOwn = state.sNamePosX != null && String(state.sNamePosX) !== "";
      const nameAt = taperPlaced(
        g,
        state,
        rot,
        g.R2 + (g.R1 - g.R2) * 0.38,
        nameOwn ? "sNamePosX" : "sLogoPosX",
        nameOwn ? "sNamePosY" : "sLogoPosY",
        rot,
      );
      boxes.push({
        id: FAM.bname,
        label: "Brand",
        x: nameAt.x,
        y: nameAt.y,
        w,
        h: h * 0.7,
        rot: rot + n(state, "sNameRot", 0),
        fan: sec.mid,
        lock: false,
        restX: nameAt.restX,
        restY: nameAt.restY,
        ox: "sNamePosX",
        oy: "sNamePosY",
      });
      continue;
    }
    if (sec.k === "5") {
      const dateAt = taperPlaced(g, state, rot, g.R2 + (g.R1 - g.R2) * 0.62, "sDatePosX", "sDatePosY", rot);
      boxes.push({
        id: FAM.bdates,
        label: "Dates",
        x: dateAt.x,
        y: dateAt.y,
        w,
        h: h * 0.7,
        rot,
        fan: sec.mid,
        lock: false,
        restX: dateAt.restX,
        restY: dateAt.restY,
        ox: "sDatePosX",
        oy: "sDatePosY",
      });
      const qrAt = taperPlaced(g, state, rot, g.R2 + (g.R1 - g.R2) * 0.28, "sQrPosX", "sQrPosY", rot);
      const qsz = n(state, "sQrSz", 44);
      boxes.push({
        id: FAM.qr,
        label: "QR",
        x: qrAt.x,
        y: qrAt.y,
        w: g.vbW ? (qsz / g.vbW) * 100 : 8,
        h: g.vbH ? (qsz / g.vbH) * 100 : 8,
        rot,
        fan: sec.mid,
        lock: false,
        restX: qrAt.restX,
        restY: qrAt.restY,
        ox: "sQrPosX",
        oy: "sQrPosY",
        size: "sQrSz",
      });
      const wtAt = taperPlaced(g, state, rot, g.R2 + (g.R1 - g.R2) * 0.12, "sWtPosX", "sWtPosY", rot);
      boxes.push({
        id: FAM.bwt,
        label: "Weight",
        x: wtAt.x,
        y: wtAt.y,
        w,
        h: h * 0.35,
        rot,
        fan: sec.mid,
        lock: false,
        restX: wtAt.restX,
        restY: wtAt.restY,
        ox: "sWtPosX",
        oy: "sWtPosY",
      });
      continue;
    }
    const at = meta.ox
      ? taperPlaced(g, state, rot, midR, meta.ox, meta.oy, rot)
      : (() => {
          const p = vbPct(g, fanXy(g, rot, midR).x, fanXy(g, rot, midR).y);
          return { x: p.x, y: p.y, restX: p.x, restY: p.y, rot };
        })();
    boxes.push({
      id: meta.id,
      label: meta.label,
      x: at.x,
      y: at.y,
      w,
      h,
      rot,
      fan: sec.mid,
      lock: false,
      restX: at.restX,
      restY: at.restY,
      ox: meta.ox || undefined,
      oy: meta.oy || undefined,
    });
  }
  return boxes;
}

export function familyBoxes(template: LabelTemplate): FamilyBox[] {
  const face = previewFace(template);
  if (face === "circle") return circleBoxes(template.state);
  if (face === "top") return topBoxes(template.state);
  if (face === "taper") return taperBoxes(template.state);
  if (face === "back") return backBoxes(template.state);
  return [];
}

export function familyBoxById(template: LabelTemplate, id: string) {
  return familyBoxes(template).find((b) => b.id === id);
}

export function moveFamilyItem(template: LabelTemplate, id: string, x: number, y: number): LabelState {
  const box = familyBoxById(template, id);
  if (!box?.ox || !box.oy) return template.state;
  const board = artboardOf(template);
  const W = board.wCm * PPC;
  const H = board.hCm * PPC;
  const face = previewFace(template);
  const twist = face === "taper" || face === "back" ? box.rot || 0 : 0;
  const local = unrotOffset(((x - box.restX) / 100) * W, ((y - box.restY) / 100) * H, twist);
  return {
    ...template.state,
    [box.ox]: String(Math.round(local.x)),
    [box.oy]: String(Math.round(local.y)),
  };
}

export function resizeFamilyItem(template: LabelTemplate, id: string, w: number, h: number): LabelState {
  const box = familyBoxById(template, id);
  if (!box) return template.state;
  const board = artboardOf(template);
  const px = { W: board.wCm * PPC, H: board.hCm * PPC };
  const next: LabelState = { ...template.state };
  if (box.size) next[box.size] = String(Math.max(8, Math.round((Math.max(w, h) / 100) * px.W)));
  if (box.wKey) next[box.wKey] = String(Math.max(8, Math.round((w / 100) * px.W)));
  if (box.hKey) next[box.hKey] = String(Math.max(8, Math.round((h / 100) * px.H)));
  return next;
}

const ROT_KEYS: Record<string, string> = {
  [FAM.logo]: "sCLogoRot",
  [FAM.brand]: "sCBrandRot",
  [FAM.flavor]: "sCFlavorRot",
  [FAM.photo]: "sCProdRot",
  [FAM.weight]: "sCWtRot",
  [FAM.dates]: "sCDateRot",
  [FAM.tlogo]: "sTLogoRot",
  [FAM.ttitle]: "sTTitleRot",
  [FAM.tsub]: "sTSubRot",
  [FAM.ing]: "sSec1Rot",
  [FAM.nut]: "sSec2Rot",
  [FAM.blogo]: "sLogoRot",
  [FAM.bname]: "sNameRot",
  [FAM.tip]: "sSec4Rot",
  [FAM.bdates]: "sSec5Rot",
  [FAM.cus]: "sSec6Rot",
};

export function rotateFamilyItem(template: LabelTemplate, id: string, rot: number): LabelState {
  const key = ROT_KEYS[id];
  if (!key) return template.state;
  const box = familyBoxById(template, id);
  let a = (rot - (box?.fan || 0)) % 360;
  if (id === FAM.blogo || id === FAM.bname) a -= n(template.state, "sSec3Rot", 0);
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return { ...template.state, [key]: String(Math.round(a)) };
}

export function familyRotKey(id: string) {
  return ROT_KEYS[id] || "";
}
