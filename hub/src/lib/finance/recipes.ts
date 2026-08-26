import type { Product } from "@/lib/invoices/types";
import type { LedgerRow, Recipe, StockItem } from "./types";
import { catalogInactive, num, roundQty } from "./helpers";
import { displayStock } from "./ledger";
import { findRecipeByProductId, findRecipeForItem } from "./recipe-match";

export { findRecipeByProductId, findRecipeForItem };

export function isRecipeInactive(rec: Recipe | null | undefined, products: Product[]) {
  if (!rec?.productId) return false;
  const p = products.find((x) => x.id === rec.productId);
  return catalogInactive(p);
}

export function calcCOGS(
  recipe: Recipe | null | undefined,
  findItem: (type: string, id: string) => StockItem | null,
) {
  if (!recipe || !recipe.batchSize || recipe.batchSize <= 0) {
    return { total: 0, totalBatch: 0, lines: [] as { name: string; qty: number; unit: string; costPerUnit: number; lineCost: number }[] };
  }
  const lines: { name: string; qty: number; unit: string; costPerUnit: number; lineCost: number }[] = [];
  let total = 0;
  (recipe.ingredients || []).forEach((ing) => {
    const item = findItem(ing.itemType, ing.itemId);
    if (!item) return;
    const lineCost = num(ing.qty) * num(item.costPerUnit);
    lines.push({
      name: item.name,
      qty: num(ing.qty),
      unit: item.unit,
      costPerUnit: num(item.costPerUnit),
      lineCost,
    });
    total += lineCost;
  });
  return { total: total / recipe.batchSize, totalBatch: total, lines };
}

export function calcPrep(
  recipe: Recipe,
  unitsNeeded: number,
  findItem: (type: string, id: string) => StockItem | null,
  ledger: Record<string, LedgerRow>,
) {
  const batchSize = Math.max(1, parseInt(String(recipe.batchSize), 10) || 1);
  if (!unitsNeeded || unitsNeeded <= 0) {
    return {
      lines: [] as PrepIngLine[],
      ratio: 0,
      batchSize,
      unitsNeeded: 0,
      unitsToProduce: 0,
      totalCost: 0,
      stockOk: true,
      batches: 0,
      recipeName: recipe.name,
      productWeight: recipe.productWeight || "",
      cogsPerUnit: calcCOGS(recipe, findItem).total,
    };
  }
  const ratio = unitsNeeded / batchSize;
  const lines: PrepIngLine[] = [];
  let totalCost = 0;
  let stockOk = true;
  (recipe.ingredients || []).forEach((ing) => {
    const item = findItem(ing.itemType, ing.itemId);
    const forBatch = num(ing.qty);
    const perUnit = forBatch / batchSize;
    const needed = forBatch * ratio;
    const stock = item ? displayStock(ledger, ing.itemType, ing.itemId, item) : 0;
    const ok = item ? stock >= needed - 0.0001 : false;
    if (!ok) stockOk = false;
    const cost = needed * (item ? num(item.costPerUnit) : 0);
    totalCost += cost;
    lines.push({
      itemId: ing.itemId,
      name: item?.name || "؟",
      type: ing.itemType,
      forBatch,
      perUnit,
      needed,
      unit: item?.unit || "",
      stock,
      ok,
      shortfall: ok ? 0 : Math.max(0, needed - stock),
      cost,
    });
  });
  return {
    lines,
    ratio,
    batches: ratio,
    batchSize,
    unitsNeeded,
    unitsToProduce: unitsNeeded,
    totalCost,
    stockOk,
    cogsPerUnit: calcCOGS(recipe, findItem).total,
    recipeName: recipe.name,
    productWeight: recipe.productWeight || "",
  };
}

export type PrepIngLine = {
  itemId: string;
  name: string;
  type: string;
  forBatch: number;
  perUnit: number;
  needed: number;
  unit: string;
  stock: number;
  ok: boolean;
  shortfall: number;
  cost: number;
};

export function calcPrepAggregate(
  prepLines: { recipeId: string; units: number }[],
  recipes: Recipe[],
  opts: {
    prodMode?: "net" | "all";
    onHandByRecipe?: Record<string, number>;
    findItem: (type: string, id: string) => StockItem | null;
    ledger: Record<string, LedgerRow>;
  },
) {
  const mode = opts.prodMode === "net" ? "net" : "all";
  const onHandMap = opts.onHandByRecipe || {};
  const agg: Record<
    string,
    PrepIngLine & { sources: { recipe: string; units: number; needed: number }[] }
  > = {};
  const productRows: {
    recipeId: string;
    rec: Recipe;
    units: number;
    onHand: number;
    unitsToProduce: number;
    coveredByStock: boolean;
    prep: ReturnType<typeof calcPrep>;
  }[] = [];
  let totalCost = 0;
  let totalUnits = 0;
  let totalToProduce = 0;
  let allOk = true;
  (prepLines || []).forEach((line) => {
    const rec = recipes.find((r) => r.id === line.recipeId);
    if (!rec) return;
    const requested = roundQty(line.units);
    const onHand = roundQty(onHandMap[line.recipeId] != null ? onHandMap[line.recipeId] : 0);
    const unitsToProduce = mode === "all" ? requested : Math.max(0, requested - Math.max(0, onHand));
    const prep = calcPrep(rec, unitsToProduce, opts.findItem, opts.ledger);
    const coveredByStock = mode === "net" && unitsToProduce === 0 && requested > 0;
    productRows.push({
      recipeId: line.recipeId,
      rec,
      units: requested,
      onHand,
      unitsToProduce,
      coveredByStock,
      prep,
    });
    totalUnits += requested;
    totalToProduce += unitsToProduce;
    totalCost += prep.totalCost;
    if (unitsToProduce > 0 && !prep.stockOk) allOk = false;
    prep.lines.forEach((l) => {
      const key = `${l.type}|${l.itemId}`;
      if (!agg[key]) {
        agg[key] = {
          ...l,
          needed: 0,
          cost: 0,
          sources: [],
        };
      }
      agg[key].needed += l.needed;
      agg[key].cost += l.cost;
      agg[key].sources.push({ recipe: rec.name, units: line.units, needed: l.needed });
    });
  });
  const lines = Object.values(agg)
    .map((a) => {
      const ok = a.stock >= a.needed - 0.0001;
      if (!ok) allOk = false;
      return { ...a, ok, shortfall: ok ? 0 : Math.max(0, a.needed - a.stock) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return {
    lines,
    productRows,
    totalCost,
    totalUnits,
    totalToProduce,
    prodMode: mode,
    stockOk: allOk,
  };
}

export function recipeSellPrice(rec: Recipe, products: Product[]) {
  if (rec.productId) {
    const p = products.find((x) => x.id === rec.productId);
    if (p) return num(p.unitPrice);
  }
  return num(rec.unitPrice);
}
