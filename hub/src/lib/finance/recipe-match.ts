import type { InvoiceLine } from "@/lib/invoices/types";
import type { Recipe } from "./types";

export function findRecipeForItem(
  item: InvoiceLine | { productId?: string | null; name?: string },
  recipes: Recipe[],
) {
  if (!recipes.length || !item) return null;
  if (item.productId) {
    const byId = recipes.find((r) => r.productId === item.productId);
    if (byId) return byId;
  }
  const name = String(item.name || "")
    .split("·")[0]
    .replace(/\s*-\s*pack\s*$/i, "")
    .trim();
  if (!name) return null;
  const low = name.toLowerCase();
  if (low === "discount") return null;
  const exact = recipes.find((r) => String(r.name || "").toLowerCase() === low);
  if (exact) return exact;
  return (
    recipes.find((r) => {
      const rn = String(r.name || "").toLowerCase();
      if (!rn) return false;
      return rn.includes(low) || low.includes(rn);
    }) || null
  );
}

export function findRecipeByProductId(
  recipes: Recipe[],
  productId: string | null | undefined,
) {
  if (!productId) return null;
  return recipes.find((r) => r.productId === productId) || null;
}
