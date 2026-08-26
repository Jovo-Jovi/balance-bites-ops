import type { Invoice, InvoiceLine, InvoicePayments, ReturnRecord } from "@/lib/invoices/types";
import { invoicePayStatus } from "@/lib/invoices/payments";
import type { CustomerLedger } from "./customer-ledger";
import { num, round2, todayISO } from "./helpers";
import {
  clampInvstrDay,
  invstrAddDays,
  invstrDay,
  parseInvestorPlan,
  resolveProjectStart,
} from "./investors";
import { findRecipeForItem } from "./recipes";
import type { StockValueReport } from "./reports";
import { isExpiredDisp } from "./returns-live";
import type { InvestorTarget, OpCost, Purchase, Recipe, StockItem } from "./types";

/** Live `invstrJournalStockChunks` count window — copy, do not invent a rolling range. */
export const JOURNAL_FROM = "2026-07-15";
export const JOURNAL_TO = "2026-08-14";

export type WcKind = "بضاعة فاتورة" | "بضاعة" | "فرق" | "هوالك" | "تشغيل" | "تحصيل";

export type WcMoney = {
  mat: number;
  pkg: number;
  stk: number;
  other: number;
  total: number;
};

export type WcEvent = {
  date: string;
  dir: "in" | "out";
  amount: number;
  kind: WcKind;
  name: string;
  invoiceId?: string;
  mat?: number;
  pkg?: number;
  stk?: number;
  other?: number;
  running?: number;
};

export type WcLeftover = {
  mat: number;
  pkg: number;
  stk: number;
  fg: number;
  total: number;
};

export type WcWeek = {
  idx: number;
  from: string;
  to: string;
  stillOut: number;
  collected: number;
  cogs: number;
  stock: number;
  opex: number;
  hawalek: number;
  isPeak: boolean;
};

export type WorkingCapital = {
  peak: number;
  spent: number;
  collected: number;
  collectedWalk: number;
  recycled: number;
  stillOut: number;
  today: number;
  surplus: number;
  peakDate: string;
  events: WcEvent[];
  weeks: WcWeek[];
  projectStart: string;
  asOf: string;
  collectionLag: number;
  stockPlacement: "journal" | "today";
  includeResidual: boolean;
  cogsAdj: number;
  hawalek: number;
  stock: number;
  stockParts: WcLeftover;
  residual: number;
  opex: number;
  invoiced: number;
  pending: number;
  pendingCount: number;
  paidCount: number;
  purchases: number;
  missingRecipes: { invoiceId: string; invoiceNumber: string; customer: string; name: string; qty: number }[];
};

function copyMoney(src?: Partial<WcMoney> | null): WcMoney {
  const mat = num(src?.mat);
  const pkg = num(src?.pkg);
  const stk = num(src?.stk);
  const other = num(src?.other);
  return {
    mat,
    pkg,
    stk,
    other,
    total: src?.total != null ? num(src.total) : mat + pkg + stk + other,
  };
}

function itemCogsBreakdown(
  it: InvoiceLine | { productId?: string | null; name?: string; qty?: number },
  recipes: Recipe[],
  findItem: (type: string, id: string) => StockItem | null,
): WcMoney & { missing: boolean } {
  const rec = findRecipeForItem(it, recipes);
  if (!rec) return { mat: 0, pkg: 0, stk: 0, other: 0, total: 0, missing: true };
  const batch = num(rec.batchSize);
  if (batch <= 0) return { mat: 0, pkg: 0, stk: 0, other: 0, total: 0, missing: false };
  const ratio = num(it.qty) / batch;
  let mat = 0;
  let pkg = 0;
  let stk = 0;
  let other = 0;
  (rec.ingredients || []).forEach((ing) => {
    const item = findItem(ing.itemType, ing.itemId);
    if (!item) return;
    const cost = num(ing.qty) * num(item.costPerUnit) * ratio;
    if (ing.itemType === "bb_materials") mat += cost;
    else if (ing.itemType === "bb_packages") pkg += cost;
    else if (ing.itemType === "bb_stickers") stk += cost;
    else other += cost;
  });
  return { mat, pkg, stk, other, total: mat + pkg + stk + other, missing: false };
}

function wcKindRank(kind: string) {
  return ({ "بضاعة فاتورة": 1, بضاعة: 2, فرق: 3, هوالك: 4, تشغيل: 5, تحصيل: 6 } as Record<string, number>)[kind] || 9;
}

export function leftoverFromStockReport(report: Pick<StockValueReport, "grandVal" | "byCat">): WcLeftover {
  const cat = (key: string) => num(report.byCat?.[key]?.val);
  return {
    mat: cat("مواد خام"),
    pkg: cat("تغليف"),
    stk: cat("ملصقات"),
    fg: cat("منتج جاهز"),
    total: num(report.grandVal),
  };
}

/** Live `invstrJournalStockChunks`: leftover stock weighted by purchases in the count window. */
export function journalStockChunks(stockVal: number, purchases: Purchase[]) {
  const byDate: Record<string, number> = {};
  (purchases || []).forEach((p) => {
    const d = invstrDay(p.date);
    const tot = num(p.totalCost);
    if (!d || d < JOURNAL_FROM || d > JOURNAL_TO || !(tot > 0)) return;
    byDate[d] = (byDate[d] || 0) + tot;
  });
  const dates = Object.keys(byDate).sort();
  const stock = round2(stockVal);
  if (!dates.length) return stock > 0.009 ? [{ date: JOURNAL_TO, amount: stock }] : [];
  const posSum = dates.reduce((s, d) => s + byDate[d], 0);
  const chunks: { date: string; amount: number }[] = [];
  let allocated = 0;
  dates.forEach((d, i) => {
    const amt = i === dates.length - 1 ? round2(stock - allocated) : round2(stock * (byDate[d] / posSum));
    allocated += amt;
    if (amt > 0.009) chunks.push({ date: d, amount: amt });
  });
  return chunks;
}

function weekIndex(date: string, start: string) {
  const a = Date.parse(`${start}T12:00:00`);
  const t = Date.parse(`${date}T12:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((t - a) / (7 * 86400000)));
}

function buildWcWeeks(wc: Omit<WorkingCapital, "weeks">): WcWeek[] {
  const start = wc.projectStart || wc.asOf;
  let end = wc.asOf || todayISO();
  if (end < start) end = start;
  const weeks: Record<number, WcWeek> = {};
  function bucket(raw: string) {
    let d = clampInvstrDay(raw, start);
    if (d > end) d = end;
    const idx = weekIndex(d, start);
    if (!weeks[idx]) {
      const from = invstrAddDays(start, idx * 7);
      let to = invstrAddDays(start, idx * 7 + 6);
      if (to > end) to = end;
      weeks[idx] = {
        idx,
        from,
        to,
        stillOut: 0,
        collected: 0,
        cogs: 0,
        stock: 0,
        opex: 0,
        hawalek: 0,
        isPeak: false,
      };
    }
    return weeks[idx];
  }
  bucket(start);
  if (wc.peakDate) bucket(wc.peakDate);
  const lastRun: Record<number, number> = {};
  (wc.events || []).forEach((e) => {
    if (String(e.date || "") > end) return;
    const b = bucket(e.date);
    const amt = num(e.amount);
    if (e.kind === "بضاعة فاتورة" && e.dir === "out") b.cogs += amt;
    else if (e.kind === "بضاعة" && e.dir === "out") b.stock += amt;
    else if (e.kind === "هوالك" && e.dir === "out") b.hawalek += amt;
    else if (e.kind === "تشغيل") b.opex += e.dir === "out" ? amt : -amt;
    else if (e.kind === "تحصيل" && e.dir === "in") b.collected += amt;
    lastRun[b.idx] = num(e.running);
  });
  const list = Object.keys(weeks)
    .map((k) => weeks[Number(k)])
    .sort((a, b) => a.idx - b.idx);
  let prevStill = 0;
  list.forEach((w) => {
    w.stillOut = lastRun[w.idx] != null ? round2(lastRun[w.idx]) : prevStill;
    prevStill = w.stillOut;
    w.isPeak = !!(wc.peakDate && w.from <= wc.peakDate && wc.peakDate <= w.to);
    w.cogs = round2(w.cogs);
    w.stock = round2(w.stock);
    w.collected = round2(w.collected);
    w.opex = round2(w.opex);
    w.hawalek = round2(w.hawalek);
  });
  return list;
}

export function buildWorkingCapital(opts: {
  invoices: Invoice[];
  returns: ReturnRecord[];
  recipes: Recipe[];
  purchases: Purchase[];
  opCosts: OpCost[];
  plan: InvestorTarget;
  ledger: CustomerLedger;
  payments: InvoicePayments;
  stockReport: Pick<StockValueReport, "grandVal" | "byCat">;
  findItem: (type: string, id: string) => StockItem | null;
  asOf?: string;
}): WorkingCapital {
  const plan = parseInvestorPlan(opts.plan);
  const start = resolveProjectStart(opts.invoices, plan);
  const asOf = invstrDay(opts.asOf) || todayISO();
  let lag = plan.collectionLag;
  if (!Number.isFinite(lag) || lag < 0) lag = 30;
  const placement = plan.stockPlacement === "today" ? "today" : "journal";
  const includeResidual = !!plan.includeResidual;
  const purchasesTotal = (opts.purchases || []).reduce((s, p) => s + num(p.totalCost), 0);
  const leftover = leftoverFromStockReport(opts.stockReport);
  const stockVal = leftover.total;

  const byInvoice: Record<string, { raw: WcMoney; adj: WcMoney }> = {};
  const missing: WorkingCapital["missingRecipes"] = [];
  (opts.invoices || []).forEach((inv) => {
    const raw = { mat: 0, pkg: 0, stk: 0, other: 0, total: 0 };
    (inv.items || []).forEach((it) => {
      const line = itemCogsBreakdown(it, opts.recipes, opts.findItem);
      if (line.missing) {
        const nm = String(it.name || "")
          .split("·")[0]
          .replace(/\s*-\s*pack\s*$/i, "")
          .trim()
          .toLowerCase();
        if (nm && nm !== "discount") {
          missing.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber || "",
            customer: inv.customerName || "",
            name: it.name,
            qty: num(it.qty),
          });
        }
      }
      raw.mat += line.mat;
      raw.pkg += line.pkg;
      raw.stk += line.stk;
      raw.other += line.other;
      raw.total += line.total;
    });
    byInvoice[inv.id] = { raw, adj: copyMoney(raw) };
  });

  const hawByDate: Record<string, WcMoney & { name: string }> = {};
  (opts.returns || []).forEach((ret) => {
    (ret.items || []).forEach((it) => {
      const line = itemCogsBreakdown(it, opts.recipes, opts.findItem);
      if (ret.invoiceId && byInvoice[ret.invoiceId]) {
        const adj = byInvoice[ret.invoiceId].adj;
        adj.mat = Math.max(0, adj.mat - line.mat);
        adj.pkg = Math.max(0, adj.pkg - line.pkg);
        adj.stk = Math.max(0, adj.stk - line.stk);
        adj.other = Math.max(0, adj.other - line.other);
        adj.total = adj.mat + adj.pkg + adj.stk + adj.other;
      }
      if (isExpiredDisp(it, ret) && line.total > 0.009) {
        const d = invstrDay(ret.date);
        if (!hawByDate[d]) {
          hawByDate[d] = {
            mat: 0,
            pkg: 0,
            stk: 0,
            other: 0,
            total: 0,
            name: `${ret.customerName || ""} هوالك`,
          };
        }
        hawByDate[d].mat += line.mat;
        hawByDate[d].pkg += line.pkg;
        hawByDate[d].stk += line.stk;
        hawByDate[d].other += line.other;
        hawByDate[d].total += line.total;
      }
    });
  });

  const cogs = { mat: 0, pkg: 0, stk: 0, other: 0, total: 0 };
  Object.keys(byInvoice).forEach((id) => {
    const a = byInvoice[id].adj;
    cogs.mat += a.mat;
    cogs.pkg += a.pkg;
    cogs.stk += a.stk;
    cogs.other += a.other;
    cogs.total += a.total;
  });
  const hawalekTot = { mat: 0, pkg: 0, stk: 0, other: 0, total: 0 };
  Object.keys(hawByDate).forEach((d) => {
    const h = hawByDate[d];
    hawalekTot.mat += h.mat;
    hawalekTot.pkg += h.pkg;
    hawalekTot.stk += h.stk;
    hawalekTot.other += h.other;
    hawalekTot.total += h.total;
  });

  const events: WcEvent[] = [];
  let invoiced = 0;
  let collectedAll = 0;
  let pending = 0;
  let pendingCount = 0;
  let paidCount = 0;
  (opts.invoices || []).forEach((inv) => {
    const row = opts.ledger.byInvoice[inv.id];
    const net = row ? num(row.net) : Math.max(0, num(inv.total));
    const rec = byInvoice[inv.id];
    const adj = rec ? rec.adj : { mat: 0, pkg: 0, stk: 0, other: 0, total: 0 };
    const cogsAmt = round2(adj.total);
    const d = clampInvstrDay(inv.date, start);
    if (cogsAmt > 0.009) {
      events.push({
        date: d,
        dir: "out",
        amount: cogsAmt,
        kind: "بضاعة فاتورة",
        name: `${inv.invoiceNumber || ""} ${inv.customerName || ""}`.trim(),
        invoiceId: inv.id,
        mat: adj.mat,
        pkg: adj.pkg,
        stk: adj.stk,
        other: adj.other,
      });
    }
    invoiced += net;
    const st = invoicePayStatus(opts.payments, inv.id);
    const collectAmt = row ? num(row.paid) : net;
    if (st === "paid") {
      paidCount += 1;
      if (collectAmt > 0.009) {
        let collectDate = invstrAddDays(invstrDay(inv.date) || d, lag);
        if (start && collectDate < start) collectDate = start;
        events.push({
          date: collectDate,
          dir: "in",
          amount: round2(collectAmt),
          kind: "تحصيل",
          name: `${inv.invoiceNumber || ""} ${inv.customerName || ""}`.trim(),
          invoiceId: inv.id,
        });
        collectedAll += collectAmt;
      }
    } else {
      pendingCount += 1;
      pending += row ? num(row.remaining) : net;
    }
  });

  Object.keys(hawByDate).forEach((d) => {
    const h = hawByDate[d];
    const amt = round2(h.total);
    if (amt <= 0.009) return;
    events.push({
      date: clampInvstrDay(d, start),
      dir: "out",
      amount: amt,
      kind: "هوالك",
      name: h.name || "هوالك",
      mat: h.mat,
      pkg: h.pkg,
      stk: h.stk,
      other: h.other,
    });
  });

  let opexNet = 0;
  (opts.opCosts || []).forEach((o) => {
    const amt = num(o.amount);
    if (Math.abs(amt) < 0.009) return;
    opexNet += amt;
    events.push({
      date: clampInvstrDay(o.date, start),
      dir: amt < 0 ? "in" : "out",
      amount: round2(Math.abs(amt)),
      kind: "تشغيل",
      name: amt < 0 ? `${o.name || "تشغيل"} / تعويض` : o.name || "تشغيل",
    });
  });

  let stockChunks: { date: string; amount: number }[] = [];
  if (stockVal > 0.009) {
    stockChunks = placement === "today" ? [{ date: asOf, amount: round2(stockVal) }] : journalStockChunks(stockVal, opts.purchases);
    stockChunks.forEach((ch) => {
      events.push({
        date: ch.date,
        dir: "out",
        amount: ch.amount,
        kind: "بضاعة",
        name: "مخزون متبقٍ (لم يُستهلك)",
      });
    });
  }

  const residual = round2(purchasesTotal - cogs.total - stockVal - hawalekTot.total);
  const lastJournal = stockChunks.length ? stockChunks[stockChunks.length - 1].date : JOURNAL_TO;
  if (includeResidual && Math.abs(residual) > 0.009) {
    events.push({
      date: placement === "today" ? asOf : lastJournal,
      dir: residual >= 0 ? "out" : "in",
      amount: round2(Math.abs(residual)),
      kind: "فرق",
      name: "فرق غير مربوط",
    });
  }

  events.sort((a, b) => {
    const d = String(a.date || "").localeCompare(String(b.date || ""));
    if (d) return d;
    const ra = wcKindRank(a.kind);
    const rb = wcKindRank(b.kind);
    if (ra !== rb) return ra - rb;
    if (a.dir !== b.dir) return a.dir === "out" ? -1 : 1;
    return 0;
  });

  let running = 0;
  let peak = 0;
  let peakDate = "";
  let spent = 0;
  let collectedWalk = 0;
  let todayRun = 0;
  events.forEach((e) => {
    const amt = num(e.amount);
    if (e.dir === "out") {
      running += amt;
      spent += amt;
    } else {
      running -= amt;
      collectedWalk += amt;
    }
    e.running = running;
    if (running > peak + 0.0001) {
      peak = running;
      peakDate = e.date;
    }
    if (String(e.date || "") <= asOf) todayRun = running;
  });

  const wc: Omit<WorkingCapital, "weeks"> = {
    peak: round2(Math.max(0, peak)),
    spent: round2(spent),
    collected: round2(collectedAll),
    collectedWalk: round2(collectedWalk),
    recycled: round2(Math.max(0, spent - peak)),
    stillOut: round2(Math.max(0, todayRun)),
    today: round2(todayRun),
    surplus: round2(Math.max(0, -todayRun)),
    peakDate,
    events,
    projectStart: start,
    asOf,
    collectionLag: lag,
    stockPlacement: placement,
    includeResidual,
    cogsAdj: cogs.total,
    hawalek: hawalekTot.total,
    stock: stockVal,
    stockParts: leftover,
    residual,
    opex: opexNet,
    invoiced,
    pending,
    pendingCount,
    paidCount,
    purchases: purchasesTotal,
    missingRecipes: missing,
  };
  return { ...wc, weeks: buildWcWeeks(wc) };
}
