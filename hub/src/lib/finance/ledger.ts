import type { Invoice, InvoiceLine, ReturnRecord } from "@/lib/invoices/types";
import { getReturnLineTotal } from "@/lib/invoices/returns";
import type {
  InvItemType,
  LedgerRow,
  ProductionRun,
  Purchase,
  Recipe,
  StockItem,
} from "./types";
import { itemKey, num, roundQty } from "./helpers";
import { isExpiredDisp } from "./returns-live";
import { findRecipeForItem } from "./recipe-match";

export function purchasedQty(purchases: Purchase[], itemType: string, itemId: string) {
  let sum = 0;
  purchases.forEach((p) => {
    if (p.itemType === itemType && p.itemId === itemId) sum += roundQty(p.qty);
  });
  return roundQty(sum);
}

export function calcIngredientUsageFromInvoices(
  invoices: Invoice[],
  recipes: Recipe[],
  returns: ReturnRecord[],
) {
  const usage: Record<string, number> = {};
  function add(rec: Recipe, qty: number, sign: number) {
    const batchSize = Math.max(1, parseInt(String(rec.batchSize), 10) || 1);
    const ratio = qty / batchSize;
    (rec.ingredients || []).forEach((ing) => {
      const k = itemKey(ing.itemType, ing.itemId);
      usage[k] = (usage[k] || 0) + num(ing.qty) * ratio * sign;
    });
  }
  invoices.forEach((inv) => {
    (inv.items || []).forEach((it) => {
      const rec = findRecipeForItem(it, recipes);
      if (rec) add(rec, num(it.qty), 1);
    });
  });
  returns.forEach((ret) => {
    (ret.items || []).forEach((it) => {
      if (isExpiredDisp(it, ret)) return;
      const rec = findRecipeForItem(it as InvoiceLine, recipes);
      if (!rec) return;
      const kQty = num(it.qty);
      const batchSize = Math.max(1, parseInt(String(rec.batchSize), 10) || 1);
      const ratio = kQty / batchSize;
      (rec.ingredients || []).forEach((ing) => {
        const k = itemKey(ing.itemType, ing.itemId);
        usage[k] = Math.max(0, (usage[k] || 0) - num(ing.qty) * ratio);
      });
    });
  });
  return usage;
}

export function calcIngredientUsageFromProduction(
  recipes: Recipe[],
  production: ProductionRun[],
) {
  const usage: Record<string, number> = {};
  production.forEach((run) => {
    const rec = recipes.find((r) => r.id === run.recipeId);
    if (!rec) return;
    const batchSize = Math.max(1, parseInt(String(rec.batchSize), 10) || 1);
    const ratio = num(run.unitsProduced) / batchSize;
    (rec.ingredients || []).forEach((ing) => {
      const k = itemKey(ing.itemType, ing.itemId);
      usage[k] = (usage[k] || 0) + num(ing.qty) * ratio;
    });
  });
  return usage;
}

export function computeItemLedger(opts: {
  itemType: InvItemType | string;
  itemId: string;
  purchases: Purchase[];
  invoices: Invoice[];
  recipes: Recipe[];
  production: ProductionRun[];
  returns: ReturnRecord[];
}): LedgerRow {
  const purchased = purchasedQty(opts.purchases, opts.itemType, opts.itemId);
  const useInv = opts.invoices.length > 0;
  const usedMap = useInv
    ? calcIngredientUsageFromInvoices(opts.invoices, opts.recipes, opts.returns)
    : calcIngredientUsageFromProduction(opts.recipes, opts.production);
  const used = roundQty(usedMap[itemKey(opts.itemType, opts.itemId)] || 0);
  return {
    purchased,
    used,
    balance: roundQty(purchased - used),
    source: useInv ? "invoices" : "production",
  };
}

export function buildLedgerMap(opts: {
  purchases: Purchase[];
  invoices: Invoice[];
  recipes: Recipe[];
  production: ProductionRun[];
  returns: ReturnRecord[];
  materials: StockItem[];
  packages: StockItem[];
  stickers: StockItem[];
}) {
  const map: Record<string, LedgerRow> = {};
  const pairs: [InvItemType, StockItem[]][] = [
    ["bb_materials", opts.materials],
    ["bb_packages", opts.packages],
    ["bb_stickers", opts.stickers],
  ];
  pairs.forEach(([type, items]) => {
    items.forEach((item) => {
      map[itemKey(type, item.id)] = computeItemLedger({
        itemType: type,
        itemId: item.id,
        purchases: opts.purchases,
        invoices: opts.invoices,
        recipes: opts.recipes,
        production: opts.production,
        returns: opts.returns,
      });
    });
  });
  return map;
}

export function displayStock(
  ledger: Record<string, LedgerRow>,
  itemType: string,
  itemId: string,
  item?: StockItem | null,
) {
  if (!itemType || !itemId) return roundQty(item?.currentStock);
  const led = ledger[itemKey(itemType, itemId)];
  if (led) return roundQty(led.balance);
  return roundQty(item?.currentStock);
}

export function bumpLedger(
  ledger: Record<string, LedgerRow>,
  itemType: string,
  itemId: string,
  qtyDelta: number,
  fallback: LedgerRow,
): Record<string, LedgerRow> {
  const d = roundQty(qtyDelta);
  if (Math.abs(d) < 0.0001) return ledger;
  const k = itemKey(itemType, itemId);
  const next = { ...ledger };
  const led = next[k];
  if (led && led.source !== "—") {
    const purchased = roundQty(led.purchased + d);
    next[k] = {
      ...led,
      purchased,
      balance: roundQty(purchased - (led.used || 0)),
    };
    return next;
  }
  next[k] = fallback;
  return next;
}

export { getReturnLineTotal };
