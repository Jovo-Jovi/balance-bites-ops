import type { Invoice, InvoiceLine, Product } from "./types";

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function genId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

export function fmt(n: number) {
  return Number(n).toLocaleString("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function fmtQty(n: number) {
  return Number(n).toLocaleString("ar-EG", { maximumFractionDigits: 2 });
}

export function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function itemRetKey(it: { productId?: string | null; name?: string }) {
  return it.productId || `name:${String(it.name || "").trim()}`;
}

export function isInactiveProduct(p: Product | null | undefined) {
  return !!(p && (p.inactive === true || p.active === false));
}

export function cloneLineFromProduct(p: Product): InvoiceLine {
  return {
    productId: p.id,
    name: p.name || "",
    packType: p.packType || "",
    weight: p.weight || "",
    categoryId: p.categoryId || null,
    qty: 1,
    price: Number(p.unitPrice) || 0,
  };
}

export function normalizeLine(it: Partial<InvoiceLine> | null | undefined): InvoiceLine {
  return {
    productId: it?.productId || null,
    name: it?.name || "",
    packType: it?.packType || "",
    weight: it?.weight || "",
    categoryId: it?.categoryId || null,
    qty: Number(it?.qty) || 1,
    price: Number(it?.price) || 0,
  };
}

export function cloneLines(src: InvoiceLine[] | undefined) {
  return (src || [])
    .map((it) => normalizeLine(it))
    .filter((it) => it.name.trim() || it.productId);
}

export function lineSubtotal(it: InvoiceLine) {
  return (Number(it.qty) || 0) * (Number(it.price) || 0);
}

export function calcTotals(items: InvoiceLine[], discountPct: number) {
  const subtotal = items.reduce((sum, it) => sum + lineSubtotal(it), 0);
  const discount = Number(discountPct) || 0;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  return { subtotal, discount, discountAmount, total };
}

export function nextInvoiceNumber(invoices: Invoice[], customerId?: string | null) {
  const source = customerId
    ? invoices.filter((inv) => inv.customerId === customerId)
    : invoices;
  let maxNum = 0;
  source.forEach((inv) => {
    const m = (inv.invoiceNumber || "").match(/(\d+)/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  return `#INV-${String(maxNum + 1).padStart(3, "0")}`;
}

export function nextGlobalInvoiceNumber(invoices: Invoice[]) {
  let maxNum = 0;
  invoices.forEach((inv) => {
    const m = (inv.invoiceNumber || "").match(/(\d+)/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  return `#INV-${String(maxNum + 1).padStart(3, "0")}`;
}

export function emptyDraft(invoiceNumber: string, date = todayISO()) {
  return {
    loadedInvoiceId: null as string | null,
    pendingId: null as string | null,
    customerId: null as string | null,
    customerName: "",
    customerPhone: "",
    invoiceNumber,
    date,
    notes: "",
    discount: 0,
    items: [] as InvoiceLine[],
  };
}

export function draftFromInvoice(inv: Invoice) {
  return {
    loadedInvoiceId: inv.id,
    pendingId: null as string | null,
    customerId: inv.customerId || null,
    customerName: inv.customerName || "",
    customerPhone: inv.customerPhone || "",
    invoiceNumber: inv.invoiceNumber || "",
    date: inv.date || todayISO(),
    notes: inv.notes || "",
    discount: inv.discount || 0,
    items: cloneLines(inv.items),
  };
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asRecord<T extends Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  return {} as T;
}
