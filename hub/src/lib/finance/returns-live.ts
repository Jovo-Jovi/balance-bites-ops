import type { InvoiceLine, ReturnRecord } from "@/lib/invoices/types";
import { getReturnLineTotal } from "@/lib/invoices/returns";

export function isItemsSource(ret: ReturnRecord & { source?: string }) {
  if (ret.source === "items") return true;
  if (ret.source === "invoice") return false;
  return !ret.invoiceId;
}

export function isExpiredDisp(
  it: { disposition?: string } | null | undefined,
  ret: { disposition?: string } | null | undefined,
) {
  const d = (it && it.disposition) || (ret && ret.disposition) || "expired";
  return d !== "restock";
}

export function getTotalReturns(returns: ReturnRecord[]) {
  return returns.reduce((s, r) => {
    if (isItemsSource(r)) return s;
    return s + (parseFloat(String(r.amount)) || 0);
  }, 0);
}

export function getHawalekAmount(returns: ReturnRecord[]) {
  return returns.reduce((s, r) => {
    const items = r.items || [];
    if (!items.length) {
      return isExpiredDisp(null, r) ? s + (parseFloat(String(r.amount)) || 0) : s;
    }
    return (
      s +
      items.reduce(
        (s2, it) => (isExpiredDisp(it, r) ? s2 + getReturnLineTotal(it) : s2),
        0,
      )
    );
  }, 0);
}

export function aggregateHawalekByProduct(returns: ReturnRecord[]) {
  const map: Record<string, number> = {};
  returns.forEach((ret) => {
    if (!isItemsSource(ret)) return;
    (ret.items || []).forEach((it) => {
      if (!isExpiredDisp(it, ret)) return;
      const key = it.productId || `name:${it.name || "?"}`;
      map[key] = (map[key] || 0) + (parseFloat(String(it.qty)) || 0);
    });
  });
  return map;
}

export function aggregateInvoiceReturnQtyByProduct(returns: ReturnRecord[]) {
  const map: Record<string, { qty: number; revenue: number }> = {};
  returns.forEach((ret) => {
    if (!ret.invoiceId) return;
    (ret.items || []).forEach((it) => {
      const key = it.productId || `name:${it.name || "?"}`;
      if (!map[key]) map[key] = { qty: 0, revenue: 0 };
      map[key].qty += parseFloat(String(it.qty)) || 0;
      map[key].revenue += getReturnLineTotal(it);
    });
  });
  return map;
}

export function aggregateReturnedByProduct(returns: ReturnRecord[]) {
  const map: Record<string, number> = {};
  returns.forEach((ret) => {
    (ret.items || []).forEach((it) => {
      if (isExpiredDisp(it, ret)) return;
      const key = it.productId || `name:${it.name || "?"}`;
      map[key] = (map[key] || 0) + (parseFloat(String(it.qty)) || 0);
    });
  });
  return map;
}

export function normalizeDisposition(items: { disposition?: string }[]) {
  const disps = items.map((it) => it.disposition || "expired");
  const hasRestock = disps.some((d) => d === "restock");
  const hasExpired = disps.some((d) => d !== "restock");
  if (hasRestock && hasExpired) return "mixed";
  if (hasRestock) return "restock";
  return "expired";
}

export type { InvoiceLine };
