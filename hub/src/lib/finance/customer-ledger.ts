import type {
  Invoice,
  InvoicePayments,
  ReturnRecord,
} from "@/lib/invoices/types";
import { getReturnLineTotal } from "@/lib/invoices/returns";
import { invoicePayStatus } from "@/lib/invoices/payments";
import type { CustomerPayment } from "./types";
import { num } from "./helpers";

export function custKey(id?: string | null, name?: string | null) {
  if (id && String(id).indexOf("name:") === 0) return String(id);
  if (id) return String(id);
  if (name) return `name:${String(name).trim()}`;
  return "";
}

export function invCustKey(inv: { customerId?: string | null; customerName?: string }) {
  return custKey(inv.customerId, inv.customerName);
}

function paidAt(payments: InvoicePayments, invoiceId: string) {
  const rec = payments[invoiceId];
  if (!rec || rec.status !== "paid") return "";
  return rec.updatedAt || "";
}

export type LedgerInvoiceRow = {
  inv: Invoice;
  gross: number;
  returned: number;
  net: number;
  paid: number;
  remaining: number;
  extraReturned: number;
  fullReturn: boolean;
  status: "paid" | "pending" | "return-full" | "return-partial";
};

export type CustomerLedgerCard = {
  key: string;
  name: string;
  phone: string;
  invoices: LedgerInvoiceRow[];
  payments: CustomerPayment[];
  extraReturnRecs: { date: string; amount: number }[];
  gross: number;
  returned: number;
  extraReturns: number;
  unappliedReturns: number;
  net: number;
  paid: number;
  remaining: number;
};

export type CustomerLedger = {
  byCustomer: Record<string, CustomerLedgerCard>;
  byInvoice: Record<string, LedgerInvoiceRow>;
  totals: { gross: number; returned: number; paid: number; remaining: number };
};

function invoiceReturnInfo(
  returns: ReturnRecord[],
  invoiceId: string,
  invoice: Invoice,
) {
  const recs = returns.filter((r) => r.invoiceId === invoiceId);
  if (!recs.length) return null;
  let totalQty = 0;
  let totalRevenue = 0;
  let fullReturn = false;
  recs.forEach((ret) => {
    if (ret.fullReturn) fullReturn = true;
    (ret.items || []).forEach((it) => {
      totalQty += num(it.qty);
      totalRevenue += getReturnLineTotal(it);
    });
  });
  const invQty = (invoice.items || []).reduce((s, it) => s + num(it.qty), 0);
  if (totalQty >= invQty - 0.0001) fullReturn = true;
  return { totalQty, totalRevenue, fullReturn };
}

export function buildCustomerLedger(
  invoices: Invoice[],
  returns: ReturnRecord[],
  payments: InvoicePayments,
  customerPayments: CustomerPayment[],
): CustomerLedger {
  const byCustomer: Record<string, CustomerLedgerCard> = {};
  const byInvoice: Record<string, LedgerInvoiceRow> = {};

  function ensureCust(key: string, name: string, phone: string) {
    const k = key || "_none";
    if (!byCustomer[k]) {
      byCustomer[k] = {
        key: k,
        name: name || "بدون عميل",
        phone: phone || "",
        invoices: [],
        payments: [],
        extraReturnRecs: [],
        gross: 0,
        returned: 0,
        extraReturns: 0,
        unappliedReturns: 0,
        net: 0,
        paid: 0,
        remaining: 0,
      };
    }
    if (name && (byCustomer[k].name === "بدون عميل" || !byCustomer[k].name)) {
      byCustomer[k].name = name;
    }
    if (phone && !byCustomer[k].phone) byCustomer[k].phone = phone;
    return byCustomer[k];
  }

  invoices.forEach((inv) => {
    const key = invCustKey(inv) || "_none";
    const c = ensureCust(key, inv.customerName, inv.customerPhone);
    const info = invoiceReturnInfo(returns, inv.id, inv);
    const gross = num(inv.total);
    const returned = info ? info.totalRevenue : 0;
    const net = Math.max(0, gross - returned);
    const row: LedgerInvoiceRow = {
      inv,
      gross,
      returned,
      net,
      paid: 0,
      remaining: net,
      extraReturned: 0,
      fullReturn: !!(info && info.fullReturn),
      status: "pending",
    };
    c.invoices.push(row);
    c.gross += gross;
    c.returned += returned;
    c.net += net;
    byInvoice[inv.id] = row;
  });

  returns.forEach((ret) => {
    if (ret.invoiceId) return;
    if (ret.skipCustomerCredit) return;
    const amt = (ret.items && ret.items.length)
      ? ret.items.reduce((s, it) => {
          if (it.skipCustomerCredit) return s;
          return s + getReturnLineTotal(it);
        }, 0)
      : num(ret.amount);
    const key = custKey(ret.customerId, ret.customerName);
    if (!key || amt <= 0) return;
    const c = ensureCust(key, ret.customerName || "", "");
    c.extraReturns += amt;
    c.extraReturnRecs.push({ date: ret.date || "", amount: amt });
  });

  customerPayments.forEach((p) => {
    const key = custKey(p.customerId, p.customerName);
    if (!key) return;
    ensureCust(key, p.customerName, "").payments.push(p);
  });

  Object.keys(byCustomer).forEach((key) => {
    const c = byCustomer[key];
    c.invoices.sort(
      (a, b) =>
        (a.inv.date || "").localeCompare(b.inv.date || "") ||
        String(a.inv.invoiceNumber || "").localeCompare(String(b.inv.invoiceNumber || "")),
    );
    const remainMap: Record<string, number> = {};
    const extraAlloc: Record<string, number> = {};
    c.invoices.forEach((row) => {
      remainMap[row.inv.id] = row.net;
      extraAlloc[row.inv.id] = 0;
    });

    function paidBeforeReturn(invoiceId: string, retDate: string) {
      const asOf = retDate || "9999-12-31";
      const pd = paidAt(payments, invoiceId);
      return !!(pd && pd < asOf);
    }

    let extraLeft = 0;
    c.extraReturnRecs
      .slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .forEach((er) => {
        let left = num(er.amount);
        c.invoices.forEach((row) => {
          if (left <= 0.009) return;
          if (paidBeforeReturn(row.inv.id, er.date)) return;
          const take = Math.min(remainMap[row.inv.id], left);
          if (take <= 0.009) return;
          remainMap[row.inv.id] -= take;
          extraAlloc[row.inv.id] += take;
          left -= take;
        });
        extraLeft += Math.max(0, left);
      });
    c.unappliedReturns = extraLeft;
    c.net = Math.max(0, c.gross - (c.returned || 0) - (c.extraReturns || 0));

    const pays = c.payments.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    pays.forEach((p) => {
      let left = num(p.amount);
      if (p.invoiceId && remainMap[p.invoiceId] != null) {
        const take = Math.min(remainMap[p.invoiceId], left);
        remainMap[p.invoiceId] -= take;
        left -= take;
      }
      if (left <= 0) return;
      c.invoices.forEach((row) => {
        if (left <= 0) return;
        if (p.invoiceId && row.inv.id !== p.invoiceId) return;
        const take = Math.min(remainMap[row.inv.id], left);
        remainMap[row.inv.id] -= take;
        left -= take;
      });
    });

    c.invoices.forEach((row) => {
      if (invoicePayStatus(payments, row.inv.id) === "paid") remainMap[row.inv.id] = 0;
    });

    c.paid = 0;
    c.remaining = 0;
    c.invoices.forEach((row) => {
      row.remaining = Math.max(0, remainMap[row.inv.id]);
      const extraOnRow = extraAlloc[row.inv.id] || 0;
      row.extraReturned = extraOnRow;
      row.paid = Math.max(0, row.net - row.remaining - extraOnRow);
      if (row.fullReturn || row.net < 0.009) row.status = "return-full";
      else if ((row.returned > 0.009 || extraOnRow > 0.009) && row.remaining > 0.009) {
        row.status = "return-partial";
      } else if (row.remaining < 0.009) row.status = "paid";
      else row.status = "pending";
      c.paid += row.paid;
      c.remaining += row.remaining;
    });
  });

  const totals = { gross: 0, returned: 0, paid: 0, remaining: 0 };
  Object.values(byCustomer).forEach((c) => {
    totals.gross += c.gross;
    totals.returned += c.returned + c.extraReturns;
    totals.paid += c.paid;
    totals.remaining += c.remaining;
  });
  return { byCustomer, byInvoice, totals };
}

export function settleAmount(cust: CustomerLedgerCard, mode: string) {
  if (mode === "paid_all") return cust.remaining;
  if (mode === "keep_last") {
    const withDue = cust.invoices.filter((r) => r.remaining > 0.009);
    if (withDue.length <= 1) return 0;
    return Math.max(0, cust.remaining - withDue[withDue.length - 1].remaining);
  }
  return 0;
}

export function invoicesToMarkPaid(cust: CustomerLedgerCard) {
  return cust.invoices.filter((row) => row.remaining < 0.009 && !row.fullReturn).map((row) => row.inv.id);
}

export function lastDueInvoice(cust: CustomerLedgerCard) {
  const due = cust.invoices.filter((r) => r.remaining > 0.009);
  return due.length ? due[due.length - 1] : null;
}

/** Newest payment by date, then id — same order as the account modal list. */
export function newestCustomerPayment(payments: CustomerPayment[]) {
  return payments
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id))[0] || null;
}
