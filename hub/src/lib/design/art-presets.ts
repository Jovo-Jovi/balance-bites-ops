/** Repo character art (live `assets/presets/`). Not a Firestore dump. */

const PRESET_FILES: Record<string, string> = {
  "jelly-fruit": "bb-jelly-fruit.svg",
  chicopon: "bb-chicopon.svg",
  "corn-cheese": "bb-corn-cheese.svg",
  "corn-ketchup": "bb-corn-ketchup.svg",
  "chinese-crackers": "bb-chinese-crackers.svg",
  pretzels: "bb-pretzels.svg",
  "popcorn-blue": "bb-popcorn-blue.svg",
  "popcorn-red": "bb-popcorn-red.svg",
  "popcorn-yellow": "bb-popcorn-yellow.svg",
  "popcorn-orange": "bb-popcorn-orange.svg",
  "popcorn-green": "bb-popcorn-green.svg",
  marshmallows: "bb-marshmallows.svg",
  lockup: "bb-lockup.svg",
  "sudani-beans": "bb-sudani-beans.svg",
  "stone-chocolate": "bb-stone-chocolate.svg",
  "surprise-toys": "bb-surprise-toys.svg",
};

/** Compact original kawaii for the three new stickers. Not popcorn / Jelly Kids. Brand rail only. */
const STUDIO_PACK_ART_KEYS = ["lockup", "sudani-beans", "stone-chocolate", "surprise-toys"] as const;

/** Library-only die fill when the saved part color is white-on-white. Not used in Studio/print. */
const PRESET_THUMB_FILL: Record<string, string> = {
  "jelly-fruit": "#e91e8c",
  chicopon: "#5ec8e8",
  "corn-cheese": "#f4c430",
  "corn-ketchup": "#c62828",
  "chinese-crackers": "#d4a017",
  pretzels: "#c4a574",
  "popcorn-blue": "#1a6cff",
  "popcorn-red": "#e31b12",
  "popcorn-yellow": "#FECE00",
  "popcorn-orange": "#f08a00",
  "popcorn-green": "#3d8c40",
  marshmallows: "#f3c6d8",
  lockup: "#7ec8e8",
  "sudani-beans": "#c8e85a",
  "stone-chocolate": "#5c2e1f",
  "surprise-toys": "#fdd835",
};

export function presetThumbFill(artKey?: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return PRESET_THUMB_FILL[k] || "";
}

function publicSrc(file: string) {
  return `/design-presets/${file}`;
}

function fileForKey(key: string) {
  const k = key.trim().replace(/^bb-/, "");
  return PRESET_FILES[k] || (k && PRESET_FILES[k.replace(/_/g, "-")]) || "";
}

export function presetSrcForKey(artKey: string) {
  const file = fileForKey(artKey);
  return file ? publicSrc(file) : "";
}

export function characterPresetKeys() {
  return Object.keys(PRESET_FILES);
}

export function studioPackArtKeys() {
  return [...STUDIO_PACK_ART_KEYS];
}

const PACK_ART_LABELS: Record<(typeof STUDIO_PACK_ART_KEYS)[number], string> = {
  lockup: "BB lockup",
  "sudani-beans": "Sudani beans",
  "stone-chocolate": "Stone chocolate",
  "surprise-toys": "Surprise toys",
};

export function studioPackArtLabel(artKey: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return PACK_ART_LABELS[k as (typeof STUDIO_PACK_ART_KEYS)[number]] || characterPresetLabel(k);
}

export function characterPresetLabel(artKey: string) {
  return String(artKey || "")
    .replace(/^bb-/, "")
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isPrintPackExcludedArt(artKey: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return k === "popcorn-blue" || k === "popcorn-red";
}

export function resolveArtSrc(raw: unknown, artKey?: string) {
  if (artKey) {
    const fromKey = presetSrcForKey(artKey);
    if (fromKey) return fromKey;
  }
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("artref:")) return presetSrcForKey(s.slice(7));
  const file = s.match(/assets\/presets\/([^/?#]+)/i)?.[1] || "";
  if (file) {
    const base = file.replace(/\.(png|svg|jpg|jpeg|webp)$/i, "");
    return presetSrcForKey(base) || publicSrc(base.endsWith(".svg") ? file : `${base}.svg`);
  }
  return "";
}

/** Repo character SVGs use a square viewBox inside a tall/wide canvas (default meet letterbox). */
export function isCharacterPresetArt(src?: string, artKey?: string) {
  if (artKey && fileForKey(artKey)) return true;
  const s = String(src || "");
  return s.startsWith("artref:") || /\/design-presets\//i.test(s) || /assets\/presets\//i.test(s);
}
