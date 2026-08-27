import { genId } from "@/lib/invoices/helpers";
import type { CompositeBlob, CompositePart, CompositeZone } from "./types";

/** Live `BBComposite.PART_TYPES` — code catalog, not Firestore. */
export const PART_TYPES = [
  { id: "circle", label: "Circle" },
  { id: "half_circle", label: "Half circle" },
  { id: "square", label: "Square" },
  { id: "rectangle", label: "Rectangle" },
  { id: "rounded_sq", label: "Round sq" },
  { id: "rounded_rect", label: "Round rect" },
  { id: "oval", label: "Oval" },
  { id: "half_oval", label: "Half oval" },
  { id: "diamond", label: "Diamond" },
  { id: "hexagon", label: "Hexagon" },
  { id: "star", label: "Star" },
  { id: "jelly_blob", label: "Jelly blob" },
  { id: "cloud", label: "Cloud" },
  { id: "heart", label: "Heart" },
  { id: "scallop", label: "Scallop" },
  { id: "teardrop", label: "Teardrop" },
  { id: "crescent", label: "Crescent" },
  { id: "blob", label: "Blob" },
] as const;

export type PartTypeId = (typeof PART_TYPES)[number]["id"];

export const MAX_OUTLINE_PARTS = 12;

/** Jelly Fruit scalloped die outline (0–100 local). Live `JELLY_BLOB_PATH`. */
export const JELLY_BLOB_PATH =
  "M25.53 1.15 L29.01 1.54 L30.75 2.50 L33.66 4.81 L38.49 6.15 L42.36 5.58 L44.10 5.00 L46.03 4.42 L53.00 3.85 L55.32 4.42 L57.25 5.19 L58.80 5.77 L60.54 6.54 L62.28 7.88 L64.60 9.62 L66.73 8.27 L70.21 7.69 L75.82 6.15 L79.50 3.27 L81.62 4.42 L82.21 6.15 L82.79 8.27 L83.95 10.19 L84.91 10.19 L86.46 10.96 L87.62 11.73 L90.72 14.81 L91.30 17.69 L90.52 20.00 L90.91 21.73 L91.49 23.27 L92.07 25.19 L92.65 28.08 L93.23 32.12 L94.00 34.04 L94.78 35.96 L95.74 37.69 L96.52 39.42 L97.10 41.15 L97.68 42.88 L98.26 45.77 L98.84 51.35 L98.26 56.54 L97.68 58.85 L97.10 60.77 L96.32 62.31 L95.36 64.23 L94.58 65.77 L93.42 67.31 L92.65 69.81 L92.46 75.19 L93.04 77.12 L93.62 79.62 L94.20 83.65 L94.39 91.35 L93.81 93.27 L91.49 96.15 L89.56 96.92 L87.23 97.50 L79.69 97.69 L76.21 97.12 L73.50 96.54 L71.37 96.92 L69.63 97.69 L67.70 98.27 L62.48 98.46 L60.54 97.88 L58.80 96.92 L56.29 95.00 L53.38 95.19 L51.84 95.77 L47.58 96.35 L39.46 97.12 L37.72 97.69 L34.04 97.50 L32.30 96.35 L29.98 93.65 L27.85 94.04 L26.31 94.81 L24.76 95.19 L20.12 95.77 L17.21 95.19 L15.47 94.42 L13.54 93.27 L10.64 90.00 L9.67 88.27 L9.28 86.54 L8.70 81.15 L7.93 78.08 L7.54 76.73 L6.96 75.19 L6.38 73.27 L5.80 70.38 L5.22 67.31 L4.26 65.58 L3.29 63.85 L2.51 61.73 L1.93 59.62 L1.35 56.54 L1.55 44.42 L2.13 42.31 L2.71 40.77 L3.48 39.04 L4.45 37.31 L5.22 35.58 L5.80 30.38 L6.77 28.65 L7.16 26.15 L7.74 24.23 L8.32 22.50 L8.12 20.00 L8.32 15.96 L9.28 14.23 L11.03 11.54 L11.80 9.23 L13.93 6.35 L15.67 5.58 L17.41 5.00 L19.54 3.65 L21.47 2.50 L23.21 1.54 Z";

const DEFAULT_PART_BORDER = 1.2;
const DEFAULT_PART_BORDER_COLOR = "#1a1a1a";

export function isPartTypeId(value: string): value is PartTypeId {
  return PART_TYPES.some((t) => t.id === value);
}

/** Live `addPart(type)` factory — does not insert into the blob. */
export function makePart(type: string, index: number, fill: string): CompositePart {
  const t = isPartTypeId(type) ? type : "circle";
  const part: CompositePart = {
    id: genId("p"),
    type: t,
    x: 50 + (index % 3) * 4,
    y: 50 + (index % 2) * 4,
    w: 36,
    h: 36,
    rot: 0,
    z: 0,
    lock: false,
    color: fill || "#2e7d32",
    borderWidth: DEFAULT_PART_BORDER,
    borderColor: DEFAULT_PART_BORDER_COLOR,
  };
  if (t === "circle" || t === "square" || t === "rounded_sq") {
    part.lockAspect = true;
  } else if (t === "rectangle") {
    part.lockAspect = false;
    part.w = 44;
    part.h = 28;
  } else if (t === "rounded_rect") {
    part.lockAspect = false;
    part.w = 48;
    part.h = 30;
  } else if (t === "half_circle") {
    part.lockAspect = true;
    part.w = 40;
    part.h = 20;
  } else if (t === "half_oval") {
    part.w = 40;
    part.h = 22;
  } else if (t === "jelly_blob") {
    part.pathLocal = JELLY_BLOB_PATH;
    part.w = 44;
    part.h = 42;
    part.color = "#7ec8e3";
    part.borderWidth = 1.5;
    part.borderColor = DEFAULT_PART_BORDER_COLOR;
  } else if (
    t === "cloud" ||
    t === "heart" ||
    t === "scallop" ||
    t === "teardrop" ||
    t === "crescent" ||
    t === "blob" ||
    t === "star"
  ) {
    part.w = 40;
    part.h = 36;
    if (t === "heart") part.color = "#f5a9c5";
    else if (t === "cloud") part.color = "#7ec8e3";
    else if (t === "scallop") part.color = "#ffe08a";
    else if (t === "teardrop") part.color = "#7ec8e3";
    else if (t === "crescent") part.color = "#ffe08a";
    else if (t === "star") part.color = "#ffe08a";
    else part.color = "#b8e986";
  }
  return part;
}

/** Live `isEqualAspectPart` — circle / square / round sq stay physically round or square. */
export function isEqualAspectPart(part: { type?: string } | null | undefined) {
  const t = part?.type;
  return t === "circle" || t === "square" || t === "rounded_sq";
}

function pairForAspect(w: number, h: number, asp: number, prefer: "w" | "h") {
  const ratio = Math.max(0.01, asp);
  if (prefer === "h") {
    const hh = Math.max(1, h);
    return { w: Math.max(1, hh / ratio), h: hh };
  }
  const ww = Math.max(1, w);
  return { w: ww, h: Math.max(1, ww * ratio) };
}

/** Live `syncEqualAspectPart` — `h% = w% × (boardW / boardH)` so the box is a true square in cm. */
export function syncEqualAspectPart<T extends { type?: string; w: number; h: number; lockAspect?: boolean }>(
  part: T,
  asp: number,
  prefer: "w" | "h" = "w",
): T {
  if (!isEqualAspectPart(part)) return part;
  const next = pairForAspect(Number(part.w) || 36, Number(part.h) || 36, asp, prefer);
  return { ...part, ...next, lockAspect: true };
}

/** Live `syncHalfCirclePartSize` — physical width = 2 × height. */
export function syncHalfCirclePartSize<T extends { type?: string; w: number; h: number; lockAspect?: boolean }>(
  part: T,
  asp: number,
  prefer: "w" | "h" = "w",
): T {
  if (part.type !== "half_circle") return part;
  const ratio = Math.max(0.01, asp);
  if (prefer === "h") {
    const h = Math.max(1, Number(part.h) || 18);
    return { ...part, h, w: Math.max(1, (2 * h) / ratio), lockAspect: true };
  }
  const w = Math.max(1, Number(part.w) || 36);
  return { ...part, w, h: Math.max(1, (w * ratio) / 2), lockAspect: true };
}

/** Live `syncLogoCircleSize`. */
export function syncLogoCircleSize<T extends { kind?: string; w: number; h: number; lockAspect?: boolean; shape?: string }>(
  zone: T,
  asp: number,
  prefer: "w" | "h" = "w",
): T {
  if (zone.kind !== "logo") return zone;
  const next = pairForAspect(Number(zone.w) || 22, Number(zone.h) || 22, asp, prefer);
  return { ...zone, ...next, lockAspect: true, shape: "circle" };
}

/** Live `syncIconSquareSize`. */
export function syncIconSquareSize<T extends { kind?: string; w: number; h: number; lockAspect?: boolean }>(
  zone: T,
  asp: number,
  prefer: "w" | "h" = "w",
): T {
  if (zone.kind !== "icon") return zone;
  const next = pairForAspect(Number(zone.w) || 16, Number(zone.h) || 16, asp, prefer);
  return { ...zone, ...next, lockAspect: true };
}

export function syncPartPhysicalAspect<T extends CompositePart>(part: T, asp: number, prefer: "w" | "h" = "w"): T {
  if (isEqualAspectPart(part)) return syncEqualAspectPart(part, asp, prefer);
  if (part.type === "half_circle") return syncHalfCirclePartSize(part, asp, prefer);
  return part;
}

export function syncZonePhysicalAspect<T extends CompositeZone>(zone: T, asp: number, prefer: "w" | "h" = "w"): T {
  if (zone.kind === "logo") return syncLogoCircleSize(zone, asp, prefer);
  if (zone.kind === "icon") return syncIconSquareSize(zone, asp, prefer);
  return zone;
}

/** Live `buildLabel` pass — compensate percent w/h for the current artboard. Does not write Firestore. */
export function syncCompositePhysicalAspect(blob: CompositeBlob, asp: number): CompositeBlob {
  return {
    ...blob,
    parts: (blob.parts || []).map((p) => syncPartPhysicalAspect(p, asp)),
    zones: (blob.zones || []).map((z) => syncZonePhysicalAspect(z, asp)),
  };
}
