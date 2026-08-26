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
};

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
};

export function presetThumbFill(artKey?: string) {
  const k = String(artKey || "")
    .trim()
    .replace(/^bb-/, "")
    .replace(/_/g, "-");
  return PRESET_THUMB_FILL[k] || "";
}

export type ArtSrcKind = "preview" | "print";

function publicSrc(file: string) {
  return `/design-presets/${file}`;
}

function fileForKey(key: string) {
  const k = key.trim().replace(/^bb-/, "");
  return PRESET_FILES[k] || (k && PRESET_FILES[k.replace(/_/g, "-")]) || "";
}

function hrefForFile(file: string, kind: ArtSrcKind) {
  if (kind === "preview") {
    return `/design-presets/preview/${file.replace(/\.svg$/i, ".webp")}`;
  }
  return publicSrc(file);
}

/** Print / existence check. Studio preview uses `resolveArtSrc(..., "preview")`. */
export function presetSrcForKey(artKey: string) {
  const file = fileForKey(artKey);
  return file ? publicSrc(file) : "";
}

export function characterPresetKeys() {
  return Object.keys(PRESET_FILES);
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

export function resolveArtSrc(raw: unknown, artKey?: string, kind: ArtSrcKind = "preview") {
  const fromKey = (key: string) => {
    const file = fileForKey(key);
    return file ? hrefForFile(file, kind) : "";
  };
  if (artKey) {
    const hit = fromKey(artKey);
    if (hit) return hit;
  }
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("artref:")) return fromKey(s.slice(7));
  const file = s.match(/assets\/presets\/([^/?#]+)/i)?.[1] || "";
  if (file) {
    const base = file.replace(/\.(png|svg|jpg|jpeg|webp)$/i, "");
    return fromKey(base) || publicSrc(base.endsWith(".svg") ? file : `${base}.svg`);
  }
  const nested = s.match(/\/design-presets\/(?:preview\/)?(bb-[^/?#]+)/i)?.[1] || "";
  if (nested) {
    const stem = nested.replace(/\.(png|svg|jpg|jpeg|webp)$/i, "").replace(/^bb-/, "");
    return fromKey(stem);
  }
  return "";
}

/** Repo character SVGs use a square viewBox inside a tall/wide canvas (default meet letterbox). */
export function isCharacterPresetArt(src?: string, artKey?: string) {
  if (artKey && fileForKey(artKey)) return true;
  const s = String(src || "");
  return (
    s.startsWith("artref:") ||
    /\/design-presets\//i.test(s) ||
    /\/design-preset-previews\//i.test(s) ||
    /assets\/presets\//i.test(s)
  );
}
