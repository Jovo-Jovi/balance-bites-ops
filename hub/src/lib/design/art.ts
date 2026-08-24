import { genId } from "@/lib/invoices/helpers";
import { resolveArtSrc } from "./art-presets";
import { getIcon } from "./icons";
import { isAssetRef } from "./templates";
import type { CompositeZone, LabelStamp, LabelState } from "./types";

export const MAX_BG_BYTES = 6 * 1024 * 1024;

export const ICON_SIZES = [
  { id: "s", label: "S", pct: 14, stroke: 2.2 },
  { id: "m", label: "M", pct: 22, stroke: 2 },
  { id: "l", label: "L", pct: 36, stroke: 1.65 },
  { id: "xl", label: "XL", pct: 52, stroke: 1.35 },
] as const;

export type IconSizeId = (typeof ICON_SIZES)[number]["id"];

export const BG_SLOTS = [
  {
    key: "hxBg1",
    opa: "sOpa1",
    zoom: "sZoom1",
    label: "Paper / texture",
    hint: "Clipped to the die-cut on every family.",
  },
  {
    key: "hxBg2",
    opa: "sOpa2",
    zoom: "sZoom2",
    label: "Overlay",
    hint: "Second layer on top of paper.",
  },
  {
    key: "hxCProd",
    opa: "",
    zoom: "",
    label: "Product photo",
    hint: "Shows on circular, composite, and other cuts.",
  },
] as const;

export const BG_MORE = [
  { key: "hxBg3", opa: "sOpa3", zoom: "sZoom3", label: "Layer 3" },
  { key: "hxBg4", opa: "sOpa4", zoom: "sZoom4", label: "Layer 4" },
  { key: "hxBg5", opa: "sOpa5", zoom: "sZoom5", label: "Layer 5" },
  { key: "hxQr", opa: "", zoom: "", label: "QR / mark" },
] as const;

export function iconSizeById(id: string) {
  return ICON_SIZES.find((s) => s.id === id) ?? ICON_SIZES[1];
}

export function usableImage(value: unknown, artKey?: string) {
  const preset = resolveArtSrc(value, artKey);
  if (preset) return preset;
  const s = String(value ?? "");
  if (!s || isAssetRef(s)) return "";
  if (
    s.startsWith("data:") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("blob:") ||
    s.startsWith("/")
  ) {
    return s;
  }
  return "";
}

export function previewImage(value: unknown, artKey: string | undefined, lite: boolean) {
  if (lite) return "";
  return usableImage(value, artKey);
}

export function syncPaperToSilhouette(state: LabelState): LabelState {
  if (!state._fillCutWithPaper || !state._composite?.parts?.length) return state;
  const src = String(state.hxBg1 ?? "");
  const parts = state._composite.parts.map((part, i) =>
    i === 0 ? { ...part, src, showImage: Boolean(usableImage(src) || isAssetRef(src)) } : part,
  );
  return { ...state, _composite: { ...state._composite, parts } };
}

export function setFillCutWithPaper(state: LabelState, on: boolean): LabelState {
  const next: LabelState = { ...state, _fillCutWithPaper: on };
  if (!on || !next._composite?.parts?.length) return next;
  return syncPaperToSilhouette(next);
}

export function applyIconToState(
  state: LabelState,
  iconId: string,
  sizeId: string,
  color: string,
  letterStyle?: string,
): LabelState {
  const icon = getIcon(iconId);
  if (!icon) return state;
  const size = iconSizeById(sizeId);
  const fill = color || String(state.cTxtMain || "#ffffff");
  const id = genId("ic");
  const style = icon.letter ? letterStyle || "fatty" : undefined;
  const stamp: LabelStamp = {
    id,
    iconId,
    x: 50,
    y: 50,
    w: size.pct,
    h: size.pct,
    color: fill,
    strokeWidth: size.stroke,
    sizeId: size.id,
    letterStyle: style,
    z: 40,
  };

  if (state._composite) {
    const zone: CompositeZone = {
      id,
      kind: "icon",
      iconId,
      x: 50,
      y: 50,
      w: size.pct,
      h: size.pct,
      color: fill,
      strokeWidth: size.stroke,
      letterStyle: style,
      z: 40,
      label: icon.label,
    };
    return {
      ...state,
      _composite: {
        ...state._composite,
        zones: [...(state._composite.zones || []), zone],
      },
    };
  }

  return { ...state, _stamps: [...(state._stamps || []), stamp] };
}

export function removeArtItem(state: LabelState, id: string): LabelState {
  const next: LabelState = {
    ...state,
    _stamps: (state._stamps || []).filter((s) => s.id !== id),
  };
  if (next._composite?.zones) {
    next._composite = {
      ...next._composite,
      zones: next._composite.zones.filter((z) => z.id !== id),
    };
  }
  return next;
}

export function placedArtItems(state: LabelState) {
  const stamps = (state._stamps || []).map((s) => ({
    id: s.id,
    iconId: s.iconId,
    label: getIcon(s.iconId)?.label || s.iconId,
  }));
  const zones = (state._composite?.zones || [])
    .filter((z) => z.kind === "icon" && z.iconId)
    .map((z) => ({
      id: z.id,
      iconId: String(z.iconId),
      label: getIcon(z.iconId)?.label || z.label || String(z.iconId),
    }));
  return [...stamps, ...zones];
}

export function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (file.size > MAX_BG_BYTES) {
      reject(new Error("Keep the image under 6 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export function imageZones(state: LabelState) {
  return (state._composite?.zones || []).filter((z) => z.kind === "image");
}

export function addProductPhotos(state: LabelState, srcs: string[]): LabelState {
  if (!srcs.length) return state;
  if (!state._composite) {
    return { ...state, hxCProd: srcs[0] };
  }
  const existing = imageZones(state).length;
  const extra: CompositeZone[] = srcs.map((src, i) => {
    const n = existing + i;
    return {
      id: genId("z"),
      kind: "image",
      x: 48 + (n % 4) * 5,
      y: 52 + (n % 4) * 4,
      w: 28,
      h: 28,
      z: 20 + n,
      label: `Photo ${n + 1}`,
      src,
      color: "#ffffff",
    };
  });
  return {
    ...state,
    _composite: {
      ...state._composite,
      zones: [...(state._composite.zones || []), ...extra],
    },
  };
}

export function setZoneSrc(state: LabelState, zoneId: string, src: string): LabelState {
  if (!state._composite) return state;
  return {
    ...state,
    _composite: {
      ...state._composite,
      zones: (state._composite.zones || []).map((z) => (z.id === zoneId ? { ...z, src } : z)),
    },
  };
}

export function hasExactArt(state: LabelState) {
  return (state._composite?.parts || []).some(
    (p) => Boolean(p.artKey) || p.showImage === true,
  );
}
