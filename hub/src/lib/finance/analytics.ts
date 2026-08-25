import type { Invoice, InvoiceLine, InvoicePayments, Product, ReturnRecord } from "@/lib/invoices/types";
import { getReturnLineTotal } from "@/lib/invoices/returns";
import { invoicePayStatus } from "@/lib/invoices/payments";
import type { CustomerPayment, OpCost, ProductionRun, Purchase, Recipe, StockItem } from "./types";
import { catalogInactive, dateInRange, num, round2 } from "./helpers";
import { calcCOGS, findRecipeForItem, isRecipeInactive } from "./recipes";
import {
  aggregateHawalekByProduct,
  aggregateInvoiceReturnQtyByProduct,
  aggregateReturnedByProduct,
  isExpiredDisp,
  isItemsSource,
} from "./returns-live";
import { buildCustomerLedger } from "./customer-ledger";

export function paymentStatus(payments: InvoicePayments, invoiceId: string) {
  return invoicePayStatus(payments, invoiceId);
}

export type SalesProduct = {
  productId: string;
  name: string;
  weight: string;
  qty: number;
  revenue: number;
  paidRev: number;
  pendingRev: number;
  cogs: number;
};

export type SalesAgg = {
  byProduct: Record<string, SalesProduct>;
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  totalQty: number;
};

function applyReturnDeductionsToSales(
  result: SalesAgg,
  returns: ReturnRecord[],
  payments: InvoicePayments,
) {
  returns.forEach((ret) => {
    if (!ret.invoiceId) return;
    const status = paymentStatus(payments, ret.invoiceId);
    (ret.items || []).forEach((it) => {
      const key = it.productId || `name:${it.name || "?"}`;
      const qty = num(it.qty);
      const lineRev = getReturnLineTotal(it);
      if (result.byProduct[key]) {
        result.byProduct[key].qty = Math.max(0, result.byProduct[key].qty - qty);
        result.byProduct[key].revenue = Math.max(0, result.byProduct[key].revenue - lineRev);
        if (status === "paid") {
          result.byProduct[key].paidRev = Math.max(0, result.byProduct[key].paidRev - lineRev);
        } else {
          result.byProduct[key].pendingRev = Math.max(
            0,
            result.byProduct[key].pendingRev - lineRev,
          );
        }
      }
      result.totalQty = Math.max(0, result.totalQty - qty);
      result.totalRevenue = Math.max(0, result.totalRevenue - lineRev);
      if (status === "paid") result.totalPaid = Math.max(0, result.totalPaid - lineRev);
      else result.totalPending = Math.max(0, result.totalPending - lineRev);
    });
  });
  return result;
}

export function aggregateSales(
  invoices: Invoice[],
  returns: ReturnRecord[],
  payments: InvoicePayments,
  customerPayments: CustomerPayment[],
): SalesAgg {
  const byProduct: Record<string, SalesProduct> = {};
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalQty = 0;
  invoices.forEach((inv) => {
    const status = paymentStatus(payments, inv.id);
    const invTotal = num(inv.total);
    totalRevenue += invTotal;
    if (status === "paid") totalPaid += invTotal;
    else totalPending += invTotal;
    (inv.items || []).forEach((it) => {
      const pid = it.productId || `name:${it.name || "?"}`;
      if (!byProduct[pid]) {
        byProduct[pid] = {
          productId: it.productId || "",
          name: String(it.name || "?").split("·")[0].trim(),
          weight: it.weight || "",
          qty: 0,
          revenue: 0,
          paidRev: 0,
          pendingRev: 0,
          cogs: 0,
        };
      }
      const q = num(it.qty);
      const lineRev = q * num(it.price);
      byProduct[pid].qty += q;
      byProduct[pid].revenue += lineRev;
      totalQty += q;
      if (status === "paid") byProduct[pid].paidRev += lineRev;
      else byProduct[pid].pendingRev += lineRev;
    });
  });
  const result = applyReturnDeductionsToSales(
    { byProduct, totalRevenue, totalPaid, totalPending, totalQty },
    returns,
    payments,
  );
  const led = buildCustomerLedger(invoices, returns, payments, customerPayments);
  result.totalPaid = led.totals.paid;
  result.totalPending = led.totals.remaining;
  return result;
}

export function aggregateProduction(recipes: Recipe[], production: ProductionRun[]) {
  const byRecipe: Record<string, number> = {};
  const byProduct: Record<string, number> = {};
  production.forEach((run) => {
    byRecipe[run.recipeId] = (byRecipe[run.recipeId] || 0) + num(run.unitsProduced);
  });
  recipes.forEach((rec) => {
    if (!rec.productId) return;
    byProduct[rec.productId] = (byProduct[rec.productId] || 0) + (byRecipe[rec.id] || 0);
  });
  return { byRecipe, byProduct };
}

export type ProductSummaryRow = {
  productId: string;
  recipeId: string;
  name: string;
  weight: string;
  sold: number;
  soldGross: number;
  produced: number;
  returned: number;
  returnedRestock: number;
  onHand: number;
  gap: number;
  cogsPerUnit: number;
  stockValue: number;
  hasRecipe: boolean;
};

export function buildProductSummary(
  invoices: Invoice[],
  recipes: Recipe[],
  production: ProductionRun[],
  returns: ReturnRecord[],
  payments: InvoicePayments,
  customerPayments: CustomerPayment[],
  findItem: (type: string, id: string) => StockItem | null,
): ProductSummaryRow[] {
  const sales = aggregateSales(invoices, returns, payments, customerPayments);
  const prod = aggregateProduction(recipes, production);
  const returned = aggregateReturnedByProduct(returns);
  const hawalekMap = aggregateHawalekByProduct(returns);
  const ded = aggregateInvoiceReturnQtyByProduct(returns);
  const rows: ProductSummaryRow[] = [];
  const seen: Record<string, boolean> = {};

  recipes.forEach((rec) => {
    if (!rec.productId || seen[rec.productId]) return;
    seen[rec.productId] = true;
    const pid = rec.productId;
    const soldNet = sales.byProduct[pid] ? sales.byProduct[pid].qty : 0;
    const retAll = ded[pid] ? ded[pid].qty : 0;
    const soldGross = soldNet + retAll;
    const produced = prod.byProduct[pid] || 0;
    const retQty = returned[pid] || 0;
    const onHand = produced - soldGross + retQty - (hawalekMap[pid] || 0);
    const cogsPerUnit = calcCOGS(rec, findItem).total;
    rows.push({
      productId: pid,
      recipeId: rec.id,
      name: rec.name,
      weight: rec.productWeight || "",
      sold: soldNet,
      soldGross,
      produced,
      returned: retAll,
      returnedRestock: retQty,
      onHand,
      gap: Math.max(0, soldGross - produced),
      cogsPerUnit,
      stockValue: Math.max(0, onHand) * cogsPerUnit,
      hasRecipe: true,
    });
  });

  Object.keys(sales.byProduct).forEach((pid) => {
    if (pid.startsWith("name:") || seen[pid]) return;
    const s = sales.byProduct[pid];
    const rec = recipes.find((r) => r.productId === pid);
    if (rec) return;
    rows.push({
      productId: pid,
      recipeId: "",
      name: s.name,
      weight: s.weight || "",
      sold: s.qty,
      soldGross: s.qty,
      produced: 0,
      returned: 0,
      returnedRestock: 0,
      onHand: -s.qty,
      gap: s.qty,
      cogsPerUnit: 0,
      stockValue: 0,
      hasRecipe: false,
    });
  });

  rows.sort((a, b) => b.gap - a.gap || b.sold - a.sold);
  return rows;
}

export function calcCOGSFromInvoices(
  invoices: Invoice[],
  recipes: Recipe[],
  returns: ReturnRecord[],
  payments: InvoicePayments,
  findItem: (type: string, id: string) => StockItem | null,
) {
  let total = 0;
  const prodMap: Record<string, SalesProduct> = {};
  const monthlyCOGS: Record<string, number> = {};
  invoices.forEach((inv) => {
    const month = (inv.date || "").slice(0, 7);
    (inv.items || []).forEach((it) => {
      const key = it.productId || it.name || "";
      if (!prodMap[key]) {
        prodMap[key] = {
          productId: it.productId || "",
          name: String(it.name || "?").split("·")[0].trim(),
          weight: it.weight || "",
          qty: 0,
          revenue: 0,
          paidRev: 0,
          pendingRev: 0,
          cogs: 0,
        };
      }
      const q = num(it.qty);
      const lineRev = q * num(it.price);
      const status = paymentStatus(payments, inv.id);
      prodMap[key].qty += q;
      prodMap[key].revenue += lineRev;
      if (status === "paid") prodMap[key].paidRev += lineRev;
      else prodMap[key].pendingRev += lineRev;
      const rec = findRecipeForItem(it, recipes);
      if (rec) {
        const lineCogs = calcCOGS(rec, findItem).total * q;
        prodMap[key].cogs += lineCogs;
        total += lineCogs;
        if (month) monthlyCOGS[month] = (monthlyCOGS[month] || 0) + lineCogs;
      }
    });
  });
  returns.forEach((ret) => {
    (ret.items || []).forEach((it) => {
      const expired = isExpiredDisp(it, ret);
      const key = it.productId || it.name || "";
      const q = num(it.qty);
      const rec = findRecipeForItem(it as InvoiceLine, recipes);
      const lineCogs = rec ? calcCOGS(rec, findItem).total * q : 0;
      const lineRev = getReturnLineTotal(it);
      if (!expired && rec) {
        total = Math.max(0, total - lineCogs);
        const month = (ret.date || "").slice(0, 7);
        if (month && monthlyCOGS[month]) {
          monthlyCOGS[month] = Math.max(0, monthlyCOGS[month] - lineCogs);
        }
      }
      if (prodMap[key]) {
        if (!expired) {
          prodMap[key].qty = Math.max(0, prodMap[key].qty - q);
          if (rec) prodMap[key].cogs = Math.max(0, prodMap[key].cogs - lineCogs);
        }
        if (ret.invoiceId) {
          prodMap[key].revenue = Math.max(0, prodMap[key].revenue - lineRev);
          const status = paymentStatus(payments, ret.invoiceId);
          if (status === "paid") {
            prodMap[key].paidRev = Math.max(0, (prodMap[key].paidRev || 0) - lineRev);
          } else {
            prodMap[key].pendingRev = Math.max(0, (prodMap[key].pendingRev || 0) - lineRev);
          }
        }
      }
    });
  });
  return { total, byProduct: prodMap, monthlyCOGS };
}

export function calcHawalekLoss(
  recipes: Recipe[],
  returns: ReturnRecord[],
  findItem: (type: string, id: string) => StockItem | null,
) {
  let expiredSales = 0;
  let writeoffCogs = 0;
  let expiredQty = 0;
  returns.forEach((ret) => {
    (ret.items || []).forEach((it) => {
      if (!isExpiredDisp(it, ret)) return;
      const q = num(it.qty);
      expiredQty += q;
      expiredSales += getReturnLineTotal(it);
      if (!isItemsSource(ret)) return;
      const rec = findRecipeForItem(it as InvoiceLine, recipes);
      if (rec) writeoffCogs += calcCOGS(rec, findItem).total * q;
    });
  });
  return { expiredSales, writeoffCogs, expiredQty };
}

export function buildMonthlyProfit(
  invoices: Invoice[],
  recipes: Recipe[],
  returns: ReturnRecord[],
  opCosts: { date?: string; amount?: number }[],
  payments: InvoicePayments,
  findItem: (type: string, id: string) => StockItem | null,
) {
  const monthly: Record<
    string,
    {
      revenue: number;
      paid: number;
      pending: number;
      cogs: number;
      opcost: number;
      returns: number;
      hawalek: number;
      hawalekCogs: number;
    }
  > = {};
  function empty() {
    return {
      revenue: 0,
      paid: 0,
      pending: 0,
      cogs: 0,
      opcost: 0,
      returns: 0,
      hawalek: 0,
      hawalekCogs: 0,
    };
  }
  const cogsData = calcCOGSFromInvoices(invoices, recipes, returns, payments, findItem);
  invoices.forEach((inv) => {
    const month = (inv.date || "").slice(0, 7);
    if (!month) return;
    if (!monthly[month]) monthly[month] = empty();
    const status = paymentStatus(payments, inv.id);
    const t = num(inv.total);
    monthly[month].revenue += t;
    if (status === "paid") monthly[month].paid += t;
    else monthly[month].pending += t;
  });
  Object.keys(cogsData.monthlyCOGS).forEach((m) => {
    if (!monthly[m]) monthly[m] = empty();
    monthly[m].cogs = cogsData.monthlyCOGS[m];
  });
  returns.forEach((r) => {
    const month = (r.date || "").slice(0, 7);
    if (!month) return;
    if (!monthly[month]) monthly[month] = empty();
    const itemsSrc = isItemsSource(r);
    const retRev = (r.items || []).reduce((s, it) => s + getReturnLineTotal(it), 0);
    (r.items || []).forEach((it) => {
      if (!isExpiredDisp(it, r)) return;
      monthly[month].hawalek += getReturnLineTotal(it);
      if (itemsSrc) {
        const rec = findRecipeForItem(it as InvoiceLine, recipes);
        const q = num(it.qty);
        if (rec) monthly[month].hawalekCogs += calcCOGS(rec, findItem).total * q;
      }
    });
    if (itemsSrc) return;
    monthly[month].revenue = Math.max(0, monthly[month].revenue - retRev);
    monthly[month].returns += num(r.amount);
    if (r.invoiceId) {
      const st = paymentStatus(payments, r.invoiceId);
      if (st === "paid") monthly[month].paid = Math.max(0, monthly[month].paid - retRev);
      else monthly[month].pending = Math.max(0, monthly[month].pending - retRev);
    }
  });
  opCosts.forEach((o) => {
    const month = (o.date || "").slice(0, 7);
    if (!month) return;
    if (!monthly[month]) monthly[month] = empty();
    monthly[month].opcost += num(o.amount);
  });
  return monthly;
}

export type PeriodProfit = {
  from: string;
  to: string;
  sales: number;
  paid: number;
  pending: number;
  cogs: number;
  opex: number;
  hawalek: number;
  purchases: number;
  net: number;
  invoiceCount: number;
};

export function buildPeriodProfit(opts: {
  from?: string;
  to?: string;
  invoices: Invoice[];
  returns: ReturnRecord[];
  opCosts: OpCost[];
  purchases: Purchase[];
  recipes: Recipe[];
  payments: InvoicePayments;
  customerPayments: CustomerPayment[];
  findItem: (type: string, id: string) => StockItem | null;
}): PeriodProfit {
  const from = String(opts.from || "").slice(0, 10);
  const to = String(opts.to || "").slice(0, 10);
  const invoices = opts.invoices.filter((inv) => dateInRange(inv.date, from, to));
  const returns = opts.returns.filter((r) => dateInRange(r.date, from, to));
  const opCosts = opts.opCosts.filter((o) => dateInRange(o.date, from, to));
  const purch = opts.purchases.filter((p) => dateInRange(p.date, from, to));
  const sales = aggregateSales(invoices, returns, opts.payments, opts.customerPayments);
  const cogs = invoices.length
    ? calcCOGSFromInvoices(invoices, opts.recipes, returns, opts.payments, opts.findItem).total
    : 0;
  const hawalek = invoices.length || returns.length
    ? calcHawalekLoss(opts.recipes, returns, opts.findItem).writeoffCogs
    : 0;
  const opex = opCosts.reduce((s, o) => s + num(o.amount), 0);
  const purchases = purch.reduce((s, p) => s + num(p.totalCost), 0);
  const net = round2(sales.totalRevenue - cogs - opex - hawalek);
  return {
    from,
    to,
    sales: round2(sales.totalRevenue),
    paid: round2(sales.totalPaid),
    pending: round2(sales.totalPending),
    cogs: round2(cogs),
    opex: round2(opex),
    hawalek: round2(hawalek),
    purchases: round2(purchases),
    net,
    invoiceCount: invoices.length,
  };
}

export function itemUsage(
  item: StockItem,
  bbKey: string,
  recipes: Recipe[],
  products: Product[],
  _stickers: StockItem[],
) {
  const active: string[] = [];
  const inactive: string[] = [];
  const seen: Record<string, boolean> = {};
  function addName(name: string, isOff: boolean) {
    const k = (isOff ? "i:" : "a:") + name;
    if (seen[k]) return;
    seen[k] = true;
    (isOff ? inactive : active).push(name);
  }
  recipes.forEach((r) => {
    const used = (r.ingredients || []).some(
      (ing) => ing.itemType === bbKey && ing.itemId === item.id,
    );
    if (!used) return;
    let pname = r.name;
    if (r.productId) {
      const p = products.find((x) => x.id === r.productId);
      pname = p ? p.name || r.name : r.name;
    }
    addName(pname || r.id, isRecipeInactive(r, products));
  });
  if (bbKey === "bb_stickers") {
    if (item.productId) {
      const sp = products.find((x) => x.id === item.productId);
      addName(sp ? sp.name || item.productId : item.productId, catalogInactive(sp));
    }
    if (item.recipeId) {
      const rec = recipes.find((r) => r.id === item.recipeId);
      if (rec) addName(rec.name || item.recipeId, isRecipeInactive(rec, products));
    }
  }
  let kind: "unused" | "active" | "inactive" | "shared" = "unused";
  if (active.length && inactive.length) kind = "shared";
  else if (inactive.length && !active.length) kind = "inactive";
  else if (active.length) kind = "active";
  return { kind, active, inactive };
}

export function alertSuppressed(
  item: StockItem,
  bbKey: string,
  recipes: Recipe[],
  products: Product[],
  stickers: StockItem[],
) {
  return itemUsage(item, bbKey, recipes, products, stickers).kind === "inactive";
}

export function stockStatus(item: StockItem, qty: number, suppressed: boolean) {
  if (suppressed) return "ok" as const;
  if (!item.minStock || item.minStock <= 0) {
    if (qty < 0) return "crit" as const;
    if (qty <= 0) return "low" as const;
    return "ok" as const;
  }
  if (qty < 0) return "crit" as const;
  if (qty <= 0) return "crit" as const;
  if (qty < item.minStock) return qty < item.minStock * 0.5 ? ("crit" as const) : ("low" as const);
  return "ok" as const;
}
