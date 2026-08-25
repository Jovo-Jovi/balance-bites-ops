import type { Recipe, StockItem } from "./types";
import { num } from "./helpers";

export function parseRecipeLinkId(id?: string | null) {
  if (!id || String(id).indexOf("recipe:") !== 0) return "";
  return String(id).slice(7);
}

/** Keep one sticker slot on the linked recipe BOM (live ensureStickerInProductRecipe). */
export function ensureStickerInProductRecipe(
  sticker: StockItem,
  recipes: Recipe[],
): { recipes: Recipe[]; sticker: StockItem } | null {
  if (!sticker?.id) return null;
  let rec: Recipe | null = null;
  if (sticker.recipeId) rec = recipes.find((r) => r.id === sticker.recipeId) || null;
  if (!rec && sticker.productId) {
    const rid = parseRecipeLinkId(sticker.productId);
    rec = rid
      ? recipes.find((r) => r.id === rid) || null
      : recipes.find((r) => r.productId === sticker.productId) || null;
  }
  if (!rec) return null;

  const stkPatch: Partial<StockItem> = {};
  if (sticker.recipeId !== rec.id) stkPatch.recipeId = rec.id;
  if (rec.productId && sticker.productId !== rec.productId) stkPatch.productId = rec.productId;
  const nextSticker = { ...sticker, ...stkPatch };

  const all = recipes.map((r) => ({ ...r, ingredients: (r.ingredients || []).slice() }));
  all.forEach((r, i) => {
    if (r.id === rec.id) return;
    const filtered = (r.ingredients || []).filter(
      (ing) => !(ing.itemType === "bb_stickers" && ing.itemId === sticker.id),
    );
    if (filtered.length !== (r.ingredients || []).length) {
      all[i] = { ...r, ingredients: filtered };
    }
  });

  const ri = all.findIndex((r) => r.id === rec.id);
  if (ri < 0) return null;
  let batch = parseInt(String(all[ri].batchSize), 10) || 100;
  if (batch <= 0) batch = 100;
  const ings = (all[ri].ingredients || []).slice();
  const idx = ings.findIndex((ing) => ing.itemType === "bb_stickers");
  const qty = idx >= 0 ? num(ings[idx].qty) || batch : batch;
  const entry = { itemId: sticker.id, itemType: "bb_stickers" as const, qty };
  if (idx >= 0) ings[idx] = entry;
  else ings.push(entry);
  all[ri] = { ...all[ri], ingredients: ings };
  return { recipes: all, sticker: nextSticker };
}

export function removeStickerFromRecipes(stickerId: string, recipes: Recipe[]) {
  return recipes.map((r) => ({
    ...r,
    ingredients: (r.ingredients || []).filter(
      (ing) => !(ing.itemType === "bb_stickers" && ing.itemId === stickerId),
    ),
  }));
}
