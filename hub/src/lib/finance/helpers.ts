import { genId as invoiceGenId, todayISO as invoiceToday } from "@/lib/invoices/helpers";
import type { Product } from "@/lib/invoices/types";
import type { InvItemType, StockItem } from "./types";

export type { InvItemType, StockItem };

export { todayISO } from "@/lib/invoices/helpers";
export { fmt, fmtQty, genId, asArray, asRecord } from "@/lib/invoices/helpers";
export { isInactiveProduct } from "@/lib/invoices/helpers";

export function roundQty(n: unknown) {
  const v = parseFloat(String(n));
  if (Number.isNaN(v)) return 0;
  if (Math.abs(v) < 1e-9) return 0;
  const r = Math.round(v * 1e6) / 1e6;
  if (Math.abs(r - Math.round(r)) < 1e-6) return Math.round(r);
  return r;
}

export function round2(n: unknown) {
  return Math.round((parseFloat(String(n)) || 0) * 100) / 100;
}

export function num(n: unknown) {
  const v = parseFloat(String(n));
  return Number.isNaN(v) ? 0 : v;
}

export function financeId(prefix: string) {
  return invoiceGenId(prefix);
}

export function today() {
  return invoiceToday();
}

export function itemKey(type: string, id: string) {
  return `${type}|${id}`;
}

export function parseItemKey(key: string): { type: InvItemType; id: string } | null {
  const i = key.indexOf("|");
  if (i < 1) return null;
  const type = key.slice(0, i) as InvItemType;
  if (type !== "bb_materials" && type !== "bb_packages" && type !== "bb_stickers") {
    return null;
  }
  return { type, id: key.slice(i + 1) };
}

export const INV_TYPES: { id: InvItemType; label: string }[] = [
  { id: "bb_materials", label: "مواد خام" },
  { id: "bb_packages", label: "تغليف" },
  { id: "bb_stickers", label: "ملصقات" },
];

export function typeLabel(type: string) {
  if (type === "bb_materials") return "مواد خام";
  if (type === "bb_packages") return "تغليف";
  if (type === "bb_stickers") return "ملصقات";
  return type;
}

export function emptyStockItem(prefix: string, patch: Partial<StockItem> = {}): StockItem {
  return {
    id: patch.id || financeId(prefix),
    name: patch.name || "",
    unit: patch.unit || "قطعة",
    costPerUnit: num(patch.costPerUnit),
    currentStock: roundQty(patch.currentStock),
    minStock: roundQty(patch.minStock),
    supplier: patch.supplier || "",
    notes: patch.notes || "",
    productId: patch.productId || "",
    recipeId: patch.recipeId || "",
    templateKey: patch.templateKey || "",
  };
}

export function catalogInactive(p: Product | null | undefined) {
  return !!(p && (p.inactive === true || p.active === false));
}

export const OP_CATEGORIES = [
  "إيجار",
  "مرافق",
  "أجور",
  "صيانة",
  "نقل",
  "تسويق",
  "تعويض",
  "أخرى",
] as const;

export function isCompensation(cat: string) {
  return cat === "تعويض";
}

export function adjSupplier(name: string) {
  return name === "تسوية جرد" || name === "رصيد افتتاحي";
}
