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
  "kids-cloud": "bb-kids-cloud.png",
  "kids-star": "bb-kids-star.png",
  "kids-cheese": "bb-kids-cheese.png",
  "kids-chili": "bb-kids-chili.png",
  "kids-lemon": "bb-kids-lemon.png",
  "kids-popcorn": "bb-kids-popcorn.png",
  "kids-dino": "bb-kids-dino.png",
  "kids-robot": "bb-kids-robot.png",
  "kids-bear": "bb-kids-bear.png",
  "kids-donut": "bb-kids-donut.png",
  "kids-balloon": "bb-kids-balloon.png",
  "kids-heart": "bb-kids-heart.png",
  "kids-gift": "bb-kids-gift.png",
  "adult-peanut": "bb-adult-peanut.png",
  "adult-cocoa": "bb-adult-cocoa.png",
  "adult-sesame": "bb-adult-sesame.png",
  "adult-pistachio": "bb-adult-pistachio.png",
  "adult-date": "bb-adult-date.png",
  "adult-almond": "bb-adult-almond.png",
  "adult-leaf": "bb-adult-leaf.png",
  "adult-honey": "bb-adult-honey.png",
  "adult-salt": "bb-adult-salt.png",
  "adult-olive": "bb-adult-olive.png",
};

export type PackAudience = "kids" | "adults";
export type PackGroup = "brand" | "faces" | "toys" | "treats" | "product" | "garnish";

type PackArtItem = {
  key: string;
  label: string;
  size: number;
  ratio: number;
  audience: PackAudience[];
  group: PackGroup;
};

export const PACK_AUDIENCES: { id: PackAudience; label: string }[] = [
  { id: "kids", label: "Kids" },
  { id: "adults", label: "Adults" },
];

export const PACK_GROUPS: { id: PackGroup; label: string }[] = [
  { id: "brand", label: "Brand" },
  { id: "faces", label: "Faces" },
  { id: "toys", label: "Toys" },
  { id: "treats", label: "Treats" },
  { id: "product", label: "Product" },
  { id: "garnish", label: "Garnish" },
];

/** Full-colour kawaii for pack stickers. Studio Pack art rail. Not popcorn / Jelly Kids. `ratio` is PNG width/height after trim. */
const STUDIO_PACK_ART: PackArtItem[] = [
  { key: "lockup", label: "BB lockup", size: 34, ratio: 1.165, audience: ["kids", "adults"], group: "brand" },
  { key: "pizza-face", label: "Pizza face", size: 22, ratio: 0.994, audience: ["kids"], group: "faces" },
  { key: "chicken-face", label: "Chicken face", size: 24, ratio: 0.919, audience: ["kids"], group: "faces" },
  { key: "ketchup", label: "Ketchup", size: 22, ratio: 0.516, audience: ["kids"], group: "faces" },
  { key: "kids-cheese", label: "Cheese", size: 22, ratio: 1.001, audience: ["kids"], group: "faces" },
  { key: "kids-chili", label: "Chili", size: 22, ratio: 0.496, audience: ["kids"], group: "faces" },
  { key: "kids-lemon", label: "Lemon", size: 22, ratio: 0.983, audience: ["kids"], group: "faces" },
  { key: "kids-popcorn", label: "Popcorn", size: 24, ratio: 1.059, audience: ["kids"], group: "faces" },
  { key: "kids-cloud", label: "Cloud", size: 26, ratio: 1.171, audience: ["kids"], group: "faces" },
  { key: "kids-star", label: "Star", size: 22, ratio: 1.036, audience: ["kids"], group: "faces" },
  { key: "surprise-toys", label: "Surprise toys", size: 42, ratio: 0.932, audience: ["kids"], group: "toys" },
  { key: "toy-cup", label: "Toy cup", size: 26, ratio: 1.091, audience: ["kids"], group: "toys" },
  { key: "roll-toy", label: "Roll toy", size: 22, ratio: 0.643, audience: ["kids"], group: "toys" },
  { key: "kids-dino", label: "Dino", size: 26, ratio: 1.091, audience: ["kids"], group: "toys" },
  { key: "kids-robot", label: "Robot", size: 24, ratio: 0.789, audience: ["kids"], group: "toys" },
  { key: "kids-bear", label: "Bear", size: 26, ratio: 0.767, audience: ["kids"], group: "toys" },
  { key: "kids-gift", label: "Gift", size: 22, ratio: 0.953, audience: ["kids"], group: "toys" },
  { key: "kids-donut", label: "Donut", size: 22, ratio: 0.987, audience: ["kids"], group: "treats" },
  { key: "kids-balloon", label: "Balloon", size: 22, ratio: 0.76, audience: ["kids"], group: "treats" },
  { key: "kids-heart", label: "Heart", size: 20, ratio: 1.251, audience: ["kids"], group: "treats" },
  { key: "sudani-beans", label: "Sudani beans", size: 48, ratio: 1.491, audience: ["adults"], group: "product" },
  { key: "stone-chocolate", label: "Stone chocolate", size: 52, ratio: 1.329, audience: ["adults"], group: "product" },
  { key: "pebble", label: "Pebble", size: 18, ratio: 1.115, audience: ["adults"], group: "product" },
  { key: "adult-peanut", label: "Peanuts", size: 42, ratio: 1.265, audience: ["adults"], group: "product" },
  { key: "adult-cocoa", label: "Cocoa", size: 36, ratio: 1.02, audience: ["adults"], group: "product" },
  { key: "adult-sesame", label: "Sesame", size: 36, ratio: 1.357, audience: ["adults"], group: "product" },
  { key: "adult-pistachio", label: "Pistachio", size: 36, ratio: 1.627, audience: ["adults"], group: "product" },
  { key: "adult-date", label: "Date", size: 28, ratio: 0.674, audience: ["adults"], group: "product" },
  { key: "adult-almond", label: "Almonds", size: 36, ratio: 1.436, audience: ["adults"], group: "product" },
  { key: "adult-leaf", label: "Leaf", size: 22, ratio: 1.145, audience: ["adults"], group: "garnish" },
  { key: "adult-honey", label: "Honey", size: 24, ratio: 0.904, audience: ["adults"], group: "garnish" },
  { key: "adult-salt", label: "Salt", size: 20, ratio: 1.229, audience: ["adults"], group: "garnish" },
  { key: "adult-olive", label: "Olives", size: 28, ratio: 1.073, audience: ["adults"], group: "garnish" },
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
  "kids-cloud": "#fff4a3",
  "kids-star": "#fdd835",
  "kids-cheese": "#f4c430",
  "kids-chili": "#c62828",
  "kids-lemon": "#f4d03f",
  "kids-popcorn": "#FECE00",
  "kids-dino": "#7cb342",
  "kids-robot": "#42a5f5",
  "kids-bear": "#c4a574",
  "kids-donut": "#f48fb1",
  "kids-balloon": "#e53935",
  "kids-heart": "#e53935",
  "kids-gift": "#fdd835",
  "adult-peanut": "#d4a017",
  "adult-cocoa": "#5c2e1f",
  "adult-sesame": "#f5f0e6",
  "adult-pistachio": "#8bc34a",
  "adult-date": "#6b3a28",
  "adult-almond": "#c4a574",
  "adult-leaf": "#3d8c40",
  "adult-honey": "#f4a020",
  "adult-salt": "#eceff1",
  "adult-olive": "#7cb342",
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

export function studioPackArtFor(audience: PackAudience) {
  return STUDIO_PACK_ART.filter((item) => item.audience.includes(audience));
}

export function studioPackGroupsFor(audience: PackAudience) {
  const items = studioPackArtFor(audience);
  return PACK_GROUPS.filter((g) => items.some((i) => i.group === g.id));
}

export function studioPackArtLabel(artKey: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return STUDIO_PACK_ART.find((item) => item.key === k)?.label || characterPresetLabel(k);
}

export function isPackArtKey(artKey?: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return STUDIO_PACK_ART.some((item) => item.key === k);
}

export function studioPackArtSize(artKey: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return STUDIO_PACK_ART.find((item) => item.key === k)?.size || 36;
}

/** Percent box matching the trimmed PNG, so meet does not pad a white plate. */
export function studioPackArtBox(artKey: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  const sz = studioPackArtSize(k);
  const ratio = STUDIO_PACK_ART.find((row) => row.key === k)?.ratio || 1;
  if (ratio >= 1) return { w: sz, h: Number((sz / ratio).toFixed(2)) };
  return { w: Number((sz * ratio).toFixed(2)), h: sz };
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
