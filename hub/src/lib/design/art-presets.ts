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
  lockup: "bb-lockup.png",
  "sudani-beans": "bb-sudani-beans.png",
  "stone-chocolate": "bb-stone-chocolate.png",
  "surprise-toys": "bb-surprise-toys.png",
  "pizza-face": "bb-pizza-face.png",
  "chicken-face": "bb-chicken-face.png",
  ketchup: "bb-ketchup.png",
  "toy-cup": "bb-toy-cup.png",
  "roll-toy": "bb-roll-toy.png",
  pebble: "bb-pebble.png",
};

/** Full-colour kawaii for the three new stickers. Studio Pack art rail. Not popcorn / Jelly Kids. */
const STUDIO_PACK_ART: { key: string; label: string; size: number }[] = [
  { key: "lockup", label: "BB lockup", size: 34 },
  { key: "sudani-beans", label: "Sudani beans", size: 48 },
  { key: "stone-chocolate", label: "Stone chocolate", size: 52 },
  { key: "surprise-toys", label: "Surprise toys", size: 42 },
  { key: "pizza-face", label: "Pizza face", size: 22 },
  { key: "chicken-face", label: "Chicken face", size: 24 },
  { key: "ketchup", label: "Ketchup", size: 22 },
  { key: "toy-cup", label: "Toy cup", size: 26 },
  { key: "roll-toy", label: "Roll toy", size: 22 },
  { key: "pebble", label: "Pebble", size: 18 },
];

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
  "pizza-face": "#f4c430",
  "chicken-face": "#f5f5f0",
  ketchup: "#c62828",
  "toy-cup": "#fdd835",
  "roll-toy": "#fb8c00",
  pebble: "#6b3a28",
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
  return STUDIO_PACK_ART.map((item) => item.key);
}

export function studioPackArtLabel(artKey: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return STUDIO_PACK_ART.find((item) => item.key === k)?.label || characterPresetLabel(k);
}

export function studioPackArtSize(artKey: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return STUDIO_PACK_ART.find((item) => item.key === k)?.size || 36;
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
