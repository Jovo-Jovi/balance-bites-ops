import { visiblePendingQueue } from "@/lib/invoices/pending";
import type { Invoice, Product, ReturnRecord } from "@/lib/invoices/types";
import {
  adjSupplier,
  itemKey,
  num,
  roundQty,
} from "@/lib/finance/helpers";
import {
  calcIngredientUsageFromInvoices,
  calcIngredientUsageFromProduction,
} from "@/lib/finance/ledger";
import { stockStatus } from "@/lib/finance/analytics";
import {
  getInvoiceDrafts,
  getPrepOrders,
} from "@/lib/finance/prep";
import type {
  FinancePending,
  InvItemType,
  ProductionRun,
  Purchase,
  Recipe,
  StockItem,
} from "@/lib/finance/types";
import { findRecipeForItem } from "@/lib/finance/recipe-match";
import { invCustKey } from "@/lib/finance/customer-ledger";
import { formatDmY, inInclusiveRange } from "./week";
import type {
  ChurchRow,
  ChurchStatusDoc,
  DeliveryExecRow,
  InventoryRow,
  LineNote,
  PackingRow,
  Rag,
  SourcingRow,
} from "./types";

export type OpsInputs = {
  invoices: Invoice[];
  returns: ReturnRecord[];
  materials: StockItem[];
  packages: StockItem[];
  stickers: StockItem[];
  recipes: Recipe[];
  products: Product[];
  purchases: Purchase[];
  production: ProductionRun[];
  pending: FinancePending[];
};

function qty(n: unknown) {
  return roundQty(num(n));
}

function beforeDay(iso: string | undefined, day: string) {
  const d = String(iso || "").slice(0, 10);
  return d !== "" && d < day;
}

function stockLabel(rag: Rag): string {
  if (rag === "red") return "🔴 Critical";
  if (rag === "yellow") return "🟡 Low";
  return "🟢 OK";
}

function ragFromStock(kind: "ok" | "low" | "crit"): Rag {
  if (kind === "crit") return "red";
  if (kind === "low") return "yellow";
  return "green";
}

function note(map: Record<string, LineNote> | undefined, id: string): LineNote {
  return map?.[id] || {};
}

function allItems(inputs: OpsInputs): { type: InvItemType; item: StockItem }[] {
  return [
    ...inputs.materials.map((item) => ({ type: "bb_materials" as const, item })),
    ...inputs.packages.map((item) => ({ type: "bb_packages" as const, item })),
    ...inputs.stickers.map((item) => ({ type: "bb_stickers" as const, item })),
  ];
}

function usageFor(
  invoices: Invoice[],
  production: ProductionRun[],
  recipes: Recipe[],
  returns: OpsInputs["returns"],
  allInvoices: Invoice[],
) {
  if (allInvoices.length > 0) {
    return calcIngredientUsageFromInvoices(invoices, recipes, returns);
  }
  return calcIngredientUsageFromProduction(recipes, production);
}

export function weekPurchases(purchases: Purchase[], start: string, end: string) {
  return purchases.filter(
    (p) => inInclusiveRange(p.date, start, end) && !adjSupplier(p.supplier || ""),
  );
}

export function sourcedUnits(purchases: Purchase[], start: string, end: string) {
  return roundQty(
    weekPurchases(purchases, start, end).reduce((s, p) => s + qty(p.qty), 0),
  );
}

export function buildInventoryRows(
  inputs: OpsInputs,
  doc: ChurchStatusDoc,
  start: string,
  end: string,
): InventoryRow[] {
  const purchasesBefore = inputs.purchases.filter((p) => beforeDay(p.date, start));
  const purchasesWeek = inputs.purchases.filter((p) => inInclusiveRange(p.date, start, end));
  const invoicesBefore = inputs.invoices.filter((inv) => beforeDay(inv.date, start));
  const invoicesWeek = inputs.invoices.filter((inv) =>
    inInclusiveRange(inv.date, start, end),
  );
  const productionBefore = inputs.production.filter((r) => beforeDay(r.date, start));
  const productionWeek = inputs.production.filter((r) =>
    inInclusiveRange(r.date, start, end),
  );
  const returnsBefore = inputs.returns.filter((r) => beforeDay(r.date, start));
  const returnsWeek = inputs.returns.filter((r) =>
    inInclusiveRange(r.date || "", start, end),
  );

  const usedBefore = usageFor(
    invoicesBefore,
    productionBefore,
    inputs.recipes,
    returnsBefore,
    inputs.invoices,
  );
  const usedWeek = usageFor(
    invoicesWeek,
    productionWeek,
    inputs.recipes,
    returnsWeek,
    inputs.invoices,
  );

  const rows: InventoryRow[] = [];
  allItems(inputs).forEach(({ type, item }) => {
    const k = itemKey(type, item.id);
    const received = roundQty(
      purchasesWeek
        .filter((p) => p.itemType === type && p.itemId === item.id)
        .reduce((s, p) => s + qty(p.qty), 0),
    );
    const purchasedBefore = roundQty(
      purchasesBefore
        .filter((p) => p.itemType === type && p.itemId === item.id)
        .reduce((s, p) => s + qty(p.qty), 0),
    );
    const distributed = roundQty(usedWeek[k] || 0);
    const opening = roundQty(purchasedBefore - roundQty(usedBefore[k] || 0));
    const closing = roundQty(opening + received - distributed);
    const reorder = qty(item.minStock);
    const kind = stockStatus(item, closing, false);
    const rag = ragFromStock(kind);
    const over = note(doc.inventory, k);
    const include =
      doc.showAll ||
      Math.abs(received) > 0.0001 ||
      Math.abs(distributed) > 0.0001 ||
      rag !== "green" ||
      Boolean(over.notes);
    if (!include) return;
    rows.push({
      id: k,
      name: item.name || item.id,
      opening,
      received,
      distributed,
      closing,
      reorder,
      rag,
      statusLabel: stockLabel(rag),
      notes: (over.notes || "").trim() || (item.notes || "").trim() || "—",
    });
  });
  rows.sort((a, b) => {
    const rank = { red: 0, yellow: 1, green: 2 };
    return rank[a.rag] - rank[b.rag] || a.name.localeCompare(b.name, "ar");
  });
  return rows;
}

export function closingInventoryTotal(rows: InventoryRow[]) {
  return roundQty(rows.reduce((s, r) => s + r.closing, 0));
}

export function buildSourcingRows(
  inputs: OpsInputs,
  doc: ChurchStatusDoc,
  start: string,
  end: string,
): SourcingRow[] {
  const list = weekPurchases(inputs.purchases, start, end);
  return list.map((p) => {
    const over = note(doc.sourcing, p.id);
    const payment = (over.payment || "").trim() || "Paid";
    const pendingPay = payment.toLowerCase() === "pending";
    const received = qty(p.qty);
    const ordered = received;
    const rag: Rag = pendingPay ? "yellow" : "green";
    return {
      id: p.id,
      partner: p.supplier || "—",
      item: p.itemName || p.itemId,
      orderPlaced: formatDmY(String(p.date || "").slice(0, 10)),
      expectedDelivery: (over.scheduled || "").trim() || formatDmY(String(p.date || "").slice(0, 10)),
      qtyOrdered: ordered,
      qtyReceived: received,
      payment,
      rag,
      statusLabel: rag === "yellow" ? "🟡 At Risk" : "🟢 On Track",
    };
  });
}

export function buildPackingRows(
  inputs: OpsInputs,
  doc: ChurchStatusDoc,
  start: string,
  end: string,
): PackingRow[] {
  const by = new Map<
    string,
    { product: string; toPack: number; packed: number; notes: string }
  >();

  function bump(id: string, product: string, patch: { toPack?: number; packed?: number; notes?: string }) {
    const cur = by.get(id) || { product, toPack: 0, packed: 0, notes: "" };
    cur.toPack = roundQty(cur.toPack + (patch.toPack || 0));
    cur.packed = roundQty(cur.packed + (patch.packed || 0));
    if (patch.notes && !cur.notes) cur.notes = patch.notes;
    by.set(id, cur);
  }

  const weekInv = inputs.invoices.filter((inv) => inInclusiveRange(inv.date, start, end));
  weekInv.forEach((inv) => {
    (inv.items || []).forEach((it) => {
      const rec = findRecipeForItem(it, inputs.recipes);
      const id = rec?.id || it.productId || it.name || "line";
      const product = rec
        ? inputs.products.find((p) => p.id === rec.productId)?.name || rec.name
        : it.name || "—";
      bump(id, product, { toPack: qty(it.qty), packed: qty(it.qty) });
    });
  });

  inputs.production
    .filter((r) => inInclusiveRange(r.date, start, end))
    .forEach((run) => {
      bump(run.recipeId || run.id, run.recipeName || run.id, {
        packed: qty(run.unitsProduced),
        toPack: qty(run.unitsProduced),
        notes: run.notes || "",
      });
    });

  const queue = [...getPrepOrders(inputs.pending), ...getInvoiceDrafts(inputs.pending)];
  queue.forEach((p) => {
    const lines = p.prepLines?.length
      ? p.prepLines
      : (p.items || []).map((it) => {
          const rec = findRecipeForItem(it, inputs.recipes);
          return { recipeId: rec?.id || it.productId || it.name || "", units: qty(it.qty) };
        });
    lines.forEach((line) => {
      if (!line.recipeId) return;
      const rec = inputs.recipes.find((r) => r.id === line.recipeId);
      const product = rec
        ? inputs.products.find((x) => x.id === rec.productId)?.name || rec.name
        : line.recipeId;
      bump(line.recipeId, product, { toPack: qty(line.units) });
    });
  });

  const rows: PackingRow[] = [];
  by.forEach((cur, id) => {
    const over = note(doc.packing, id);
    const toPack = cur.toPack;
    const packed = cur.packed;
    const labeled = packed;
    const ready = packed;
    let rag: Rag = "green";
    let statusLabel = "🟢 On Track";
    if (toPack > 0.0001 && packed + 0.0001 < toPack) {
      rag = packed > 0.0001 ? "yellow" : "red";
      statusLabel = packed > 0.0001 ? "🟡 In Progress" : "🔴 Critical";
    }
    const include = doc.showAll || toPack > 0.0001 || packed > 0.0001 || Boolean(over.notes);
    if (!include) return;
    rows.push({
      id,
      product: cur.product,
      toPack,
      packed,
      labeled,
      ready,
      rag,
      statusLabel,
      owner: (over.owner || "").trim() || "[Owner]",
      notes: (over.notes || "").trim() || cur.notes || "—",
    });
  });
  rows.sort((a, b) => {
    const rank = { red: 0, yellow: 1, green: 2 };
    return rank[a.rag] - rank[b.rag] || a.product.localeCompare(b.product, "ar");
  });
  return rows;
}

export function buildDeliveryRows(
  churches: ChurchRow[],
  pending: FinancePending[],
  doc: ChurchStatusDoc,
  start: string,
  end: string,
): DeliveryExecRow[] {
  const open = visiblePendingQueue(pending);
  return churches
    .filter((c) => c.servedThisWeek || c.delivery === "Pending" || c.rag === "red")
    .map((c) => {
      const over = note(doc.delivery, c.id);
      const pend = open.find((p) => {
        const key = invCustKey({ customerId: p.customerId, customerName: p.customerName });
        return key === c.id;
      });
      const scheduled =
        (over.scheduled || "").trim() ||
        formatDmY(String(pend?.date || "").slice(0, 10)) ||
        (c.servedThisWeek ? `${formatDmY(start)} – ${formatDmY(end)}` : "—");
      const actual =
        (over.actual || "").trim() || (c.servedThisWeek ? scheduled : "—");
      const delivered = c.delivery === "Delivered" || c.servedThisWeek;
      const rag: Rag = delivered ? "green" : c.rag === "red" ? "red" : "yellow";
      return {
        id: c.id,
        church: c.name,
        scheduled: scheduled || "—",
        actual: actual || "—",
        units: c.servedThisWeek ? c.units : 0,
        method: (over.method || "").trim() || "—",
        rag,
        statusLabel: delivered ? "🟢 Delivered" : rag === "red" ? "🔴 Pending" : "🟡 Pending",
        delay: (over.delay || "").trim() || (delivered ? "—" : c.issue),
        nextAction: (over.nextAction || "").trim() || c.nextAction,
      };
    });
}

export function onTimeRate(rows: DeliveryExecRow[]) {
  if (!rows.length) return 100;
  const ok = rows.filter((r) => r.statusLabel.includes("Delivered")).length;
  return Math.round((1000 * ok) / rows.length) / 10;
}
