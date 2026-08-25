import type { Customer, Invoice, InvoiceLine, Product } from "@/lib/invoices/types";
import { calcTotals } from "@/lib/invoices/helpers";
import { financeId, num, roundQty, todayISO } from "./helpers";
import { recipeSellPrice } from "./recipes";
import type { FinancePending, PrepLine, Recipe } from "./types";

export function isInvoiceDraft(p: FinancePending | null | undefined) {
  return !!(p && p.kind === "invoice_draft");
}

export function getPrepOrders(all: FinancePending[]) {
  return all.filter((p) => p.status !== "completed" && !isInvoiceDraft(p));
}

export function getInvoiceDrafts(all: FinancePending[]) {
  return all.filter((p) => isInvoiceDraft(p) && p.status !== "completed");
}

export function getAwaitingProduction(all: FinancePending[]) {
  return all.filter((p) => p.status === "awaiting_production");
}

export function findDraftByCustomer(all: FinancePending[], customerId: string) {
  if (!customerId) return null;
  return getInvoiceDrafts(all).find((p) => p.customerId === customerId) || null;
}

export function prepLinesToItems(prepLines: PrepLine[], recipes: Recipe[], products: Product[]): InvoiceLine[] {
  const items: InvoiceLine[] = [];
  (prepLines || []).forEach((line) => {
    const rec = recipes.find((r) => r.id === line.recipeId);
    if (!rec) return;
    const p = rec.productId ? products.find((x) => x.id === rec.productId) : null;
    items.push({
      productId: p ? p.id : rec.productId || null,
      name: p ? p.name : rec.name,
      packType: p ? p.packType || "" : "",
      weight: p ? p.weight || "" : rec.productWeight || "",
      categoryId: p ? p.categoryId || null : rec.categoryId || null,
      qty: roundQty(line.units),
      price: p ? num(p.unitPrice) : recipeSellPrice(rec, products),
    });
  });
  return items;
}

export function emptyInvoiceDraft(customer: Customer, meta?: { notes?: string; date?: string; discount?: number }): FinancePending {
  return {
    id: financeId("pend"),
    kind: "invoice_draft",
    status: "invoice_ready",
    title: `فاتورة · ${customer.name || customer.id}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerId: customer.id,
    customerName: customer.name || "",
    customerPhone: customer.phone || "",
    notes: meta?.notes || "",
    date: meta?.date || todayISO(),
    discount: num(meta?.discount),
    items: [],
    prepLines: [],
    prepSummary: { stockOk: true },
    completedInvoiceId: null,
    productionApprovedAt: null,
  };
}

export function mergeDraftItem(items: InvoiceLine[], item: InvoiceLine): InvoiceLine[] {
  const next = items.map((it) => ({ ...it }));
  const hit = next.find((it) =>
    item.productId
      ? it.productId === item.productId
      : !it.productId && (it.name || "") === (item.name || ""),
  );
  if (hit) {
    hit.qty = roundQty(num(hit.qty) + num(item.qty));
    if (item.price != null) hit.price = num(item.price);
    return next;
  }
  next.push({
    productId: item.productId || null,
    name: item.name || "",
    packType: item.packType || "",
    weight: item.weight || "",
    categoryId: item.categoryId || null,
    qty: roundQty(num(item.qty)),
    price: num(item.price),
  });
  return next;
}

export function draftToInvoice(pend: FinancePending, invNum: string): Invoice {
  const items = (pend.items || []).filter((it) => num(it.qty) > 0);
  const t = calcTotals(items, num(pend.discount));
  return {
    id: financeId("inv"),
    customerId: pend.customerId || null,
    invoiceNumber: invNum,
    date: pend.date || todayISO(),
    customerName: pend.customerName || "",
    customerPhone: pend.customerPhone || "",
    items,
    subtotal: t.subtotal,
    discount: t.discount,
    discountAmount: t.discountAmount,
    total: t.total,
    notes: pend.notes || "",
    savedAt: new Date().toISOString(),
    fromPrepInvoiceId: pend.id,
  };
}

export function makePrepOrder(
  prepLines: PrepLine[],
  items: InvoiceLine[],
  meta: Partial<FinancePending>,
): FinancePending {
  return {
    id: financeId("pend"),
    kind: meta.kind || "prep",
    status: meta.status || "pending",
    title: meta.title || `طلب تحضير · ${todayISO()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerId: meta.customerId || null,
    customerName: meta.customerName || "",
    customerPhone: meta.customerPhone || "",
    notes: meta.notes || "",
    date: meta.date || todayISO(),
    discount: num(meta.discount),
    items,
    prepLines: prepLines.map((l) => ({ ...l })),
    prepSummary: meta.prepSummary || { stockOk: true },
    completedInvoiceId: null,
    productionApprovedAt: null,
  };
}
