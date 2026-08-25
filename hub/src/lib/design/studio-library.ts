import { FAM, flag, type PreviewFace } from "./layout";
import type { CompositeZone, LabelState } from "./types";

export const WRAP_RECIPE_BLOCKS = [
  { k: "1", chk: "chkS1", label: "Ingredients", famId: FAM.ing, fallbackOn: true, hint: "EN/AR ingredients recipe" },
  { k: "2", chk: "chkS2", label: "Nutrition", famId: FAM.nut, fallbackOn: true, hint: "Facts from stored nCal / nFat / …" },
  { k: "3", chk: "chkS3", label: "Logo", famId: FAM.blogo, fallbackOn: true, hint: "Disc + brand names" },
  { k: "4", chk: "chkS4", label: "Tips", famId: FAM.tip, fallbackOn: true, hint: "Storage / serving tips" },
  { k: "5", chk: "chkS5", label: "Dates + QR + weight", famId: FAM.bdates, fallbackOn: true, hint: "One print recipe" },
  { k: "6", chk: "chkS6", label: "Custom column", famId: FAM.cus, fallbackOn: false, hint: "Legacy starter column. Prefer a named section for new copy." },
] as const;

export const COMPOSITE_BLOCKS = [
  { id: "text" as const, label: "Text" },
  { id: "logo" as const, label: "Logo disc" },
  { id: "exp" as const, label: "Expiry box" },
  { id: "image" as const, label: "Photo" },
];

export function wrapBlockOn(state: LabelState, chk: string, fallbackOn: boolean) {
  return flag(state, chk, fallbackOn);
}

export function isWrapFace(face: PreviewFace) {
  return face === "back" || face === "taper";
}

export function isCharacterZone(zone: CompositeZone) {
  return zone.shape === "character" || String(zone.label || "").startsWith("Character");
}

export function placedCompositeBlocks(state: LabelState) {
  return (state._composite?.zones || []).filter(
    (z) => (z.kind === "text" || z.kind === "logo" || z.kind === "image") && !isCharacterZone(z) && !z.lock,
  );
}

export function placedCharacters(state: LabelState) {
  const zones = (state._composite?.zones || [])
    .filter((z) => isCharacterZone(z) && !z.lock)
    .map((z) => ({ id: z.id, label: z.label || "Character" }));
  const stamps = (state._stamps || [])
    .filter((s) => Boolean(s.src) || String(s.label || "").startsWith("Character"))
    .map((s) => ({ id: s.id, label: s.label || "Character" }));
  return [...zones, ...stamps];
}
