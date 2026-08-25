import type { Invoice, InvoiceLine } from "@/lib/invoices/types";
import { num } from "./helpers";
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

export type UnmatchedInvoiceLine = {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  name: string;
  qty: number;
};

/** Lines that `findRecipeForItem` cannot join — same matcher, no new rules. */
export function unmatchedInvoiceLines(invoices: Invoice[], recipes: Recipe[]) {
  const out: UnmatchedInvoiceLine[] = [];
  invoices.forEach((inv) => {
    (inv.items || []).forEach((it) => {
      if (num(it.qty) <= 0) return;
      const name = String(it.name || "").trim();
      if (!name || name.toLowerCase() === "discount") return;
      if (findRecipeForItem(it, recipes)) return;
      out.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber || "",
        date: inv.date || "",
        customerName: inv.customerName || "",
        name: it.name,
        qty: num(it.qty),
      });
    });
  });
  return out;
}
