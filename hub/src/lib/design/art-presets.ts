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
