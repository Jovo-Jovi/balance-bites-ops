/** Online character catalog (DiceBear). Not product stickers / design-presets. */

export const CHARACTER_STYLES = [
  { id: "open-peeps", label: "Peeps" },
  { id: "adventurer", label: "Adventurer" },
  { id: "lorelei", label: "Lorelei" },
  { id: "notionists", label: "Notionists" },
] as const;

export const CHARACTER_SEEDS = [
  "Felix",
  "Aneka",
  "Jasper",
  "Milo",
  "Nova",
  "Kai",
  "Luna",
  "Remy",
  "Sage",
  "Quinn",
  "Harper",
  "Eden",
  "Rowan",
  "Shiloh",
  "Indigo",
  "Wren",
  "Oakley",
  "Sasha",
] as const;

export type CharacterStyleId = (typeof CHARACTER_STYLES)[number]["id"];

const STYLE_IDS = new Set<string>(CHARACTER_STYLES.map((s) => s.id));

export function isCharacterStyle(id: string): id is CharacterStyleId {
  return STYLE_IDS.has(id);
}

export function sanitizeCharacterSeed(raw: string) {
  const seed = String(raw || "")
    .trim()
    .slice(0, 48)
    .replace(/[^\w\s-]/g, "");
  return seed || "Felix";
}

export function characterPngUrl(style: string, seed: string, size: number) {
  if (!isCharacterStyle(style)) return "";
  const n = Math.max(48, Math.min(512, Math.round(size) || 128));
  const q = new URLSearchParams({
    seed: sanitizeCharacterSeed(seed),
    size: String(n),
    backgroundColor: "transparent",
  });
  return `https://api.dicebear.com/9.x/${style}/png?${q.toString()}`;
}

export function characterThumbUrl(style: string, seed: string) {
  return characterPngUrl(style, seed, 96);
}

export async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that character."));
    reader.readAsDataURL(blob);
  });
}

export async function fetchCharacterPng(style: string, seed: string, auth: { Authorization: string }) {
  const q = new URLSearchParams({ style, seed: sanitizeCharacterSeed(seed), size: "512" });
  const res = await fetch(`/api/design/character?${q.toString()}`, { headers: auth });
  if (!res.ok) {
    let message = "Could not load that character.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return blobToDataUrl(await res.blob());
}
