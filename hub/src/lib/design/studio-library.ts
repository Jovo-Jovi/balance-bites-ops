import { FAM, flag, type PreviewFace } from "./layout";
import type { CompositeZone, LabelStamp, LabelState } from "./types";
import { ARC_SWEEP_HALF, ARC_SWEEP_THIRD } from "./deco";

export const WRAP_RECIPE_BLOCKS = [
  { k: "1", chk: "chkS1", label: "Ingredients", famId: FAM.ing, fallbackOn: true, hint: "EN/AR ingredients recipe" },
  { k: "2", chk: "chkS2", label: "Nutrition", famId: FAM.nut, fallbackOn: true, hint: "Facts from stored nCal / nFat / …" },
  { k: "3", chk: "chkS3", label: "Logo", famId: FAM.blogo, fallbackOn: true, hint: "Disc + brand names" },
  { k: "4", chk: "chkS4", label: "Tips", famId: FAM.tip, fallbackOn: true, hint: "Storage / serving tips" },
  { k: "5", chk: "chkS5", label: "Dates + QR + weight", famId: FAM.bdates, fallbackOn: true, hint: "One print recipe" },
  { k: "6", chk: "chkS6", label: "Custom column", famId: FAM.cus, fallbackOn: false, hint: "Legacy starter column. Prefer a named section for new copy." },
] as const;

export const COMPOSITE_BLOCKS = [
  { id: "logo" as const, label: "Logo disc" },
  { id: "exp" as const, label: "Expiry box" },
  { id: "image" as const, label: "Photo" },
];

export const ARC_PRESETS = [
  { sweep: ARC_SWEEP_THIRD, label: "Arc ⅓" },
  { sweep: ARC_SWEEP_HALF, label: "Arc ½" },
] as const;

export const DECO_BLOCKS = [
  { id: "text" as const, label: "Text", hint: "Straight type you can drag" },
  { id: "curved" as const, label: "Curved text", hint: "Bend with Curvature" },
  { id: "arc" as const, label: "Arc line", hint: "Thick gradient stroke" },
];

export function wrapBlockOn(state: LabelState, chk: string, fallbackOn: boolean) {
  return flag(state, chk, fallbackOn);
}

export function isWrapFace(face: PreviewFace) {
  return face === "back" || face === "taper";
}

export function stampFaceOf(face: PreviewFace): LabelStamp["face"] {
  if (face === "back" || face === "taper" || face === "top" || face === "circle") return face;
  return undefined;
}

/** Wrap/lid/circle stamps stay on the face they were dropped on. Wrap and taper share art. */
export function stampOnFace(stamp: LabelStamp, face: PreviewFace) {
  if (face === "composite") return false;
  const stored = stamp.face;
  if (stored === "back" || stored === "taper") return face === "back" || face === "taper";
  if (stored === "top" || stored === "circle") return stored === face;
  const character = Boolean(stamp.src) || String(stamp.label || "").startsWith("Character");
  if (character) return face !== "top";
  return true;
}

export function isCharacterZone(zone: CompositeZone) {
  return zone.shape === "character" || String(zone.label || "").startsWith("Character");
}

export function isPackArtZone(zone: CompositeZone) {
  return zone.shape === "pack" || (zone.kind === "image" && String(zone.src || "").startsWith("artref:"));
}

export function placedCompositeBlocks(state: LabelState) {
  return (state._composite?.zones || []).filter(
    (z) =>
      (z.kind === "text" || z.kind === "logo" || z.kind === "image" || z.kind === "arc" || z.kind === "letters") &&
      !isCharacterZone(z) &&
      !isPackArtZone(z) &&
      !z.lock,
  );
}

export function placedDecoStamps(state: LabelState, face: PreviewFace) {
  return (state._stamps || [])
    .filter((s) => stampOnFace(s, face) && (s.kind === "text" || s.kind === "arc" || s.kind === "letters") && !s.src)
    .map((s) => ({
      id: s.id,
      label: s.label || s.text || (s.kind === "arc" ? "Arc line" : s.kind === "letters" ? "Word" : "Text"),
    }));
}

export function placedCharacters(state: LabelState, face: PreviewFace) {
  const zones =
    face === "composite"
      ? (state._composite?.zones || [])
          .filter((z) => isCharacterZone(z) && !z.lock)
          .map((z) => ({ id: z.id, label: z.label || "Character" }))
      : [];
  const stamps = (state._stamps || [])
    .filter((s) => stampOnFace(s, face) && (Boolean(s.src) || String(s.label || "").startsWith("Character")))
    .map((s) => ({ id: s.id, label: s.label || "Character" }));
  return [...zones, ...stamps];
}
