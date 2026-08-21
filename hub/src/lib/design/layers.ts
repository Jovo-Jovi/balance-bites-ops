import { getIcon } from "./icons";
import type { LabelState } from "./types";

export type LayerKind = "part" | "zone" | "stamp";

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
};

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
    });
  }
  return layers.sort((a, b) => b.z - a.z || a.label.localeCompare(b.label));
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
