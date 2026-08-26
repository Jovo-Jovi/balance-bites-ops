import type { Invoice, InvoicePayments, Product, ReturnRecord } from "@/lib/invoices/types";
import type {
  Investor,
  InvestorTarget,
  OpCost,
  ProductionRun,
  Purchase,
  Recipe,
  StockItem,
} from "./types";
import {
  aggregateSales,
  alertSuppressed,
  buildProductSummary,
  calcCOGSFromInvoices,
  calcHawalekLoss,
  itemUsage,
} from "./analytics";
import type { CustomerPayment } from "./types";
import { displayStock } from "./ledger";
import type { LedgerRow } from "./types";
import { getHawalekAmount, getTotalReturns } from "./returns-live";
import { num, round2 } from "./helpers";

export type StockValueLine = {
  cat: string;
  name: string;
  unit: string;
  purchased: number;
  sold: number;
  qty: number;
  cpu: number;
  val: number;
  activity: "active" | "inactive";
};

export type StockValueReport = {
  lines: StockValueLine[];
  byCat: Record<
    string,
    {
      count: number;
      purchased: number;
      sold: number;
      remain: number;
      val: number;
      valActive: number;
      valInactive: number;
      label: string;
      icon: string;
    }
  >;
  cats: { key: string; icon: string; label: string }[];
  grandVal: number;
  grandValActive: number;
  grandValInactive: number;
  grandPurchased: number;
  grandSold: number;
  grandRemain: number;
  deficits: { cat: string; name: string; qty: number; unit: string; purchased: number; used: number }[];
  fgSummary: ReturnType<typeof buildProductSummary>;
};

function stockActivity(
  item: StockItem | null,
  bbKey: string,
  productId: string | undefined,
  recipes: Recipe[],
  products: Product[],
  stickers: StockItem[],
): "active" | "inactive" {
  if (productId) {
    const p = products.find((x) => x.id === productId);
    return p && (p.inactive === true || p.active === false) ? "inactive" : "active";
  }
  if (item && bbKey) {
    return itemUsage(item, bbKey, recipes, products, stickers).kind === "inactive"
      ? "inactive"
      : "active";
  }
  return "active";
}

export function buildStockValueReport(opts: {
  invoices: Invoice[];
  recipes: Recipe[];
  production: ProductionRun[];
  returns: ReturnRecord[];
  payments: InvoicePayments;
  customerPayments: CustomerPayment[];
  materials: StockItem[];
  packages: StockItem[];
  stickers: StockItem[];
  products: Product[];
  ledger: Record<string, LedgerRow>;
  findItem: (type: string, id: string) => StockItem | null;
}): StockValueReport {
  const summary = buildProductSummary(
    opts.invoices,
    opts.recipes,
    opts.production,
    opts.returns,
    opts.payments,
    opts.customerPayments,
    opts.findItem,
  );
  const lines: StockValueLine[] = [];
  const deficits: StockValueReport["deficits"] = [];

  function addInvItem(typeLabel: string, item: StockItem, bbKey: string) {
    const qty = displayStock(opts.ledger, bbKey, item.id, item);
    const cpu = num(item.costPerUnit);
    const val = Math.max(0, qty) * cpu;
    const activity = stockActivity(item, bbKey, undefined, opts.recipes, opts.products, opts.stickers);
    const led = opts.ledger[`${bbKey}|${item.id}`];
    lines.push({
      cat: typeLabel,
      name: item.name,
      unit: item.unit,
      purchased: led?.purchased || 0,
      sold: led?.used || 0,
      qty,
      cpu,
      val,
      activity,
    });
    if (qty < 0 && !alertSuppressed(item, bbKey, opts.recipes, opts.products, opts.stickers)) {
      deficits.push({
        cat: typeLabel,
        name: item.name,
        qty,
        unit: item.unit,
        purchased: led?.purchased || 0,
        used: led?.used || 0,
      });
    }
  }

  opts.materials.forEach((i) => addInvItem("مواد خام", i, "bb_materials"));
  opts.packages.forEach((i) => addInvItem("تغليف", i, "bb_packages"));
  opts.stickers.forEach((i) => addInvItem("ملصقات", i, "bb_stickers"));

  summary.forEach((r) => {
    const qty = r.onHand || 0;
    const cpu = r.cogsPerUnit || 0;
    const val = Math.max(0, qty) * cpu;
    const activity = stockActivity(null, "", r.productId, opts.recipes, opts.products, opts.stickers);
    lines.push({
      cat: "منتج جاهز",
      name: r.name + (r.weight ? ` · ${r.weight}` : ""),
      unit: "قطعة",
      purchased: r.produced,
      sold: r.sold,
      qty,
      cpu,
      val,
      activity,
    });
    const p = opts.products.find((x) => x.id === r.productId);
    const inactive = p && (p.inactive === true || p.active === false);
    if (qty < 0 && !inactive) {
      deficits.push({
        cat: "منتج جاهز",
        name: r.name,
        qty,
        unit: "قطعة",
        purchased: r.produced,
        used: r.sold,
      });
    }
  });

  const cats = [
    { key: "مواد خام", icon: "🌾", label: "مواد خام" },
    { key: "تغليف", icon: "📦", label: "تغليف" },
    { key: "ملصقات", icon: "🏷", label: "ملصقات" },
    { key: "منتج جاهز", icon: "🍪", label: "منتجات جاهزة" },
  ];
  const byCat: StockValueReport["byCat"] = {};
  cats.forEach((c) => {
    byCat[c.key] = {
      count: 0,
      purchased: 0,
      sold: 0,
      remain: 0,
      val: 0,
      valActive: 0,
      valInactive: 0,
      label: c.label,
      icon: c.icon,
    };
  });
  let grandVal = 0;
  let grandValActive = 0;
  let grandValInactive = 0;
  let grandPurchased = 0;
  let grandSold = 0;
  let grandRemain = 0;
  lines.forEach((l) => {
    const b = byCat[l.cat];
    if (!b) return;
    b.count += 1;
    b.purchased += l.purchased || 0;
    b.sold += l.sold || 0;
    if (l.qty > 0) b.remain += l.qty;
    b.val += l.val;
    if (l.activity === "inactive") {
      b.valInactive += l.val;
      grandValInactive += l.val;
    } else {
      b.valActive += l.val;
      grandValActive += l.val;
    }
    grandVal += l.val;
    grandPurchased += l.purchased || 0;
    grandSold += l.sold || 0;
    if (l.qty > 0) grandRemain += l.qty;
  });
  lines.sort((a, b) => a.cat.localeCompare(b.cat, "ar") || a.name.localeCompare(b.name, "ar"));
  return {
    lines,
    byCat,
    cats,
    grandVal,
    grandValActive,
    grandValInactive,
    grandPurchased,
    grandSold,
    grandRemain,
    deficits,
    fgSummary: summary,
  };
}

export function buildMoneyCycleSummary(
  invoices: Invoice[],
  purchases: Purchase[],
  opCosts: OpCost[],
  returns: ReturnRecord[],
  payments: InvoicePayments,
  customerPayments: CustomerPayment[],
) {
  const purchaseTotal = purchases.reduce((s, p) => s + num(p.totalCost), 0);
  const opex = opCosts.reduce((s, o) => s + num(o.amount), 0);
  const totalSpent = purchaseTotal + opex;
  const sales = invoices.length
    ? aggregateSales(invoices, returns, payments, customerPayments)
    : { totalPaid: 0, totalPending: 0, totalRevenue: 0, totalQty: 0, byProduct: {} };
  const paid = sales.totalPaid;
  const pending = sales.totalPending;
  const retAmt = getTotalReturns(returns);
  const hawalek = getHawalekAmount(returns);
  return {
    purchases: purchaseTotal,
    opCosts: opex,
    totalSpent,
    paid,
    pending,
    returns: retAmt,
    hawalek,
    netFlow: paid - totalSpent,
    sales,
  };
}

export function buildLinkedState(opts: {
  invoices: Invoice[];
  recipes: Recipe[];
  returns: ReturnRecord[];
  payments: InvoicePayments;
  findItem: (type: string, id: string) => StockItem | null;
  cycle: ReturnType<typeof buildMoneyCycleSummary>;
  stockReport: StockValueReport;
  investors: Investor[];
}) {
  const cycle = opts.cycle;
  const sales = cycle.sales;
  const stockReport = opts.stockReport;
  const purchases = cycle.purchases || 0;
  const opex = cycle.opCosts || 0;
  const spent = cycle.totalSpent || 0;
  const paid = sales.totalPaid || 0;
  const pending = sales.totalPending || 0;
  const gross = sales.totalRevenue || 0;
  const stock = stockReport.grandVal || 0;
  const by = stockReport.byCat || {};
  const cv = (k: string) => (by[k] && by[k].val) || 0;
  const stockMat = cv("مواد خام");
  const stockPkg = cv("تغليف");
  const stockStk = cv("ملصقات");
  const stockFg = cv("منتج جاهز");
  const stockActive = stockReport.grandValActive != null ? stockReport.grandValActive : stock;
  const stockInactive = stockReport.grandValInactive || 0;
  let cogs = 0;
  let hawalekCogs = 0;
  let hawalekSales = 0;
  if (opts.invoices.length) {
    cogs = calcCOGSFromInvoices(
      opts.invoices,
      opts.recipes,
      opts.returns,
      opts.payments,
      opts.findItem,
    ).total;
    const hw = calcHawalekLoss(opts.recipes, opts.returns, opts.findItem);
    hawalekCogs = hw.writeoffCogs;
    hawalekSales = hw.expiredSales;
  }
  const invested = opts.investors.reduce((s, p) => s + num(p.amount), 0);
  const cash = round2(invested + paid - spent);
  const cashIfAny = round2(Math.max(0, cash));
  const cashHole = round2(Math.max(0, -cash));
  const nav = round2(cash + stock + pending);
  const shutdownLiquid = round2(paid + pending + stock);
  const shutdownPL = round2(shutdownLiquid - spent);
  const shutdownLiquidLoss = round2(paid + pending);
  const shutdownPLLoss = round2(shutdownLiquidLoss - spent);
  const netProfit = round2(gross - cogs - opex - hawalekCogs);
  return {
    purchases,
    opex,
    spent,
    paid,
    pending,
    gross,
    stock,
    stockActive,
    stockInactive,
    stockMat,
    stockPkg,
    stockStk,
    stockFg,
    cogs,
    hawalekCogs,
    hawalekSales,
    returnsAmt: cycle.returns || 0,
    invested,
    cash,
    cashIfAny,
    cashHole,
    nav,
    netProfit,
    shutdownLiquid,
    shutdownPL,
    shutdownLiquidLoss,
    shutdownPLLoss,
  };
}

export type LinkedState = ReturnType<typeof buildLinkedState>;

export function investorShareOf(list: Investor[], total: number, mode: InvestorTarget["split"]) {
  const out: Record<string, number> = {};
  const people = list || [];
  people.forEach((p) => {
    out[p.id] = 0;
  });
  const n = people.length;
  const cents = Math.round((num(total) || 0) * 100);
  if (!n || cents === 0) return out;
  const weights = people.map((p) => (mode === "equal" ? 1 : Math.max(0, num(p.amount))));
  let wsum = weights.reduce((s, w) => s + w, 0);
  const use = wsum <= 0 ? people.map(() => 1) : weights;
  wsum = use.reduce((s, w) => s + w, 0);
  const floors = use.map((w) => Math.floor((cents * w) / wsum));
  let used = floors.reduce((s, v) => s + v, 0);
  let rem = cents - used;
  const order = use
    .map((w, i) => ({ i, frac: (cents * w) / wsum - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (let r = 0; r < rem; r++) floors[order[r % n].i] += 1;
  people.forEach((p, i) => {
    out[p.id] = floors[i] / 100;
  });
  return out;
}

export function prepBuyQty(line: { shortfall?: number; needed?: number; stock?: number }) {
  const short = num(line.shortfall);
  if (short > 0) return short;
  const gap = num(line.needed) - num(line.stock);
  return gap > 0 ? gap : 0;
}
