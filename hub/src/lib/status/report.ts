import { visiblePendingQueue } from "@/lib/invoices/pending";
import { enrichInvoice } from "@/lib/invoices/returns";
import type {
  Customer,
  Invoice,
  InvoicePayments,
  Product,
  ReturnRecord,
} from "@/lib/invoices/types";
import { buildCustomerLedger, invCustKey } from "@/lib/finance/customer-ledger";
import type {
  CustomerPayment,
  FinancePending,
  ProductionRun,
  Purchase,
  Recipe,
  StockItem,
} from "@/lib/finance/types";
import { genId } from "@/lib/invoices/helpers";
import {
  addDaysIso,
  defaultReportingWeek,
  inInclusiveRange,
  weekLabel,
} from "./week";
import {
  RAG_LABEL,
  STATUS_FOCUS,
  type ChurchReport,
  type ChurchRow,
  type ChurchStatusDoc,
  type DeliveryLabel,
  type KpiRow,
  type PaymentLabel,
  type Rag,
  type RiskRow,
} from "./types";
import {
  buildDeliveryRows,
  buildInventoryRows,
  buildPackingRows,
  buildSourcingRows,
  closingInventoryTotal,
  onTimeRate,
  sourcedUnits,
} from "./ops";

const ACTIVE_LOOKBACK_DAYS = 56;

export type StatusInputs = {
  invoices: Invoice[];
  customers: Customer[];
  returns: ReturnRecord[];
  payments: InvoicePayments;
  customerPayments: CustomerPayment[];
  pending: FinancePending[];
  preparedByFallback: string;
  materials: StockItem[];
  packages: StockItem[];
  stickers: StockItem[];
  recipes: Recipe[];
  products: Product[];
  purchases: Purchase[];
  production: ProductionRun[];
};

function num(n: unknown) {
  const v = parseFloat(String(n));
  return Number.isNaN(v) ? 0 : v;
}

function fmtQty(n: number) {
  if (!n) return "0";
  return n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

function fmtMoney(n: number) {
  return n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(n: number) {
  return `${n.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`;
}

function trend(current: number, previous: number): KpiRow["trend"] {
  if (current > previous + 0.009) return "↑";
  if (current < previous - 0.009) return "↓";
  return "→";
}

function netUnits(inv: Invoice, returns: ReturnRecord[]) {
  const e = enrichInvoice(returns, inv);
  if (e.salesStatus === "full") return 0;
  const qty = (inv.items || []).reduce((s, it) => s + num(it.qty), 0);
  return Math.max(0, qty - (e.returnInfo?.totalQty || 0));
}

function netSales(inv: Invoice, returns: ReturnRecord[]) {
  return enrichInvoice(returns, inv).net;
}

function churchId(inv: { customerId?: string | null; customerName?: string }, customer?: Customer | null) {
  return invCustKey(inv) || customer?.id || "";
}

function deliveryFromPending(
  pending: FinancePending[],
  id: string,
  servedThisWeek: boolean,
): DeliveryLabel {
  const open = visiblePendingQueue(pending).some((p) => {
    const key = invCustKey({ customerId: p.customerId, customerName: p.customerName });
    return key === id;
  });
  if (open) return "Pending";
  if (servedThisWeek) return "Delivered";
  return "—";
}

function defaultIssue(row: {
  rag: Rag;
  payment: PaymentLabel;
  servedThisWeek: boolean;
  outstanding: number;
}) {
  if (row.rag === "red" && !row.servedThisWeek) return "Order not confirmed";
  if (row.payment === "Pending") return "Payment pending";
  if (row.outstanding > 0.009) return "Outstanding balance";
  return "—";
}

function defaultAction(rag: Rag) {
  if (rag === "red") return "Immediate follow-up";
  if (rag === "yellow") return "Follow up on collection";
  return "Maintain weekly distribution";
}

function churchRag(row: {
  servedThisWeek: boolean;
  servedPrevWeek: boolean;
  payment: PaymentLabel;
  delivery: DeliveryLabel;
  outstanding: number;
}): Rag {
  if (!row.servedThisWeek && (row.servedPrevWeek || row.outstanding > 0.009)) {
    return "red";
  }
  if (row.delivery === "Pending") return "yellow";
  if (row.payment === "Pending" || row.outstanding > 0.009) return "yellow";
  if (row.servedThisWeek) return "green";
  return "green";
}

function kpiStatus(current: number, previous: number, warnIfPositive = false): Rag {
  if (warnIfPositive) return current > 0.009 ? "yellow" : "green";
  if (current + 0.009 < previous) return "yellow";
  return "green";
}

function autoRisks(
  churches: ChurchRow[],
  inventory: ReturnType<typeof buildInventoryRows>,
  packing: ReturnType<typeof buildPackingRows>,
  outstanding: number,
): RiskRow[] {
  const rows: RiskRow[] = [];
  if (outstanding > 0.009) {
    rows.push({
      id: genId("risk"),
      priority: "High",
      area: "Collections",
      risk: "Payment pending",
      impact: "Cash flow",
      action: "Follow up & confirm payment date",
      owner: "",
      due: "",
      status: "🟡 Open",
    });
  }
  churches
    .filter((c) => c.rag === "red" && !c.servedThisWeek)
    .forEach((c) => {
      rows.push({
        id: genId("risk"),
        priority: "High",
        area: c.name,
        risk: c.issue || "Order not confirmed",
        impact: "Next-week distribution",
        action: "Confirm requirement and delivery date",
        owner: "",
        due: "",
        status: "🔴 Open",
      });
    });
  inventory
    .filter((r) => r.rag !== "green")
    .slice(0, 4)
    .forEach((r) => {
      rows.push({
        id: genId("risk"),
        priority: r.rag === "red" ? "High" : "Medium",
        area: "Inventory",
        risk: `${r.name} ${r.statusLabel}`,
        impact: "Stock-out risk",
        action: "Reorder or confirm supply",
        owner: "",
        due: "",
        status: r.rag === "red" ? "🔴 Open" : "🟡 Open",
      });
    });
  packing
    .filter((r) => r.rag !== "green")
    .slice(0, 3)
    .forEach((r) => {
      rows.push({
        id: genId("risk"),
        priority: r.rag === "red" ? "High" : "Medium",
        area: "Packing & Labeling",
        risk: `${r.product} ${r.statusLabel}`,
        impact: "Dispatch delay",
        action: "Close packing / labeling gap",
        owner: r.owner === "[Owner]" ? "" : r.owner,
        due: "",
        status: r.rag === "red" ? "🔴 Open" : "🟡 Open",
      });
    });
  return rows;
}

function autoAchievements(churches: ChurchRow[], units: number, sales: number) {
  const served = churches.filter((c) => c.servedThisWeek).length;
  if (!served) return "• No distribution recorded this week";
  return [
    `• Distributed ${fmtQty(units)} units across ${served} church${served === 1 ? "" : "es"}`,
    `• Weekly sales value ${fmtMoney(sales)} EGP`,
  ].join("\n");
}

function autoChallenges(
  churches: ChurchRow[],
  inventory: ReturnType<typeof buildInventoryRows>,
  outstanding: number,
) {
  const lines: string[] = [];
  const pendingPay = churches.filter((c) => c.payment === "Pending").length;
  const missed = churches.filter((c) => c.rag === "red").length;
  const low = inventory.filter((r) => r.rag !== "green").length;
  if (outstanding > 0.009) {
    lines.push(`• Outstanding payments ${fmtMoney(outstanding)} EGP`);
  }
  if (pendingPay) lines.push(`• ${pendingPay} church payment${pendingPay === 1 ? "" : "s"} pending`);
  if (missed) lines.push(`• ${missed} church${missed === 1 ? "" : "es"} need immediate follow-up`);
  if (low) lines.push(`• ${low} stock item${low === 1 ? "" : "s"} below target`);
  if (!lines.length) return "• No material challenge this week";
  return lines.join("\n");
}

function autoPriorities(
  churches: ChurchRow[],
  inventory: ReturnType<typeof buildInventoryRows>,
  packing: ReturnType<typeof buildPackingRows>,
  outstanding: number,
) {
  const lines: string[] = [];
  if (churches.some((c) => !c.servedThisWeek)) {
    lines.push("• Confirm church quantities");
  }
  if (outstanding > 0.009) lines.push("• Close outstanding payments");
  if (
    inventory.some((r) => r.rag !== "green") ||
    packing.some((r) => r.rag !== "green") ||
    churches.some((c) => c.delivery === "Pending")
  ) {
    lines.push("• Resolve sourcing / packing / delivery issues");
  }
  if (churches.some((c) => c.rag !== "green")) {
    lines.push("• Follow up on priority churches");
  }
  if (!lines.length) lines.push("• Maintain weekly distribution");
  return lines.join("\n");
}

export function resolveWeek(doc: ChurchStatusDoc) {
  const fallback = defaultReportingWeek();
  const start = doc.weekStart || fallback.start;
  const end = doc.weekEnd || fallback.end;
  return { start, end };
}

export function buildChurchReport(inputs: StatusInputs, doc: ChurchStatusDoc): ChurchReport {
  const { start, end } = resolveWeek(doc);
  const prevEnd = addDaysIso(start, -1);
  const prevStart = addDaysIso(prevEnd, -6);
  const activeFrom = addDaysIso(end, -ACTIVE_LOOKBACK_DAYS);

  const ledger = buildCustomerLedger(
    inputs.invoices,
    inputs.returns,
    inputs.payments,
    inputs.customerPayments,
  );

  const thisWeekInv = inputs.invoices.filter((inv) =>
    inInclusiveRange(inv.date, start, end),
  );
  const prevWeekInv = inputs.invoices.filter((inv) =>
    inInclusiveRange(inv.date, prevStart, prevEnd),
  );
  const activeInv = inputs.invoices.filter((inv) =>
    inInclusiveRange(inv.date, activeFrom, end),
  );

  const book = new Map<string, { name: string }>();
  inputs.customers.forEach((c) => {
    if (c?.id) book.set(c.id, { name: c.name || c.id });
  });
  inputs.invoices.forEach((inv) => {
    const id = churchId(inv);
    if (!id || id === "_none") return;
    if (!book.has(id)) book.set(id, { name: inv.customerName || id });
  });

  function weekStats(list: Invoice[]) {
    const sold = list.filter((inv) => enrichInvoice(inputs.returns, inv).salesStatus !== "full");
    const churches = new Set(
      sold.map((inv) => churchId(inv)).filter((id) => id && id !== "_none"),
    );
    const units = sold.reduce((s, inv) => s + netUnits(inv, inputs.returns), 0);
    const sales = sold.reduce((s, inv) => s + netSales(inv, inputs.returns), 0);
    return { churches, units, sales, count: churches.size };
  }

  const cur = weekStats(thisWeekInv);
  const prev = weekStats(prevWeekInv);
  const activeIds = new Set(
    activeInv
      .filter((inv) => enrichInvoice(inputs.returns, inv).salesStatus !== "full")
      .map((inv) => churchId(inv))
      .filter((id) => id && id !== "_none"),
  );
  if (!activeIds.size) {
    book.forEach((_, id) => activeIds.add(id));
  }

  const outstandingTotal = ledger.totals.remaining;
  const prevActiveCount = new Set(
    inputs.invoices
      .filter((inv) =>
        inInclusiveRange(inv.date, addDaysIso(prevEnd, -ACTIVE_LOOKBACK_DAYS), prevEnd),
      )
      .map((inv) => churchId(inv))
      .filter((id) => id && id !== "_none"),
  ).size;

  const rows: ChurchRow[] = [];
  book.forEach((meta, id) => {
    const weekList = thisWeekInv.filter((inv) => churchId(inv) === id);
    const prevList = prevWeekInv.filter((inv) => churchId(inv) === id);
    const servedThisWeek = weekStats(weekList).count > 0;
    const servedPrevWeek = weekStats(prevList).count > 0;
    const units = weekList.reduce((s, inv) => s + netUnits(inv, inputs.returns), 0);
    const sales = weekList.reduce((s, inv) => s + netSales(inv, inputs.returns), 0);
    const card = ledger.byCustomer[id];
    const outstanding = card?.remaining ?? 0;
    const weekRemaining = weekList.reduce((s, inv) => {
      const row = ledger.byInvoice[inv.id];
      return s + (row ? row.remaining : 0);
    }, 0);
    const payment: PaymentLabel = !servedThisWeek
      ? "—"
      : weekRemaining > 0.009
        ? "Pending"
        : "Paid";
    const delivery = deliveryFromPending(inputs.pending, id, servedThisWeek);
    const computed = churchRag({
      servedThisWeek,
      servedPrevWeek,
      payment,
      delivery,
      outstanding,
    });
    const over = doc.churches[id] || {};
    const rag = over.rag && (over.rag === "green" || over.rag === "yellow" || over.rag === "red")
      ? over.rag
      : computed;
    const deliv = (["Delivered", "Pending", "—"] as DeliveryLabel[]).includes(
      over.delivery as DeliveryLabel,
    )
      ? (over.delivery as DeliveryLabel)
      : delivery;
    const issue = (over.issue || "").trim() || defaultIssue({ rag, payment, servedThisWeek, outstanding });
    const nextAction = (over.nextAction || "").trim() || defaultAction(rag);

    const include =
      doc.showAll ||
      servedThisWeek ||
      servedPrevWeek ||
      outstanding > 0.009 ||
      deliv === "Pending" ||
      Boolean(over.issue || over.nextAction || over.rag);
    if (!include) return;

    rows.push({
      id,
      name: meta.name,
      units,
      sales,
      payment,
      delivery: deliv,
      rag,
      issue,
      nextAction,
      outstanding,
      servedThisWeek,
      servedPrevWeek,
    });
  });

  rows.sort((a, b) => {
    const rank = { red: 0, yellow: 1, green: 2 };
    return rank[a.rag] - rank[b.rag] || b.sales - a.sales || a.name.localeCompare(b.name, "ar");
  });

  const ops = {
    invoices: inputs.invoices,
    returns: inputs.returns,
    materials: inputs.materials,
    packages: inputs.packages,
    stickers: inputs.stickers,
    recipes: inputs.recipes,
    products: inputs.products,
    purchases: inputs.purchases,
    production: inputs.production,
    pending: inputs.pending,
  };
  const inventory = buildInventoryRows(ops, doc, start, end);
  const sourcing = buildSourcingRows(ops, doc, start, end);
  const packing = buildPackingRows(ops, doc, start, end);
  const deliveries = buildDeliveryRows(rows, inputs.pending, doc, start, end);

  const allInv = { ...doc, showAll: true };
  const sourced = sourcedUnits(inputs.purchases, start, end);
  const sourcedPrev = sourcedUnits(inputs.purchases, prevStart, prevEnd);
  const closingNow = closingInventoryTotal(buildInventoryRows(ops, allInv, start, end));
  const closingPrev = closingInventoryTotal(buildInventoryRows(ops, allInv, prevStart, prevEnd));
  const onTime = onTimeRate(deliveries);
  const onTimePrev = onTimeRate(
    buildDeliveryRows(
      rows.map((c) => ({
        ...c,
        servedThisWeek: c.servedPrevWeek,
        delivery: c.servedPrevWeek ? "Delivered" : c.delivery,
      })),
      inputs.pending,
      doc,
      prevStart,
      prevEnd,
    ),
  );

  const overallAuto: Rag =
    rows.some((c) => c.rag === "red") ||
    inventory.some((r) => r.rag === "red") ||
    packing.some((r) => r.rag === "red")
      ? "red"
      : rows.some((c) => c.rag === "yellow") ||
          inventory.some((r) => r.rag === "yellow") ||
          packing.some((r) => r.rag === "yellow") ||
          outstandingTotal > 0.009
        ? "yellow"
        : "green";
  const overall = doc.overallStatus || overallAuto;

  const kpis: KpiRow[] = [
    {
      name: "Active Churches",
      current: String(activeIds.size),
      previous: String(prevActiveCount),
      trend: trend(activeIds.size, prevActiveCount),
      status: kpiStatus(activeIds.size, prevActiveCount),
    },
    {
      name: "Churches Served",
      current: String(cur.count),
      previous: String(prev.count),
      trend: trend(cur.count, prev.count),
      status: kpiStatus(cur.count, prev.count),
    },
    {
      name: "Total Units Sourced / Procured",
      current: fmtQty(sourced),
      previous: fmtQty(sourcedPrev),
      trend: trend(sourced, sourcedPrev),
      status: kpiStatus(sourced, sourcedPrev),
    },
    {
      name: "Total Units Distributed",
      current: fmtQty(cur.units),
      previous: fmtQty(prev.units),
      trend: trend(cur.units, prev.units),
      status: kpiStatus(cur.units, prev.units),
    },
    {
      name: "Closing Inventory On Hand",
      current: fmtQty(closingNow),
      previous: fmtQty(closingPrev),
      trend: trend(closingNow, closingPrev),
      status: kpiStatus(closingNow, closingPrev),
    },
    {
      name: "Weekly Sales Value (EGP)",
      current: fmtMoney(cur.sales),
      previous: fmtMoney(prev.sales),
      trend: trend(cur.sales, prev.sales),
      status: kpiStatus(cur.sales, prev.sales),
    },
    {
      name: "Outstanding Payments (EGP)",
      current: fmtMoney(outstandingTotal),
      previous: "—",
      trend: "→",
      status: kpiStatus(outstandingTotal, 0, true),
    },
    {
      name: "On-Time Delivery Rate (%)",
      current: fmtPct(onTime),
      previous: fmtPct(onTimePrev),
      trend: trend(onTime, onTimePrev),
      status: onTime < 99.9 ? "yellow" : "green",
    },
  ];

  const risks = doc.risks.some((r) => r.risk.trim() || r.action.trim())
    ? doc.risks
    : autoRisks(rows, inventory, packing, outstandingTotal);

  const preparedBy = doc.preparedBy.trim() || inputs.preparedByFallback || "";
  const focus = doc.managementFocus.trim() || STATUS_FOCUS;

  return {
    weekStart: start,
    weekEnd: end,
    weekLabel: weekLabel(start, end),
    preparedBy,
    overall,
    overallLabel: RAG_LABEL[overall],
    focus,
    kpis,
    churches: rows,
    inventory,
    sourcing,
    packing,
    deliveries,
    risks,
    achievements: doc.achievements.trim() || autoAchievements(rows, cur.units, cur.sales),
    challenges: doc.challenges.trim() || autoChallenges(rows, inventory, outstandingTotal),
    nextPriorities:
      doc.nextPriorities.trim() || autoPriorities(rows, inventory, packing, outstandingTotal),
  };
}

export function churchStatusCell(rag: Rag) {
  if (rag === "green") return RAG_LABEL.green;
  if (rag === "yellow") return RAG_LABEL.yellow;
  return RAG_LABEL.red;
}
