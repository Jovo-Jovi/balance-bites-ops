import { itemRetKey } from "./helpers";
import type {
  EnrichedInvoice,
  Invoice,
  ItemReturnBreakdown,
  ReturnInfo,
  ReturnRecord,
  SalesStatus,
} from "./types";

function getReturnLineTotal(it: { lineTotal?: number; qty?: number; price?: number }) {
  const lt = parseFloat(String(it.lineTotal));
  if (!Number.isNaN(lt) && lt > 0) return lt;
  return (parseFloat(String(it.qty)) || 0) * (parseFloat(String(it.price)) || 0);
}

function aggregateReturnedDeductions(returns: ReturnRecord[]) {
  const byInvoice: Record<
    string,
    {
      records: ReturnRecord[];
      totalQty: number;
      totalRevenue: number;
      totalExpiredAmt: number;
      fullReturn: boolean;
    }
  > = {};

  returns.forEach((ret) => {
    if (!ret.invoiceId) return;
    if (!byInvoice[ret.invoiceId]) {
      byInvoice[ret.invoiceId] = {
        records: [],
        totalQty: 0,
        totalRevenue: 0,
        totalExpiredAmt: 0,
        fullReturn: false,
      };
    }
    const info = byInvoice[ret.invoiceId];
    info.records.push(ret);
    if (ret.fullReturn) info.fullReturn = true;
    info.totalExpiredAmt += parseFloat(String(ret.amount)) || 0;
    (ret.items || []).forEach((it) => {
      info.totalQty += parseFloat(String(it.qty)) || 0;
      info.totalRevenue += getReturnLineTotal(it);
    });
  });
  return byInvoice;
}

export function isInvoiceFullyReturned(
  invoice: Invoice,
  info: { fullReturn?: boolean; totalQty: number } | null,
) {
  if (!info) return false;
  if (info.fullReturn) return true;
  const invQty = (invoice.items || []).reduce(
    (s, it) => s + (parseFloat(String(it.qty)) || 0),
    0,
  );
  return info.totalQty >= invQty - 0.0001;
}

export function getInvoiceReturnInfo(
  returns: ReturnRecord[],
  invoiceId: string,
  invoice: Invoice,
): ReturnInfo | null {
  const info = aggregateReturnedDeductions(returns)[invoiceId];
  if (!info) return null;
  return {
    records: info.records,
    totalQty: info.totalQty,
    totalRevenue: info.totalRevenue,
    totalExpiredAmt: info.totalExpiredAmt,
    fullReturn: isInvoiceFullyReturned(invoice, info),
  };
}

export function enrichInvoice(returns: ReturnRecord[], inv: Invoice): EnrichedInvoice {
  const info = getInvoiceReturnInfo(returns, inv.id, inv);
  const gross = parseFloat(String(inv.total)) || 0;
  if (!info) {
    return { inv, gross, net: gross, returnInfo: null, salesStatus: "active" };
  }
  if (isInvoiceFullyReturned(inv, info)) {
    return { inv, gross, net: 0, returnInfo: info, salesStatus: "full" };
  }
  return {
    inv,
    gross,
    net: Math.max(0, gross - info.totalRevenue),
    returnInfo: info,
    salesStatus: "partial",
  };
}

export function salesStatusLabel(status: SalesStatus) {
  if (status === "full") return "مرتجع كامل";
  if (status === "partial") return "مرتجع جزئي";
  return "";
}

export function subtractReturnsFromProdMap(
  returns: ReturnRecord[],
  prodMap: Record<string, { name: string; qty: number; rev: number; count: number }>,
  invoiceIds: string[],
) {
  const idSet = new Set(invoiceIds);
  returns.forEach((ret) => {
    if (!ret.invoiceId || !idSet.has(ret.invoiceId)) return;
    (ret.items || []).forEach((it) => {
      const key = it.productId || it.name || "";
      if (!prodMap[key]) return;
      prodMap[key].qty = Math.max(0, prodMap[key].qty - (parseFloat(String(it.qty)) || 0));
      prodMap[key].rev = Math.max(0, prodMap[key].rev - getReturnLineTotal(it));
    });
  });
  return prodMap;
}

export function getItemReturnBreakdown(
  returns: ReturnRecord[],
  invoiceId: string | null,
  invoiceItems: Invoice["items"],
): Record<string, ItemReturnBreakdown> {
  if (!invoiceId) return {};
  const byKey: Record<string, ItemReturnBreakdown> = {};
  function ensure(k: string, name?: string) {
    if (!byKey[k]) {
      byKey[k] = { name: name || "", expiredQty: 0, restockQty: 0, soldTo: [] };
    }
    return byKey[k];
  }
  (invoiceItems || []).forEach((it) => ensure(itemRetKey(it), it.name));
  returns
    .filter((r) => r.invoiceId === invoiceId)
    .forEach((ret) => {
      (ret.items || []).forEach((it) => {
        const row = ensure(itemRetKey(it), it.name);
        const qty = parseFloat(String(it.qty)) || 0;
        const disp = it.disposition || ret.disposition || "expired";
        if (disp === "restock") row.restockQty += qty;
        else row.expiredQty += qty;
      });
      (ret.outAllocations || []).forEach((a) => {
        const row = ensure(itemRetKey(a), a.name);
        const qty = parseFloat(String(a.qty)) || 0;
        if (qty <= 0) return;
        const cust = a.toCustomerName || "—";
        const invNo = a.toInvoiceNumber || "";
        const found = row.soldTo.find(
          (s) => s.customerName === cust && s.invoiceNumber === invNo,
        );
        if (found) found.qty += qty;
        else row.soldTo.push({ customerName: cust, invoiceNumber: invNo, qty });
      });
    });
  return byKey;
}

export function hasItemReturnInfo(info?: ItemReturnBreakdown | null) {
  if (!info) return false;
  return info.expiredQty > 0 || info.restockQty > 0 || (info.soldTo && info.soldTo.length > 0);
}

export { getReturnLineTotal };
