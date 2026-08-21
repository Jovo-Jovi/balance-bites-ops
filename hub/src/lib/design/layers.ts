import { BG_MORE, BG_SLOTS, usableImage } from "./art";
import { getIcon } from "./icons";
import { bgPanKeys, productPhotoBox } from "./preview";
import type { LabelState } from "./types";

export const PHOTO_LAYER = "__photo__";
export const QR_LAYER = "__qr__";

export function bgLayerId(field: string) {
  return `__bg:${field}`;
}

export type LayerKind = "part" | "zone" | "stamp" | "photo" | "bg" | "qr";

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
  return kind || "Layer";
}

export function listLayers(state: LabelState): DesignLayer[] {
  const layers: DesignLayer[] = [];
  const comp = state._composite;
  if (comp) {
    for (const part of comp.parts || []) {
      layers.push({
        id: part.id,
        kind: "part",
        label: part.name || (part.type === "silhouette" ? "Cut shape" : part.type || "Shape"),
        z: part.z || 0,
        color: part.color,
        lock: true,
        removable: false,
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
        removable: zone.kind === "icon" && !zone.lock,
        letterStyle: zone.letterStyle,
      });
    }
  }
  for (const stamp of state._stamps || []) {
    layers.push({
      id: stamp.id,
      kind: "stamp",
      label: getIcon(stamp.iconId)?.label || stamp.iconId,
      z: stamp.z || 0,
      color: stamp.color,
      iconId: stamp.iconId,
      removable: true,
      letterStyle: stamp.letterStyle,
    });
  }
  if (usableImage(state.hxCProd) || String(state.hxCProd || "").startsWith("__asset__:")) {
    layers.push({
      id: PHOTO_LAYER,
      kind: "photo",
      label: "Product photo",
      z: 35,
      removable: false,
    });
  }
  if (usableImage(state.hxQr) || String(state.hxQr || "").startsWith("__asset__:")) {
    layers.push({
      id: QR_LAYER,
      kind: "qr",
      label: "QR / mark",
      z: 36,
      removable: false,
    });
  }
  for (const slot of [...BG_SLOTS, ...BG_MORE]) {
    if (slot.key === "hxQr") continue;
    const raw = state[slot.key];
    if (!usableImage(raw) && !String(raw || "").startsWith("__asset__:")) continue;
    layers.push({
      id: bgLayerId(slot.key),
      kind: "bg",
      label: slot.label,
      z: -5,
      removable: false,
    });
  }
  return layers.sort((a, b) => b.z - a.z || a.label.localeCompare(b.label));
}

export function listCanvasItems(state: LabelState, designType: string): CanvasItem[] {
  const items: CanvasItem[] = [];
  const circular = designType === "circular";
  for (const part of state._composite?.parts || []) {
    items.push({
      id: part.id,
      kind: "part",
      x: part.x,
      y: part.y,
      w: part.w,
      h: part.h,
      rot: part.rot,
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
      lock: Boolean(zone.lock) && zone.kind !== "image" && zone.kind !== "icon",
    });
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
      lock: false,
    });
  }
  if (usableImage(state.hxCProd) || String(state.hxCProd || "").startsWith("__asset__:")) {
    const box = productPhotoBox(state, circular);
    items.push({ id: PHOTO_LAYER, kind: "photo", ...box, lock: false });
  }
  if (usableImage(state.hxQr) || String(state.hxQr || "").startsWith("__asset__:")) {
    items.push({ id: QR_LAYER, kind: "qr", x: 86, y: 86, w: 16, h: 16, lock: false });
  }
  for (const slot of [...BG_SLOTS, ...BG_MORE]) {
    if (slot.key === "hxQr") continue;
    const raw = state[slot.key];
    if (!usableImage(raw) && !String(raw || "").startsWith("__asset__:")) continue;
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
  return items;
}

export function patchLayer(
  state: LabelState,
  id: string,
  patch: { color?: string; text?: string },
): LabelState {
  let next: LabelState = { ...state };
  if (next._stamps?.some((s) => s.id === id)) {
    next = {
      ...next,
      _stamps: next._stamps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    };
  }
  if (next._composite) {
    const zones = (next._composite.zones || []).map((z) => {
      if (z.id !== id) return z;
      return {
        ...z,
        color: patch.color ?? z.color,
        text: patch.text ?? z.text,
      };
    });
    const parts = (next._composite.parts || []).map((p) =>
      p.id === id && patch.color ? { ...p, color: patch.color } : p,
    );
    next = { ...next, _composite: { ...next._composite, zones, parts } };
    const zone = zones.find((z) => z.id === id);
    if (zone?.field && patch.text != null) {
      next = { ...next, [zone.field]: patch.text };
    }
  }
  return next;
}

export function moveLayer(state: LabelState, id: string, dir: -1 | 1): LabelState {
  const items: { id: string; z: number; kind: LayerKind }[] = [];
  for (const part of state._composite?.parts || []) items.push({ id: part.id, z: part.z || 0, kind: "part" });
  for (const zone of state._composite?.zones || []) items.push({ id: zone.id, z: zone.z || 0, kind: "zone" });
  for (const stamp of state._stamps || []) items.push({ id: stamp.id, z: stamp.z || 0, kind: "stamp" });
  items.sort((a, b) => a.z - b.z);
  const index = items.findIndex((item) => item.id === id);
  const swapWith = index + dir;
  if (index < 0 || swapWith < 0 || swapWith >= items.length) return state;
  const zA = items[index].z;
  const zB = items[swapWith].z;
  const nextZ = new Map<string, number>();
  if (zA === zB) {
    nextZ.set(items[index].id, zA + dir);
  } else {
    nextZ.set(items[index].id, zB);
    nextZ.set(items[swapWith].id, zA);
  }
  const applyZ = (itemId: string, z: number) => nextZ.get(itemId) ?? z;
  return {
    ...state,
    _stamps: (state._stamps || []).map((s) => ({ ...s, z: applyZ(s.id, s.z || 0) })),
    _composite: state._composite
      ? {
          ...state._composite,
          parts: (state._composite.parts || []).map((p) => ({ ...p, z: applyZ(p.id, p.z || 0) })),
          zones: (state._composite.zones || []).map((z) => ({ ...z, z: applyZ(z.id, z.z || 0) })),
        }
      : state._composite,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function moveItem(state: LabelState, id: string, x: number, y: number): LabelState {
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
  return {
    ...state,
    _stamps: (state._stamps || []).map((s) => (s.id === id ? { ...s, x: nx, y: ny } : s)),
    _composite: state._composite
      ? {
          ...state._composite,
          parts: (state._composite.parts || []).map((p) => (p.id === id ? { ...p, x: nx, y: ny } : p)),
          zones: (state._composite.zones || []).map((z) => (z.id === id ? { ...z, x: nx, y: ny } : z)),
        }
      : state._composite,
  };
}

export function resizeItem(state: LabelState, id: string, w: number, h: number): LabelState {
  const nw = clamp(w, 4, 120);
  const nh = clamp(h, 4, 120);
  if (id === PHOTO_LAYER) {
    return { ...state, sCProdSz: String(Math.round(nw / 0.45)) };
  }
  if (id.startsWith("__bg:")) {
    const field = id.slice(5);
    const slot = [...BG_SLOTS, ...BG_MORE].find((s) => s.key === field);
    if (!slot?.zoom) return state;
    return { ...state, [slot.zoom]: String(Math.round(nw)) };
  }
  return {
    ...state,
    _stamps: (state._stamps || []).map((s) => (s.id === id ? { ...s, w: nw, h: nh } : s)),
    _composite: state._composite
      ? {
          ...state._composite,
          parts: (state._composite.parts || []).map((p) => (p.id === id ? { ...p, w: nw, h: nh } : p)),
          zones: (state._composite.zones || []).map((z) => (z.id === id ? { ...z, w: nw, h: nh } : z)),
        }
      : state._composite,
  };
}

export function stickerCopyFields(designType: string, state: LabelState) {
  const comp = state._composite;
  if (designType === "composite" && comp?.zones?.length) {
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
  if (designType === "rect_top" || designType === "taper_top") {
    return [
      { id: "eBrand", label: "Brand", text: String(state.eBrand || ""), color: "", field: "eBrand" },
      { id: "eName1", label: "Name", text: String(state.eName1 || ""), color: "", field: "eName1" },
      { id: "eName2", label: "Name 2", text: String(state.eName2 || ""), color: "", field: "eName2" },
    ];
  }
  return [
    { id: "eCBrand1", label: "Brand", text: String(state.eCBrand1 || state.eBrand || ""), color: "", field: "eCBrand1" },
    {
      id: "eCFlavorTxt",
      label: "Flavor",
      text: String(state.eCFlavorTxt || state.eName1 || ""),
      color: "",
      field: "eCFlavorTxt",
    },
    { id: "eWeight", label: "Weight", text: String(state.eWeight || ""), color: "", field: "eWeight" },
  ];
}
