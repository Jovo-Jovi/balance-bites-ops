import type { Invoice, InvoiceLine, ReturnRecord } from "@/lib/invoices/types";
import type { Investor, InvestorTarget, OpCost, Recipe, StockItem } from "./types";
import { num, round2, todayISO } from "./helpers";
import { calcCOGS, findRecipeForItem } from "./recipes";
import { investorShareOf, type LinkedState } from "./reports";
import type { CustomerLedger } from "./customer-ledger";
import { isExpiredDisp } from "./returns-live";

export function invstrDay(d: string | undefined | null) {
  const s = String(d || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

export function invstrAddDays(iso: string, n: number) {
  const d = new Date(`${String(iso)}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return iso;
  d.setDate(d.getDate() + (parseInt(String(n), 10) || 0));
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? "0" : ""}${m}-${day < 10 ? "0" : ""}${day}`;
}

export function clampInvstrDay(d: string | undefined | null, start: string | undefined | null) {
  let day = invstrDay(d);
  const begin = invstrDay(start);
  if (!day) return begin || "0000-00-00";
  if (begin && day < begin) return begin;
  return day;
}

export function invstrMinInvoiceDay(invoices: Invoice[]) {
  let min = "";
  (invoices || []).forEach((inv) => {
    const d = invstrDay(inv.date);
    if (d && (!min || d < min)) min = d;
  });
  return min;
}

export function invstrMaxInvoiceDay(invoices: Invoice[]) {
  let max = "";
  (invoices || []).forEach((inv) => {
    const d = invstrDay(inv.date);
    if (d && d > max) max = d;
  });
  return max;
}

export function parseInvestorPlan(raw: unknown): InvestorTarget {
  const empty: InvestorTarget = {
    needed: 0,
    split: "share",
    projectStart: "",
    collectionLag: 30,
    stockPlacement: "journal",
    includeResidual: false,
  };
  if (raw == null || raw === "") return empty;
  if (typeof raw === "number" || typeof raw === "string") {
    return { ...empty, needed: Math.max(0, num(raw)) };
  }
  const v = raw as Record<string, unknown>;
  const lagRaw = v.collectionLag == null ? 30 : parseInt(String(v.collectionLag), 10);
  const lag = !Number.isFinite(lagRaw) || lagRaw < 0 ? 30 : lagRaw;
  return {
    needed: Math.max(0, num(v.needed)),
    split: v.split === "equal" ? "equal" : "share",
    projectStart: invstrDay(String(v.projectStart || "")),
    collectionLag: lag,
    stockPlacement: v.stockPlacement === "today" ? "today" : "journal",
    includeResidual: !!v.includeResidual,
  };
}

export function investorJoinDay(p: Investor, start: string) {
  const begin = invstrDay(start);
  const d = invstrDay(p.date);
  if (!d) return begin || "0000-00-00";
  if (begin && d < begin) return begin;
  return d;
}

export function resolveProjectStart(invoices: Invoice[], plan: InvestorTarget) {
  const saved = invstrDay(plan.projectStart);
  if (saved) return saved;
  return invstrMinInvoiceDay(invoices) || todayISO();
}

/** Live `capitalForCurrentState.required`: capital that sales have not yet recycled. */
export function capitalPeak(spent: number, sales: number) {
  return round2(Math.max(0, num(spent) - num(sales)));
}

export function capitalAssignment(peak: number, list: Investor[]) {
  const pk = round2(peak || 0);
  const people = list || [];
  const invested = round2(people.reduce((s, p) => s + num(p.amount), 0));
  const gap = round2(Math.max(0, pk - invested));
  const overflow = round2(Math.max(0, invested - pk));
  const toward: Record<string, number> = {};
  const overflowBy: Record<string, number> = {};
  const pctOfActual: Record<string, number> = {};
  const denom = invested > 0.009 ? invested : 0;
  people.forEach((p) => {
    const amt = num(p.amount);
    if (overflow > 0.009 && denom > 0) {
      toward[p.id] = round2((amt / denom) * pk);
      overflowBy[p.id] = round2(Math.max(0, amt - toward[p.id]));
    } else {
      toward[p.id] = round2(amt);
      overflowBy[p.id] = 0;
    }
    pctOfActual[p.id] = pk > 0.009 ? (toward[p.id] / pk) * 100 : 0;
  });
  return { peak: pk, invested, gap, overflow, toward, overflowBy, pctOfActual };
}

function invoiceLineCogs(
  it: InvoiceLine,
  recipes: Recipe[],
  findItem: (type: string, id: string) => StockItem | null,
) {
  const rec = findRecipeForItem(it, recipes);
  if (!rec) return 0;
  return calcCOGS(rec, findItem).total * num(it.qty);
}

export function allocateProfitByJoinDate(opts: {
  list: Investor[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  recipes: Recipe[];
  opCosts: OpCost[];
  ledger: CustomerLedger;
  netProfit: number;
  start: string;
  findItem: (type: string, id: string) => StockItem | null;
}) {
  const people = opts.list || [];
  const out: Record<string, number> = {};
  people.forEach((p) => {
    out[p.id] = 0;
  });
  if (!people.length) return out;
  const start = opts.start;
  const byDay: Record<string, number> = {};
  function add(date: string | undefined | null, amt: number) {
    let d = invstrDay(date);
    if (start && d && d < start) d = start;
    if (!d) d = start || "0000-00-00";
    byDay[d] = (byDay[d] || 0) + num(amt);
  }
  const cogsByInv: Record<string, number> = {};
  opts.invoices.forEach((inv) => {
    cogsByInv[inv.id] = (inv.items || []).reduce(
      (s, it) => s + invoiceLineCogs(it, opts.recipes, opts.findItem),
      0,
    );
  });
  opts.returns.forEach((ret) => {
    (ret.items || []).forEach((it) => {
      const line = invoiceLineCogs(it as InvoiceLine, opts.recipes, opts.findItem);
      if (ret.invoiceId && cogsByInv[ret.invoiceId] != null) {
        cogsByInv[ret.invoiceId] = Math.max(0, cogsByInv[ret.invoiceId] - line);
      }
      if (isExpiredDisp(it, ret) && line > 0.009) add(ret.date, -line);
    });
  });
  opts.invoices.forEach((inv) => {
    const row = opts.ledger.byInvoice[inv.id];
    const net = row ? num(row.net) : num(inv.total);
    add(inv.date, net - (cogsByInv[inv.id] || 0));
  });
  opts.opCosts.forEach((o) => add(o.date, -num(o.amount)));
  let earliest = "9999-99-99";
  people.forEach((p) => {
    const jd = investorJoinDay(p, start);
    if (jd < earliest) earliest = jd;
  });
  Object.keys(byDay)
    .sort()
    .forEach((d) => {
      const amount = byDay[d];
      let eligible = people.filter((p) => investorJoinDay(p, start) <= d);
      if (!eligible.length) eligible = people.filter((p) => investorJoinDay(p, start) === earliest);
      if (!eligible.length) return;
      const wsum = eligible.reduce((s, p) => s + num(p.amount), 0);
      if (wsum <= 0) {
        const eq = amount / eligible.length;
        eligible.forEach((p) => {
          out[p.id] += eq;
        });
        return;
      }
      eligible.forEach((p) => {
        out[p.id] += amount * (num(p.amount) / wsum);
      });
    });
  let allocated = 0;
  people.forEach((p) => {
    allocated += out[p.id];
  });
  const residual = num(opts.netProfit) - allocated;
  if (Math.abs(residual) > 0.05) {
    const founders = people.filter((p) => investorJoinDay(p, start) === earliest);
    const fw = founders.reduce((s, p) => s + num(p.amount), 0);
    founders.forEach((p) => {
      const w = fw > 0 ? num(p.amount) / fw : 1 / founders.length;
      out[p.id] += residual * w;
    });
  }
  people.forEach((p) => {
    out[p.id] = round2(out[p.id]);
  });
  return out;
}

export type InvestorRow = {
  investor: Investor;
  joinDay: string;
  recorded: number;
  pctRecorded: number;
  toward: number;
  overflow: number;
  pctActual: number;
  extraNeed: number;
  profitAfterJoin: number;
  navShare: number;
};

export function buildInvestorSnapshot(opts: {
  investors: Investor[];
  plan: InvestorTarget;
  invoices: Invoice[];
  returns: ReturnRecord[];
  recipes: Recipe[];
  opCosts: OpCost[];
  ledger: CustomerLedger;
  linked: LinkedState;
  findItem: (type: string, id: string) => StockItem | null;
  /** Live `fin.wc.peak`. Falls back to spent − sales when omitted. */
  peak?: number;
  recycled?: number;
}) {
  const plan = parseInvestorPlan(opts.plan);
  const start = resolveProjectStart(opts.invoices, plan) || "";
  const list = opts.investors.slice().sort((a, b) => {
    const da = investorJoinDay(a, start);
    const db = investorJoinDay(b, start);
    if (da !== db) return da < db ? -1 : 1;
    return num(b.amount) - num(a.amount);
  });
  const simplePeak = capitalPeak(opts.linked.spent, opts.linked.gross);
  const peak = opts.peak != null ? round2(Math.max(0, opts.peak)) : simplePeak;
  const cap = capitalAssignment(peak, list);
  const profitById = allocateProfitByJoinDate({
    list,
    invoices: opts.invoices,
    returns: opts.returns,
    recipes: opts.recipes,
    opCosts: opts.opCosts,
    ledger: opts.ledger,
    netProfit: opts.linked.netProfit,
    start,
    findItem: opts.findItem,
  });
  const extraSplits = investorShareOf(list, plan.needed || 0, plan.split || "share");
  const rows: InvestorRow[] = list.map((p) => {
    const toward = cap.toward[p.id] || 0;
    return {
      investor: p,
      joinDay: investorJoinDay(p, start),
      recorded: num(p.amount),
      pctRecorded: cap.invested > 0.009 ? (num(p.amount) / cap.invested) * 100 : 0,
      toward,
      overflow: cap.overflowBy[p.id] || 0,
      pctActual: cap.pctOfActual[p.id] || 0,
      extraNeed: extraSplits[p.id] || 0,
      profitAfterJoin: profitById[p.id] || 0,
      navShare: peak > 0.009 ? opts.linked.nav * (toward / peak) : 0,
    };
  });
  return {
    start,
    peak,
    simplePeak,
    cap,
    rows,
    extraSplits,
    recycled:
      opts.recycled != null
        ? round2(Math.max(0, opts.recycled))
        : round2(Math.max(0, Math.min(opts.linked.spent, opts.linked.gross))),
    roi: peak > 0.009 ? (opts.linked.netProfit / peak) * 100 : null,
  };
}
