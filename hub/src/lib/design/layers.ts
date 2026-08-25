import { findBlock, parseBlockLayerId, sectionOrder } from "./blocks";
import { BG_MORE, BG_SLOTS, compositeShowsProductPhoto, usableImage } from "./art";
import { layersInLayerGroup, partFillPath, recomputeUnion } from "./boolean-cut";
import { getIcon } from "./icons";
import { FAM, familyBoxes, familyBoxById, familyTextField, flag, moveFamilyItem, previewFace, resizeFamilyItem, rotateFamilyItem, s, wrapLayerBorderKeys } from "./layout";
import { bgPanKeys, isCutBlack, productPhotoBox, scalePathAbout, translatePathD } from "./preview";
import { isAssetRef } from "./templates";
import type { CompositeBlob, CompositePart, LabelState, LabelTemplate } from "./types";

export const PHOTO_LAYER = "__photo__";
export const QR_LAYER = "__qr__";
export const CUT_LAYER = "__cut__";

export function bgLayerId(field: string) {
  return `__bg:${field}`;
}

export type LayerKind = "part" | "zone" | "stamp" | "photo" | "bg" | "qr" | "cut";

export type DesignLayer = {
  id: string;
  kind: LayerKind;
  label: string;
  z: number;
  color?: string;
  textColor?: string;
  iconId?: string;
  text?: string;
  field?: string;
  lock?: boolean;
  removable: boolean;
  letterStyle?: string;
};

export type CanvasItem = {
  id: string;
  kind: LayerKind;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  fan?: number;
  z?: number;
  lock: boolean;
};

function num(state: LabelState, key: string, fallback: number) {
  const n = Number(state[key]);
  return Number.isFinite(n) ? n : fallback;
}

function zoneLabel(kind: string, label: string, iconId?: string) {
  if (label) return label;
  if (kind === "icon") return getIcon(iconId)?.label || "Icon";
  if (kind === "logo") return "Logo";
  if (kind === "text") return "Text";
  if (kind === "image") return "Photo";
  return kind || "Layer";
}

export function canvasEditText(template: LabelTemplate, id: string): { value: string; multiline: boolean } | null {
  const named = parseBlockLayerId(id);
  if (named) {
    const block = findBlock(template.state, named);
    return { value: block?.fields[0]?.en || "", multiline: true };
  }
  const fam = familyTextField(id);
  if (fam) return { value: s(template.state, fam.field), multiline: fam.multiline };
  const zone = template.state._composite?.zones?.find((z) => z.id === id);
  if (zone && (zone.kind === "text" || zone.kind === "logo")) {
    const fromField = zone.field ? s(template.state, zone.field) : "";
    return { value: String(zone.text ?? fromField), multiline: zone.kind === "text" };
  }
  return null;
}

export function listLayers(template: LabelTemplate): DesignLayer[] {
  const state = template.state;
  const layers: DesignLayer[] = [
    {
      id: CUT_LAYER,
      kind: "cut",
      label: "Print cut",
      z: 1000,
      color: String(state.cCutStroke || "#c9a84c"),
      lock: true,
      removable: false,
    },
  ];
  const face = previewFace(template);
  if (face !== "composite") {
    familyBoxes(template).forEach((box, i) => {
      layers.push({
        id: box.id,
        kind: box.id === PHOTO_LAYER ? "photo" : box.id === QR_LAYER ? "qr" : "zone",
        label: box.label,
        z: 40 - i,
        color: box.id === FAM.blogo ? s(state, "cLogoCircle", "#ffffff") : undefined,
        lock: box.lock,
        removable: Boolean(wrapRecipeChkForLayer(box.id) || parseBlockLayerId(box.id)),
      });
    });
  }
  const comp = face === "composite" ? state._composite : undefined;
  if (comp) {
    const partCount = (comp.parts || []).length;
    for (const part of comp.parts || []) {
      layers.push({
        id: part.id,
        kind: "part",
        label: part.name || (part.type === "silhouette" ? "Cut shape" : part.type || "Shape"),
        z: part.z || 0,
        color: part.color,
        lock: Boolean(part.lock),
        removable: partCount > 1 && !part.lock,
      });
    }
    for (const zone of comp.zones || []) {
      layers.push({
        id: zone.id,
        kind: "zone",
        label: zoneLabel(zone.kind, zone.label || "", zone.iconId),
        z: zone.z || 0,
        color: zone.color,
        textColor: zone.textColor,
        iconId: zone.iconId,
        text: zone.text,
        field: zone.field,
        lock: zone.lock,
        removable: !zone.lock,
        letterStyle: zone.letterStyle,
      });
    }
  }
  for (const stamp of state._stamps || []) {
    layers.push({
      id: stamp.id,
      kind: "stamp",
      label: stamp.label || getIcon(stamp.iconId)?.label || (stamp.src ? "Character" : stamp.iconId),
      z: stamp.z || 0,
      color: stamp.color,
      iconId: stamp.iconId,
      removable: true,
      letterStyle: stamp.letterStyle,
    });
  }
  if (face === "composite") {
  if (compositeShowsProductPhoto(state)) {
    layers.push({
      id: PHOTO_LAYER,
      kind: "photo",
      label: "Product photo",
      z: 0.5,
      removable: false,
    });
  }
  if (usableImage(state.hxQr) || isAssetRef(state.hxQr)) {
    layers.push({
      id: QR_LAYER,
      kind: "qr",
      label: "QR / mark",
      z: 100,
      removable: false,
    });
  }
  for (const slot of [...BG_SLOTS, ...BG_MORE]) {
    if (slot.key === "hxQr") continue;
    const raw = state[slot.key];
    if (!usableImage(raw) && !isAssetRef(raw)) continue;
    layers.push({
      id: bgLayerId(slot.key),
      kind: "bg",
      label: slot.label,
      z: -5,
      removable: false,
    });
  }
  }
  return layers.sort((a, b) => b.z - a.z || a.label.localeCompare(b.label));
}

export function listCanvasItems(template: LabelTemplate): CanvasItem[] {
  const state = template.state;
  const designType = template.designType;
  const face = previewFace(template);
  const items: CanvasItem[] = [];
  if (face !== "composite") {
    for (const box of familyBoxes(template)) {
      items.push({
        id: box.id,
        kind: box.id === PHOTO_LAYER ? "photo" : box.id === QR_LAYER ? "qr" : "zone",
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        rot: box.rot,
        fan: box.fan,
        lock: box.lock,
      });
    }
  }
  const circular = designType === "circular";
  if (face === "composite") {
  for (const part of state._composite?.parts || []) {
    items.push({
      id: part.id,
      kind: "part",
      x: part.x,
      y: part.y,
      w: part.w,
      h: part.h,
      rot: part.rot,
      z: part.z || 0,
      lock: Boolean(part.lock) && part.showImage !== true,
    });
  }
  for (const zone of state._composite?.zones || []) {
    items.push({
      id: zone.id,
      kind: "zone",
      x: zone.x,
      y: zone.y,
      w: zone.w,
      h: zone.h,
      rot: zone.rot,
      z: zone.z || 0,
      lock: Boolean(zone.lock) && zone.kind !== "image" && zone.kind !== "icon",
    });
  }
  }
  for (const stamp of state._stamps || []) {
    items.push({
      id: stamp.id,
      kind: "stamp",
      x: stamp.x,
      y: stamp.y,
      w: stamp.w,
      h: stamp.h,
      rot: stamp.rot,
      z: stamp.z || 0,
      lock: false,
    });
  }
  if (face === "composite") {
  if (compositeShowsProductPhoto(state)) {
    const box = productPhotoBox(state, circular);
    items.push({ id: PHOTO_LAYER, kind: "photo", ...box, z: 0.5, lock: false });
  }
  if (usableImage(state.hxQr) || isAssetRef(state.hxQr)) {
    const qw = Math.max(8, num(state, "sQRSize", 16));
    items.push({
      id: QR_LAYER,
      kind: "qr",
      x: num(state, "sQRX", 86),
      y: num(state, "sQRY", 86),
      w: qw,
      h: qw,
      z: 100,
      lock: false,
    });
  }
  for (const slot of [...BG_SLOTS, ...BG_MORE]) {
    if (slot.key === "hxQr") continue;
    const raw = state[slot.key];
    if (!usableImage(raw) && !isAssetRef(raw)) continue;
    const zoomKey = slot.zoom;
    const zoom = zoomKey ? Math.max(0.05, num(state, zoomKey, 100) / 100) : 1;
    const size = 100 * zoom;
    const pan = bgPanKeys(slot.key);
    items.push({
      id: bgLayerId(slot.key),
      kind: "bg",
      x: num(state, pan.x, 50),
      y: num(state, pan.y, 50),
      w: size,
      h: size,
      lock: false,
    });
  }
  }
  return items.sort((a, b) => (a.z || 0) - (b.z || 0) || a.id.localeCompare(b.id));
}

export type LayerPatch = {
  color?: string;
  text?: string;
  borderWidth?: number;
  borderColor?: string;
  size?: number;
};

export type LayerSize = {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
};

type SizeSpec = {
  key: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  fallback: number;
};

const SIZE_BY_ID: Record<string, SizeSpec> = {
  [FAM.ing]: { key: "sIngScale", min: 0.5, max: 2, step: 0.05, suffix: "×", fallback: 1 },
  [FAM.nut]: { key: "sNutScale", min: 0.5, max: 2, step: 0.05, suffix: "×", fallback: 1 },
  [FAM.blogo]: { key: "sLogoSz", min: 20, max: 90, step: 1, suffix: "px", fallback: 48 },
  [FAM.bname]: { key: "sNameFS", min: 6, max: 36, step: 0.5, suffix: "px", fallback: 14 },
  [FAM.tip]: { key: "sTipFS", min: 4, max: 16, step: 0.5, suffix: "px", fallback: 6.5 },
  [FAM.bdates]: { key: "sDateScale", min: 0.5, max: 2, step: 0.05, suffix: "×", fallback: 1 },
  [FAM.qr]: { key: "sQrSz", min: 16, max: 90, step: 1, suffix: "px", fallback: 44 },
  [FAM.bwt]: { key: "sWtFS", min: 4, max: 18, step: 0.5, suffix: "px", fallback: 8 },
  [FAM.cus]: { key: "sTipFS", min: 4, max: 16, step: 0.5, suffix: "px", fallback: 6.5 },
  [FAM.logo]: { key: "sCLogoSz", min: 15, max: 80, step: 1, suffix: "px", fallback: 45 },
  [FAM.brand]: { key: "sCBrandFS", min: 8, max: 40, step: 0.5, suffix: "px", fallback: 20 },
  [FAM.flavor]: { key: "sCFlavorFS", min: 6, max: 36, step: 0.5, suffix: "px", fallback: 14 },
  [FAM.photo]: { key: "sCProdSz", min: 20, max: 150, step: 1, suffix: "px", fallback: 80 },
  [FAM.weight]: { key: "sCWtFS", min: 4, max: 16, step: 0.5, suffix: "px", fallback: 8 },
  [FAM.dates]: { key: "sCDateFS", min: 4, max: 14, step: 0.5, suffix: "px", fallback: 6 },
  [FAM.tlogo]: { key: "sTCircleSz", min: 15, max: 70, step: 1, suffix: "px", fallback: 32 },
  [FAM.ttitle]: { key: "sTTitleFS", min: 10, max: 40, step: 0.5, suffix: "px", fallback: 20 },
  [FAM.tsub]: { key: "sTSubFS", min: 4, max: 16, step: 0.5, suffix: "px", fallback: 7 },
};

function sizeSpecFor(template: LabelTemplate, id: string): SizeSpec | undefined {
  const spec = SIZE_BY_ID[id];
  if (!spec) return undefined;
  if (previewFace(template) === "composite" && id === QR_LAYER) return undefined;
  return spec;
}

function roundSize(value: number, step: number) {
  const n = step < 1 ? Math.round(value / step) * step : Math.round(value);
  return Number(n.toFixed(step < 1 ? 2 : 0));
}

export function layerSize(template: LabelTemplate, id: string): LayerSize | null {
  if (id === CUT_LAYER) return null;
  const spec = sizeSpecFor(template, id);
  if (spec) {
    return {
      value: num(template.state, spec.key, spec.fallback),
      min: spec.min,
      max: spec.max,
      step: spec.step,
      suffix: spec.suffix,
    };
  }
  if (id === PHOTO_LAYER) {
    return { value: num(template.state, "sCProdSz", 80), min: 20, max: 150, step: 1, suffix: "px" };
  }
  if (id === QR_LAYER) {
    return { value: num(template.state, "sQRSize", 16), min: 8, max: 50, step: 1, suffix: "%" };
  }
  if (id.startsWith("__bg:")) {
    const field = id.slice(5);
    const slot = [...BG_SLOTS, ...BG_MORE].find((s) => s.key === field);
    if (!slot?.zoom) return null;
    return { value: num(template.state, slot.zoom, 100), min: 20, max: 400, step: 5, suffix: "%" };
  }
  const item = listCanvasItems(template).find((it) => it.id === id);
  if (!item) return null;
  return { value: Math.round(Math.max(item.w, item.h)), min: 4, max: 120, step: 1, suffix: "%" };
}

function scaleBox<T extends { w: number; h: number }>(item: T, size: number): T {
  const m = Math.max(item.w, item.h, 0.01);
  const f = clamp(size, 4, 120) / m;
  return { ...item, w: item.w * f, h: item.h * f };
}

type CutBox = { x: number; y: number; w: number; h: number };

function itemAffectsCut(blob: CompositeBlob, id: string) {
  if (blob.cutGroupId) {
    const g = layersInLayerGroup(blob, blob.cutGroupId);
    return g.parts.some((p) => p.id === id) || g.zones.some((z) => z.id === id);
  }
  if (blob.cutZoneId) return blob.cutZoneId === id;
  if (blob.cutSourceIds?.length) return blob.cutSourceIds.includes(id);
  return (blob.parts || []).some((p) => p.id === id);
}

function isSoleCutItem(blob: CompositeBlob, id: string) {
  if (blob.cutGroupId) {
    const g = layersInLayerGroup(blob, blob.cutGroupId);
    return g.parts.length + g.zones.length === 1 && itemAffectsCut(blob, id);
  }
  if (blob.cutZoneId) return blob.cutZoneId === id;
  if (blob.cutSourceIds?.length) return blob.cutSourceIds.length === 1 && blob.cutSourceIds[0] === id;
  return (blob.parts || []).length === 1 && blob.parts![0].id === id;
}

function groupIsEntireCut(blob: CompositeBlob, gid: string) {
  if (!gid) return false;
  if (blob.cutGroupId) return blob.cutGroupId === gid;
  const g = layersInLayerGroup(blob, gid);
  if (blob.cutZoneId) return g.zones.some((z) => z.id === blob.cutZoneId);
  const sources = blob.cutSourceIds?.length ? blob.cutSourceIds : (blob.parts || []).map((p) => p.id);
  return sources.length > 0 && sources.every((id) => g.parts.some((p) => p.id === id));
}

function refreshCutToBox(blob: CompositeBlob, id: string, oldBox: CutBox, newBox: CutBox): CompositeBlob {
  const next: CompositeBlob = { ...blob };
  if (!itemAffectsCut(next, id)) return next;
  const part = (next.parts || []).find((p) => p.id === id);
  if (isSoleCutItem(next, id) && part?.pathLocal) {
    return { ...next, unionPath: partFillPath(part) };
  }
  if (isSoleCutItem(next, id) && next.unionPath) {
    const sx = newBox.w / Math.max(oldBox.w, 0.01);
    const sy = newBox.h / Math.max(oldBox.h, 0.01);
    const dx = newBox.x - oldBox.x;
    const dy = newBox.y - oldBox.y;
    let d = next.unionPath;
    if (Math.abs(sx - 1) > 1e-6 || Math.abs(sy - 1) > 1e-6) {
      d = scalePathAbout(d, oldBox.x, oldBox.y, sx, sy);
    }
    if (dx || dy) d = translatePathD(d, dx, dy);
    return { ...next, unionPath: d };
  }
  recomputeUnion(next);
  return next;
}

function refreshCutTranslate(blob: CompositeBlob, id: string, dx: number, dy: number, gid?: string): CompositeBlob {
  const next: CompositeBlob = { ...blob };
  if (!dx && !dy) return next;
  const whole = (gid && groupIsEntireCut(next, gid)) || isSoleCutItem(next, id);
  const part = (next.parts || []).find((p) => p.id === id);
  if (whole && part?.pathLocal && isSoleCutItem(next, id)) {
    return { ...next, unionPath: partFillPath(part) };
  }
  if (whole && next.unionPath && (itemAffectsCut(next, id) || (gid && groupIsEntireCut(next, gid)))) {
    return { ...next, unionPath: translatePathD(next.unionPath, dx, dy) };
  }
  return next;
}

function refreshCutRotate(blob: CompositeBlob, id: string): CompositeBlob {
  const next: CompositeBlob = { ...blob };
  if (!itemAffectsCut(next, id) || !next.unionPath) return next;
  recomputeUnion(next);
  return next;
}

function applyLayerSize(state: LabelState, id: string, size: number): LabelState {
  const spec = SIZE_BY_ID[id];
  if (spec && !(state._composite && id === QR_LAYER)) {
    return { ...state, [spec.key]: String(roundSize(clamp(size, spec.min, spec.max), spec.step)) };
  }
  if (id === PHOTO_LAYER) {
    return { ...state, sCProdSz: String(Math.round(clamp(size, 20, 150))) };
  }
  if (id === QR_LAYER) {
    return { ...state, sQRSize: String(Math.round(clamp(size, 8, 50))) };
  }
  if (id.startsWith("__bg:")) {
    const field = id.slice(5);
    const slot = [...BG_SLOTS, ...BG_MORE].find((s) => s.key === field);
    if (!slot?.zoom) return state;
    return { ...state, [slot.zoom]: String(Math.round(clamp(size, 20, 400))) };
  }
  const stamps = (state._stamps || []).map((st) => (st.id === id ? scaleBox(st, size) : st));
  if (!state._composite) return { ...state, _stamps: stamps };
  const oldPart = (state._composite.parts || []).find((p) => p.id === id);
  const oldZone = (state._composite.zones || []).find((z) => z.id === id);
  const parts = (state._composite.parts || []).map((p) => (p.id === id ? scaleBox(p, size) : p));
  const zones = (state._composite.zones || []).map((z) => (z.id === id ? scaleBox(z, size) : z));
  const oldBox = oldPart || oldZone;
  const newBox = parts.find((p) => p.id === id) || zones.find((z) => z.id === id);
  const blob: CompositeBlob = { ...state._composite, parts, zones };
  return {
    ...state,
    _stamps: stamps,
    _composite: oldBox && newBox ? refreshCutToBox(blob, id, oldBox, newBox) : blob,
  };
}

const FAMILY_SECTION: Record<string, string> = {
  [FAM.ing]: "1",
  [FAM.nut]: "2",
  [FAM.blogo]: "3",
  [FAM.bname]: "3",
  [FAM.tip]: "4",
  [FAM.bdates]: "5",
  [FAM.qr]: "5",
  [FAM.bwt]: "5",
  [FAM.cus]: "6",
};

export function familySectionKey(id: string) {
  return FAMILY_SECTION[id] || parseBlockLayerId(id) || "";
}

const WRAP_RECIPE_PRIMARY = new Set<string>([FAM.ing, FAM.nut, FAM.blogo, FAM.tip, FAM.bdates, FAM.cus]);

/** chkS* for a wrap recipe layer. QR / weight / brand-name share a column and are not removed alone. */
export function wrapRecipeChkForLayer(id: string) {
  if (!WRAP_RECIPE_PRIMARY.has(id)) return "";
  const k = familySectionKey(id);
  return k ? `chkS${k}` : "";
}

function secOn(state: LabelState, k: string) {
  if (/^[1-5]$/.test(k)) return flag(state, `chkS${k}`, true);
  if (k === "6") return flag(state, "chkS6", false);
  return Boolean(findBlock(state, k));
}

function parseSecOrd(state: LabelState) {
  return sectionOrder(state);
}

function moveFamilySection(state: LabelState, sec: string, listDir: -1 | 1): LabelState {
  const order = parseSecOrd(state);
  const i = order.indexOf(sec);
  if (i < 0) return state;
  const step = -listDir;
  let j = i + step;
  while (j >= 0 && j < order.length && !secOn(state, order[j])) j += step;
  if (j < 0 || j >= order.length) return state;
  const next = order.slice();
  const a = next[i];
  const b = next[j];
  if (a == null || b == null) return state;
  next[i] = b;
  next[j] = a;
  return { ...state, eSecOrd: next.join(",") };
}

export type LayerBorder = {
  width: number;
  color: string;
  max: number;
  showColor: boolean;
};

function storedPartBorder(part: CompositePart) {
  if (part.borderWidth != null && part.borderWidth !== "") {
    const n = Number(part.borderWidth);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return part.type === "silhouette" ? 0 : 1.2;
}

export function layerBorder(template: LabelTemplate, id: string): LayerBorder | null {
  const state = template.state;
  if (id === FAM.blogo) {
    const ring = s(state, "eLogoCircleStyle", "full") === "ring";
    return {
      width: num(state, "sLogoCircleThick", 1.5),
      color: ring ? s(state, "cLogoCircle", "#ffffff") : s(state, "cLogoBorder", "#1a1a1a"),
      max: 12,
      showColor: !ring,
    };
  }
  if (id === FAM.logo || id === FAM.tlogo) {
    return {
      width: num(state, "tLogoCircleThick", 1.5),
      color: s(state, "cTxtMain", "#ffffff"),
      max: 12,
      showColor: false,
    };
  }
  const keys = wrapLayerBorderKeys(id);
  const face = previewFace(template);
  if (keys && (face === "back" || face === "taper")) {
    return {
      width: num(state, keys.w, 0),
      color: s(state, keys.c, "#ffffff"),
      max: 8,
      showColor: true,
    };
  }
  const part = state._composite?.parts?.find((p) => p.id === id);
  if (part) {
    const stored = storedPartBorder(part);
    const hideCut = part.type === "silhouette" && part.showImage && isCutBlack(String(part.borderColor || "#1a1a1a"));
    return {
      width: hideCut ? 0 : stored,
      color: part.borderColor || "#1a1a1a",
      max: 8,
      showColor: true,
    };
  }
  const zone = state._composite?.zones?.find((z) => z.id === id);
  if (zone) {
    if (zone.kind === "icon") {
      return { width: zone.strokeWidth ?? 2, color: zone.color || "#c9a84c", max: 8, showColor: false };
    }
    const bw = Number(zone.borderWidth ?? zone.strokeWidth);
    return {
      width: Number.isFinite(bw) ? bw : 0,
      color: zone.borderColor || "#1a1a1a",
      max: 8,
      showColor: true,
    };
  }
  const stamp = state._stamps?.find((st) => st.id === id);
  if (stamp) {
    return { width: stamp.strokeWidth ?? 2, color: stamp.color || "#c9a84c", max: 8, showColor: false };
  }
  return null;
}

export function patchLayer(state: LabelState, id: string, patch: LayerPatch): LabelState {
  let next: LabelState = patch.size != null ? applyLayerSize(state, id, patch.size) : { ...state };
  if (id === FAM.blogo) {
    if (patch.color) next = { ...next, cLogoCircle: patch.color };
    if (patch.borderWidth != null) next = { ...next, sLogoCircleThick: String(patch.borderWidth) };
    if (patch.borderColor) {
      if (s(next, "eLogoCircleStyle", "full") === "ring") {
        next = { ...next, cLogoCircle: patch.borderColor };
      } else {
        next = { ...next, cLogoBorder: patch.borderColor };
      }
    }
    return next;
  }
  if (id === FAM.logo || id === FAM.tlogo) {
    if (patch.borderWidth != null) next = { ...next, tLogoCircleThick: String(patch.borderWidth) };
    return next;
  }
  const keys = wrapLayerBorderKeys(id);
  if (keys && !(next._composite && id === QR_LAYER)) {
    if (patch.borderWidth != null) next = { ...next, [keys.w]: String(patch.borderWidth) };
    if (patch.borderColor) next = { ...next, [keys.c]: patch.borderColor };
    return next;
  }
  if (next._stamps?.some((st) => st.id === id)) {
    next = {
      ...next,
      _stamps: next._stamps.map((st) =>
        st.id === id
          ? {
              ...st,
              color: patch.color ?? st.color,
              strokeWidth: patch.borderWidth ?? st.strokeWidth,
            }
          : st,
      ),
    };
  }
  if (next._composite) {
    const zones = (next._composite.zones || []).map((z) => {
      if (z.id !== id) return z;
      return {
        ...z,
        color: patch.color ?? z.color,
        text: patch.text ?? z.text,
        strokeWidth: z.kind === "icon" || z.kind === "logo" ? (patch.borderWidth ?? z.strokeWidth) : z.strokeWidth,
        borderWidth: z.kind === "icon" ? z.borderWidth : (patch.borderWidth ?? z.borderWidth),
        borderColor: patch.borderColor ?? z.borderColor,
      };
    });
    const parts = (next._composite.parts || []).map((p) => {
      if (p.id !== id) return p;
      let borderColor = patch.borderColor ?? p.borderColor;
      let borderWidth = patch.borderWidth ?? p.borderWidth;
      if (patch.color) {
        return { ...p, color: patch.color, borderColor, borderWidth };
      }
      if (
        p.type === "silhouette" &&
        p.showImage &&
        patch.borderWidth != null &&
        patch.borderWidth > 0 &&
        isCutBlack(String(borderColor || "#1a1a1a"))
      ) {
        borderColor = "#c9a84c";
      }
      return { ...p, borderColor, borderWidth };
    });
    next = { ...next, _composite: { ...next._composite, zones, parts } };
    const zone = zones.find((z) => z.id === id);
    if (zone?.field && patch.text != null) {
      next = { ...next, [zone.field]: patch.text };
    }
  }
  return next;
}

export function moveLayer(template: LabelTemplate, id: string, dir: -1 | 1): LabelState {
  const sec = familySectionKey(id);
  const face = previewFace(template);
  if (sec && (face === "back" || face === "taper")) {
    return moveFamilySection(template.state, sec, dir);
  }
  const state = template.state;
  const items: { id: string; z: number; kind: LayerKind }[] = [];
  for (const part of state._composite?.parts || []) items.push({ id: part.id, z: part.z || 0, kind: "part" });
  for (const zone of state._composite?.zones || []) items.push({ id: zone.id, z: zone.z || 0, kind: "zone" });
  for (const stamp of state._stamps || []) items.push({ id: stamp.id, z: stamp.z || 0, kind: "stamp" });
  items.sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
  const index = items.findIndex((item) => item.id === id);
  const next = index + dir;
  if (index < 0 || next < 0 || next >= items.length) return state;
  const ordered = items.slice();
  const [moved] = ordered.splice(index, 1);
  ordered.splice(next, 0, moved);
  const zOf = new Map(ordered.map((item, i) => [item.id, i]));
  return {
    ...state,
    _stamps: (state._stamps || []).map((st) => ({ ...st, z: zOf.get(st.id) ?? (st.z || 0) })),
    _composite: state._composite
      ? {
          ...state._composite,
          parts: (state._composite.parts || []).map((p) => ({ ...p, z: zOf.get(p.id) ?? (p.z || 0) })),
          zones: (state._composite.zones || []).map((z) => ({ ...z, z: zOf.get(z.id) ?? (z.z || 0) })),
        }
      : state._composite,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function familyBoxByIdSafe(template: LabelTemplate, id: string) {
  return previewFace(template) !== "composite" && familyBoxById(template, id);
}

export function rotateItem(template: LabelTemplate, id: string, rot: number): LabelState {
  const state = template.state;
  let a = rot % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  a = Math.round(a);
  if (familyBoxByIdSafe(template, id)) return rotateFamilyItem(template, id, a);
  const stamps = (state._stamps || []).map((s) => (s.id === id ? { ...s, rot: a } : s));
  if (!state._composite) return { ...state, _stamps: stamps };
  const parts = (state._composite.parts || []).map((p) => (p.id === id ? { ...p, rot: a } : p));
  const zones = (state._composite.zones || []).map((z) => (z.id === id ? { ...z, rot: a } : z));
  return {
    ...state,
    _stamps: stamps,
    _composite: refreshCutRotate({ ...state._composite, parts, zones }, id),
  };
}

export function moveItem(template: LabelTemplate, id: string, x: number, y: number): LabelState {
  if (familyBoxByIdSafe(template, id)) return moveFamilyItem(template, id, x, y);
  const state = template.state;
  const nx = clamp(x, -10, 110);
  const ny = clamp(y, -10, 110);
  if (id === PHOTO_LAYER) {
    return { ...state, sCProdX: String(Math.round(nx)), sCProdY: String(Math.round(ny)) };
  }
  if (id === QR_LAYER) {
    return { ...state, sQRX: String(nx), sQRY: String(ny) };
  }
  if (id.startsWith("__bg:")) {
    const field = id.slice(5);
    const pan = bgPanKeys(field);
    return { ...state, [pan.x]: String(nx), [pan.y]: String(ny) };
  }
  const part = state._composite?.parts?.find((p) => p.id === id);
  const zone = state._composite?.zones?.find((z) => z.id === id);
  const gid = part?.layerGroup || zone?.layerGroup;
  if (gid && state._composite) {
    const src = part || zone;
    const dx = nx - (src?.x || 0);
    const dy = ny - (src?.y || 0);
    const parts = (state._composite.parts || []).map((p) =>
      p.layerGroup === gid ? { ...p, x: p.x + dx, y: p.y + dy } : p,
    );
    const zones = (state._composite.zones || []).map((z) =>
      z.layerGroup === gid ? { ...z, x: z.x + dx, y: z.y + dy } : z,
    );
    return {
      ...state,
      _stamps: (state._stamps || []).map((s) => (s.id === id ? { ...s, x: nx, y: ny } : s)),
      _composite: refreshCutTranslate({ ...state._composite, parts, zones }, id, dx, dy, gid),
    };
  }
  const stamps = (state._stamps || []).map((s) => (s.id === id ? { ...s, x: nx, y: ny } : s));
  if (!state._composite) return { ...state, _stamps: stamps };
  const oldPart = (state._composite.parts || []).find((p) => p.id === id);
  const oldZone = (state._composite.zones || []).find((z) => z.id === id);
  const parts = (state._composite.parts || []).map((p) => (p.id === id ? { ...p, x: nx, y: ny } : p));
  const zones = (state._composite.zones || []).map((z) => (z.id === id ? { ...z, x: nx, y: ny } : z));
  const dx = nx - ((oldPart || oldZone)?.x ?? nx);
  const dy = ny - ((oldPart || oldZone)?.y ?? ny);
  return {
    ...state,
    _stamps: stamps,
    _composite: refreshCutTranslate({ ...state._composite, parts, zones }, id, dx, dy),
  };
}

export function resizeItem(template: LabelTemplate, id: string, w: number, h: number): LabelState {
  if (familyBoxByIdSafe(template, id)) return resizeFamilyItem(template, id, w, h);
  const state = template.state;
  const nw = clamp(w, 4, 120);
  const nh = clamp(h, 4, 120);
  if (id === PHOTO_LAYER) {
    return { ...state, sCProdSz: String(Math.round(nw / 0.45)) };
  }
  if (id === QR_LAYER) {
    return { ...state, sQRSize: String(Math.round(Math.max(nw, nh))) };
  }
  if (id.startsWith("__bg:")) {
    const field = id.slice(5);
    const slot = [...BG_SLOTS, ...BG_MORE].find((s) => s.key === field);
    if (!slot?.zoom) return state;
    return { ...state, [slot.zoom]: String(Math.round(nw)) };
  }
  const stamps = (state._stamps || []).map((s) => (s.id === id ? { ...s, w: nw, h: nh } : s));
  if (!state._composite) return { ...state, _stamps: stamps };
  const oldPart = (state._composite.parts || []).find((p) => p.id === id);
  const oldZone = (state._composite.zones || []).find((z) => z.id === id);
  const parts = (state._composite.parts || []).map((p) =>
    p.id === id ? (p.lockAspect ? scaleBox(p, Math.max(nw, nh)) : { ...p, w: nw, h: nh }) : p,
  );
  const zones = (state._composite.zones || []).map((z) =>
    z.id === id ? (z.lockAspect ? scaleBox(z, Math.max(nw, nh)) : { ...z, w: nw, h: nh }) : z,
  );
  const oldBox = oldPart || oldZone;
  const newBox = parts.find((p) => p.id === id) || zones.find((z) => z.id === id);
  const blob: CompositeBlob = { ...state._composite, parts, zones };
  return {
    ...state,
    _stamps: stamps,
    _composite: oldBox && newBox ? refreshCutToBox(blob, id, oldBox, newBox) : blob,
  };
}

export function stickerCopyFields(template: LabelTemplate) {
  const { state } = template;
  const face = previewFace(template);
  const comp = state._composite;
  if (face === "composite" && comp?.zones?.length) {
    return (comp.zones || [])
      .filter((z) => z.kind === "text" || z.kind === "logo")
      .sort((a, b) => (a.z || 0) - (b.z || 0))
      .map((z) => ({
        id: z.id,
        label: z.label || (z.kind === "logo" ? "Logo" : "Text"),
        text: String(z.text || ""),
        color: z.color || "#ffffff",
        field: z.field || "",
      }));
  }
  if (face === "top") {
    return [
      { id: "tLogoTxt", label: "Logo", text: String(state.tLogoTxt || ""), color: "", field: "tLogoTxt" },
      { id: "tTitle1", label: "Title", text: String(state.tTitle1 || ""), color: "", field: "tTitle1" },
      { id: "tTitle2", label: "Title 2", text: String(state.tTitle2 || ""), color: "", field: "tTitle2" },
      { id: "tSub1", label: "Subtitle", text: String(state.tSub1 || ""), color: "", field: "tSub1" },
      { id: "tSub2", label: "Subtitle 2", text: String(state.tSub2 || ""), color: "", field: "tSub2" },
    ];
  }
  if (face === "circle") {
    return [
      { id: "tLogoTxt", label: "Logo", text: String(state.tLogoTxt || ""), color: "", field: "tLogoTxt" },
      { id: "eCBrand1", label: "Brand", text: String(state.eCBrand1 || ""), color: "", field: "eCBrand1" },
      { id: "eCBrand2", label: "Brand 2", text: String(state.eCBrand2 || ""), color: "", field: "eCBrand2" },
      { id: "eCProdName", label: "Product", text: String(state.eCProdName || ""), color: "", field: "eCProdName" },
      { id: "eCFlavorTxt", label: "Flavor", text: String(state.eCFlavorTxt || ""), color: "", field: "eCFlavorTxt" },
      { id: "eWeight", label: "Weight", text: String(state.eWeight || ""), color: "", field: "eWeight" },
      { id: "eCDate1", label: "Date 1", text: String(state.eCDate1 || ""), color: "", field: "eCDate1" },
      { id: "eCDate2", label: "Date 2", text: String(state.eCDate2 || ""), color: "", field: "eCDate2" },
    ];
  }
  return [
    { id: "eBrand", label: "Brand", text: String(state.eBrand || ""), color: "", field: "eBrand" },
    { id: "eName1", label: "Name", text: String(state.eName1 || ""), color: "", field: "eName1" },
    { id: "eName2", label: "Name 2", text: String(state.eName2 || ""), color: "", field: "eName2" },
    { id: "eIngredients", label: "Ingredients", text: String(state.eIngredients || ""), color: "", field: "eIngredients" },
    { id: "eIngredientsAr", label: "Ingredients AR", text: String(state.eIngredientsAr || ""), color: "", field: "eIngredientsAr" },
    { id: "eWeight", label: "Weight", text: String(state.eWeight || ""), color: "", field: "eWeight" },
  ];
}
