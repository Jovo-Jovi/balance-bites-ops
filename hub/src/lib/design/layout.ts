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
  lock: boolean;
  restX: number;
  restY: number;
  ox?: string;
  oy?: string;
  size?: string;
  wKey?: string;
  hKey?: string;
};

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
  tip: "__fam:tip",
  bdates: "__fam:bdates",
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

export function topBoxes(state: LabelState): FamilyBox[] {
  const { W, H } = topPx(state);
  const boxes: FamilyBox[] = [];
  if (s(state, "tLogoTxt")) {
    const sz = n(state, "sTCircleSz", 32);
    boxes.push({
      id: FAM.tlogo,
      label: "Top logo",
      x: 50 + pct(n(state, "sTLogoX", 0), W),
      y: 32 + pct(n(state, "sTLogoY", 0), H),
      w: pct(sz, W),
      h: pct(sz, H),
      rot: n(state, "sTLogoRot", 0),
      lock: false,
      restX: 50,
      restY: 32,
      ox: "sTLogoX",
      oy: "sTLogoY",
      size: "sTCircleSz",
    });
  }
  if (s(state, "tTitle1") || s(state, "tTitle2")) {
    boxes.push({
      id: FAM.ttitle,
      label: "Title",
      x: 50 + pct(n(state, "sTTitleX", 0), W),
      y: 58 + pct(n(state, "sTTitleY", 0), H),
      w: pct(n(state, "sTTitleW", 180), W),
      h: pct(n(state, "sTTitleH", 52), H),
      rot: n(state, "sTTitleRot", 0),
      lock: false,
      restX: 50,
      restY: 58,
      ox: "sTTitleX",
      oy: "sTTitleY",
      wKey: "sTTitleW",
      hKey: "sTTitleH",
    });
  }
  if (s(state, "tSub1") || s(state, "tSub2")) {
    boxes.push({
      id: FAM.tsub,
      label: "Subtitle",
      x: 50 + pct(n(state, "sTSubX", 0), W),
      y: 78 + pct(n(state, "sTSubY", 0), H),
      w: pct(n(state, "sTSubW", 160), W),
      h: pct(n(state, "sTSubH", 36), H),
      rot: n(state, "sTSubRot", 0),
      lock: false,
      restX: 50,
      restY: 78,
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
  const out: BackSection[] = [];
  for (const k of order) {
    if (!raw[k]?.on) continue;
    const w = Math.round(W * (raw[k].p / active));
    if (w <= 0) continue;
    out.push({ k, l: left, w });
    left += w;
  }
  return out;
}

export function backBoxes(state: LabelState): FamilyBox[] {
  const { W, H } = backPx(state);
  const labels: Record<string, string> = {
    "1": "Ingredients",
    "2": "Nutrition",
    "3": "Logo / brand",
    "4": "Tips",
    "5": "Dates",
    "6": "Custom",
  };
  const ids: Record<string, string> = {
    "1": FAM.ing,
    "2": FAM.nut,
    "3": FAM.blogo,
    "4": FAM.tip,
    "5": FAM.bdates,
  };
  const ox: Record<string, string> = {
    "1": "sIngPosX",
    "2": "sNutPosX",
    "3": "sLogoPosX",
    "4": "sTipPosX",
    "5": "sDatePosX",
  };
  const oy: Record<string, string> = {
    "1": "sIngPosY",
    "2": "sNutPosY",
    "3": "sLogoPosY",
    "4": "sTipPosY",
    "5": "sDatePosY",
  };
  return backSections(state, W).map((sec) => ({
    id: ids[sec.k] || `__fam:sec${sec.k}`,
    label: labels[sec.k] || `Section ${sec.k}`,
    x: pct(sec.l + sec.w / 2, W) + pct(n(state, ox[sec.k] || "", 0), W),
    y: 50 + pct(n(state, oy[sec.k] || "", 0), H),
    w: pct(sec.w, W),
    h: 100,
    rot: n(state, `sSec${sec.k}Rot`, 0),
    lock: false,
    restX: pct(sec.l + sec.w / 2, W),
    restY: 50,
    ox: ox[sec.k],
    oy: oy[sec.k],
  }));
}

export function taperBoxes(state: LabelState): FamilyBox[] {
  const g = calcTaper(state);
  const { W } = backPx(state);
  const labels: Record<string, string> = {
    "1": "Ingredients",
    "2": "Nutrition",
    "3": "Logo / brand",
    "4": "Tips",
    "5": "Dates",
    "6": "Custom",
  };
  const ids: Record<string, string> = {
    "1": FAM.ing,
    "2": FAM.nut,
    "3": FAM.blogo,
    "4": FAM.tip,
    "5": FAM.bdates,
  };
  const ox: Record<string, string> = {
    "1": "sIngPosX",
    "2": "sNutPosX",
    "3": "sLogoPosX",
    "4": "sTipPosX",
    "5": "sDatePosX",
  };
  const oy: Record<string, string> = {
    "1": "sIngPosY",
    "2": "sNutPosY",
    "3": "sLogoPosY",
    "4": "sTipPosY",
    "5": "sDatePosY",
  };
  const secs = backSections(state, W);
  const active = secs.reduce((sum, sec) => sum + sec.w, 0) || 1;
  let cur = -g.arcDeg / 2;
  return secs.map((sec) => {
    const span = g.arcDeg * (sec.w / active);
    const mid = cur + span / 2;
    cur += span;
    const r = (mid * Math.PI) / 180;
    const midR = (g.R1 + g.R2) / 2;
    const px = g.cx + midR * Math.sin(r);
    const py = g.cy - midR * Math.cos(r);
    const restX = g.vbW ? ((px - g.minX) / g.vbW) * 100 : 50;
    const restY = g.vbH ? ((py - g.minY) / g.vbH) * 100 : 50;
    const aPts: number[][] = [];
    for (const ang of [mid - span / 2, mid + span / 2, mid]) {
      const ar = (ang * Math.PI) / 180;
      aPts.push([g.cx + g.R1 * Math.sin(ar), g.cy - g.R1 * Math.cos(ar)]);
      aPts.push([g.cx + g.R2 * Math.sin(ar), g.cy - g.R2 * Math.cos(ar)]);
    }
    const xs = aPts.map((p) => p[0]);
    const ys = aPts.map((p) => p[1]);
    const fW = Math.max(...xs) - Math.min(...xs);
    const fH = Math.max(...ys) - Math.min(...ys);
    return {
      id: ids[sec.k] || `__fam:sec${sec.k}`,
      label: labels[sec.k] || `Section ${sec.k}`,
      x: restX + pct(n(state, ox[sec.k] || "", 0), g.vbW),
      y: restY + pct(n(state, oy[sec.k] || "", 0), g.vbH),
      w: g.vbW ? (fW / g.vbW) * 100 : 18,
      h: g.vbH ? (fH / g.vbH) * 100 : 24,
      rot: n(state, `sSec${sec.k}Rot`, 0),
      lock: false,
      restX,
      restY,
      ox: ox[sec.k],
      oy: oy[sec.k],
    };
  });
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
  return {
    ...template.state,
    [box.ox]: String(Math.round(((x - box.restX) / 100) * W)),
    [box.oy]: String(Math.round(((y - box.restY) / 100) * H)),
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
  [FAM.blogo]: "sSec3Rot",
  [FAM.tip]: "sSec4Rot",
  [FAM.bdates]: "sSec5Rot",
};

export function rotateFamilyItem(state: LabelState, id: string, rot: number): LabelState {
  const key = ROT_KEYS[id];
  if (!key) return state;
  let a = rot % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return { ...state, [key]: String(Math.round(a)) };
}

export function familyRotKey(id: string) {
  return ROT_KEYS[id] || "";
}
