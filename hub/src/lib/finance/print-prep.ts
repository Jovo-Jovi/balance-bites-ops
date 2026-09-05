import { calcTotals, esc, fmt, fmtQty, todayISO } from "@/lib/invoices/helpers";
import { openPrintWindow } from "@/lib/invoices/print";
import type { InvoiceLine } from "@/lib/invoices/types";
import { typeLabel } from "./helpers";
import { num, roundQty } from "./helpers";
import { prepCustomersLabel } from "./prep";
import { findRecipeForItem } from "./recipe-match";
import { calcPrepAggregate } from "./recipes";
import type { FinancePending, LedgerRow, PrepLine, Recipe, StockItem } from "./types";

export type PrepPrintMode = "both" | "total" | "each";

export const PREP_PRINT_MODES: { id: PrepPrintMode; label: string }[] = [
  { id: "both", label: "مجموع + كل منتج" },
  { id: "total", label: "مجموع المكونات فقط" },
  { id: "each", label: "كل منتج على حدة" },
];

export function parsePrepPrintMode(value: unknown): PrepPrintMode {
  if (value === "total" || value === "each" || value === "both") return value;
  return "both";
}

export function prepPrintModeLabel(mode: PrepPrintMode) {
  return PREP_PRINT_MODES.find((m) => m.id === mode)?.label || PREP_PRINT_MODES[0].label;
}

type PrepAggOpts = {
  prodMode?: "net" | "all";
  onHandByRecipe?: Record<string, number>;
  findItem: (type: string, id: string) => StockItem | null;
  ledger: Record<string, LedgerRow>;
};

type PrepAgg = ReturnType<typeof calcPrepAggregate>;

const BASE_CSS = `body{font-family:Tajawal,Arial,sans-serif;padding:18px;color:#111;}
h2{margin:0 0 8px;font-size:20px;}
h3{margin:16px 0 8px;font-size:15px;}
.muted{color:#555;font-size:13px;margin:0 0 16px;}
.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px;}
.kpi{border:1px solid #ccc;padding:8px 12px;min-width:110px;}
.kpi b{display:block;font-size:16px;}
.kpi span{font-size:12px;color:#555;}
table{border-collapse:collapse;width:100%;margin-bottom:18px;font-size:12px;}
th,td{border:1px solid #999;padding:5px 7px;text-align:right;}
th{background:#eee;}
.ok{color:#2e7d32;}
.bad{color:#b42318;}
.note{margin:0 0 14px;font-size:13px;}`;

function fmtPlain(n: unknown) {
  const v = roundQty(n);
  if (v === 0) return "0";
  if (Number.isInteger(v)) return String(v);
  return String(v);
}

function prepItemKey(it: InvoiceLine) {
  return it.productId ? String(it.productId) : `n:${it.name || ""}`;
}

function draftsWithItems(drafts: FinancePending[]) {
  return drafts.filter((p) => (p.items || []).some((it) => num(it.qty) > 0));
}

export function draftsToPrepLines(drafts: FinancePending[], recipes: Recipe[]) {
  const byRec: Record<string, number> = {};
  const missing: { customer: string; name: string; qty: number }[] = [];
  drafts.forEach((d) => {
    (d.items || []).forEach((it) => {
      if (num(it.qty) <= 0) return;
      const rec = findRecipeForItem(it, recipes);
      if (!rec) {
        missing.push({ customer: d.customerName || "", name: it.name || "?", qty: it.qty });
        return;
      }
      byRec[rec.id] = roundQty((byRec[rec.id] || 0) + roundQty(it.qty));
    });
  });
  return {
    prepLines: Object.keys(byRec).map((id) => ({ recipeId: id, units: byRec[id] })),
    missing,
  };
}

function orderedCompLines(lines: PrepAgg["lines"]) {
  return lines.slice().sort((a, b) => {
    const rank = (t: string) => (t === "bb_stickers" ? 0 : t === "bb_packages" ? 1 : 2);
    const d = rank(a.type) - rank(b.type);
    return d !== 0 ? d : String(a.name || "").localeCompare(String(b.name || ""), "ar");
  });
}

function kpis(items: { val: string; lbl: string }[]) {
  return `<div class="kpis">${items
    .map((k) => `<div class="kpi"><b>${k.val}</b><span>${esc(k.lbl)}</span></div>`)
    .join("")}</div>`;
}

function tbl(heads: string[], rows: string[][], foot?: string[]) {
  const head = `<thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}${
    foot ? `<tr>${foot.map((c) => `<td>${c}</td>`).join("")}</tr>` : ""
  }</tbody>`;
  return `<table>${head}${body}</table>`;
}

function section(title: string, inner: string) {
  return `<h3>${esc(title)}</h3>${inner}`;
}

function buildPrepBoardHtml(agg: PrepAgg, mode: PrepPrintMode, prepLines: PrepLine[]) {
  const modeLbl = agg.prodMode === "net" ? "بعد خصم الجاهز" : "الكمية كاملة";
  const whoByRec: Record<string, string> = {};
  prepLines.forEach((l) => {
    const who = prepCustomersLabel(l);
    if (who) whoByRec[l.recipeId] = who;
  });
  const prodRows = agg.productRows.map((row) => {
    const p = row.prep;
    const who = whoByRec[row.recipeId];
    return [
      esc(row.rec.name) + (who ? `<div class="muted" style="margin:0">${esc(who)}</div>` : ""),
      `${row.units} مطلوب`,
      `${row.onHand} جاهز`,
      `${row.unitsToProduce} للإنتاج`,
      row.unitsToProduce > 0 ? `${fmtQty(p.batches)}×` : "—",
      row.coveredByStock ? "مغطى" : p.stockOk ? "✓" : "⚠",
    ];
  });
  let body =
    kpis([
      { val: String(agg.totalUnits), lbl: "مطلوب" },
      { val: String(agg.totalToProduce), lbl: "للإنتاج" },
      { val: `${fmt(agg.totalCost)} EGP`, lbl: "تكلفة المكونات" },
      { val: agg.stockOk ? "كافٍ" : "نقص", lbl: "المخزون" },
    ]) +
    section(
      `المنتجات · ${modeLbl}`,
      tbl(["المنتج", "مطلوب", "جاهز", "للإنتاج", "دفعات", "المكونات"], prodRows),
    );

  if (mode === "total" || mode === "both") {
    const miss = agg.lines.filter((l) => !l.ok);
    if (miss.length) {
      body += section(
        "⚠ الناقص — ما ينقص",
        `<div class="note">${miss
          .map(
            (l) =>
              `• ${esc(typeLabel(l.type))} <b>${esc(l.name)}</b> — ينقص ${fmtQty(l.shortfall)} ${esc(l.unit || "")} (مطلوب ${fmtQty(l.needed)} / متوفر ${fmtQty(l.stock)})`,
          )
          .join("<br>")}</div>`,
      );
    }
    const ingRows = agg.lines.map((l) => [
      esc(l.name),
      esc(typeLabel(l.type)),
      l.sources && l.sources.length > 1 ? "متعدد" : `${fmtQty(l.perUnit)} ${esc(l.unit)}`,
      `${fmtQty(l.needed)} ${esc(l.unit)}`,
      `${fmtQty(l.stock)} ${esc(l.unit)}`,
      l.ok
        ? '<span class="ok">✓ متوفر</span>'
        : `<span class="bad">⚠ ينقص «${esc(l.name)}»: ${fmtQty(l.shortfall)}${l.unit ? ` ${esc(l.unit)}` : ""}</span>`,
      `${fmt(l.cost)} EGP`,
    ]);
    body += section(
      "مجموع المكونات (الكل)",
      tbl(
        ["المكون", "النوع", "لكل منتج", "المطلوب", "المخزون", "الحالة", "التكلفة"],
        ingRows,
        ["", "", "", "", "", "الإجمالي", `${fmt(agg.totalCost)} EGP`],
      ),
    );
  }

  if (mode === "each" || mode === "both") {
    agg.productRows.forEach((row) => {
      const p = row.prep;
      const title = `${row.rec.name} · ${row.units} منتج · ${p.batchSize} /دفعة${p.productWeight ? ` · ${p.productWeight}` : ""}`;
      const rows = p.lines.map((l) => [
        esc(l.name),
        esc(typeLabel(l.type)),
        `${fmtQty(l.perUnit)} ${esc(l.unit)}`,
        `${fmtQty(l.needed)} ${esc(l.unit)}`,
        `${fmtQty(l.stock)} ${esc(l.unit)}`,
        l.ok
          ? '<span class="ok">✓ متوفر</span>'
          : `<span class="bad">⚠ ينقص «${esc(l.name)}»: ${fmtQty(l.shortfall)}${l.unit ? ` ${esc(l.unit)}` : ""}</span>`,
        `${fmt(l.cost)} EGP`,
      ]);
      body += section(
        `مكونات · ${title}`,
        tbl(
          ["المكون", "النوع", "لكل وحدة", "المطلوب", "المخزون", "الحالة", "التكلفة"],
          rows,
          ["", "", "", "", "", "المجموع", `${fmt(p.totalCost)} EGP`],
        ),
      );
    });
  }

  const sub = `${prepPrintModeLabel(mode)} · حساب المكونات حسب الوصفة والدفعة`;
  return { title: "قائمة التحضير · BOM", sub, body };
}

export function printPrepBoard(opts: {
  prepLines: PrepLine[];
  recipes: Recipe[];
  mode: PrepPrintMode;
  aggOpts: PrepAggOpts;
}) {
  if (!opts.prepLines.length) return false;
  const agg = calcPrepAggregate(opts.prepLines, opts.recipes, opts.aggOpts);
  const built = buildPrepBoardHtml(agg, opts.mode, opts.prepLines);
  const css = `${BASE_CSS}@media print{@page{size:A4 portrait;margin:12mm;}}`;
  return openPrintWindow(
    built.title,
    css,
    `<h2>${esc(built.title)}</h2><p class="muted">${esc(built.sub)}</p>${built.body}`,
  );
}

function componentsInnerHtml(drafts: FinancePending[], recipes: Recipe[], aggOpts: PrepAggOpts) {
  const conv = draftsToPrepLines(drafts, recipes);
  const agg = calcPrepAggregate(conv.prepLines, recipes, { ...aggOpts, prodMode: "all" });
  const lines = orderedCompLines(agg.lines);
  const miss = conv.missing;
  const missHtml = miss.length
    ? `<p>بدون وصفة: ${miss
        .map(
          (x) =>
            `${esc(x.name)} × ${fmtPlain(x.qty)}${x.customer ? ` (${esc(x.customer)})` : ""}`,
        )
        .join(" · ")}</p>`
    : "";
  if (!lines.length && !miss.length) {
    return "<h3>مجموع المكونات لكل الفواتير</h3><p>لا مكونات — اربط المنتجات بوصفات</p>";
  }
  const rows = lines.map((l) => [
    esc(l.name || ""),
    esc(typeLabel(l.type)),
    fmtQty(l.needed),
    esc(l.unit || ""),
    fmtQty(l.stock),
    l.ok ? "كافٍ" : `ينقص ${fmtQty(l.shortfall)}`,
  ]);
  return (
    "<h3>مجموع المكونات لكل الفواتير (مواد · تغليف · ملصقات)</h3>" +
    missHtml +
    (lines.length
      ? tbl(["المكون", "النوع", "المطلوب", "وحدة", "المخزون", "الحالة"], rows)
      : "")
  );
}

function sheetInnerHtml(drafts: FinancePending[], recipes: Recipe[], aggOpts: PrepAggOpts) {
  const active = draftsWithItems(drafts);
  const products: { key: string; name: string; weight: string }[] = [];
  const seen = new Set<string>();
  active.forEach((d) => {
    (d.items || []).forEach((it) => {
      if (num(it.qty) <= 0) return;
      const key = prepItemKey(it);
      if (seen.has(key)) return;
      seen.add(key);
      products.push({ key, name: it.name || "—", weight: it.weight || "" });
    });
  });
  const matrix: Record<string, Record<string, number>> = {};
  active.forEach((d) => {
    const cid = d.customerId || d.id;
    matrix[cid] = {};
    (d.items || []).forEach((it) => {
      const key = prepItemKey(it);
      matrix[cid][key] = (matrix[cid][key] || 0) + num(it.qty);
    });
  });
  const headCust =
    active.map((d) => `<th>${esc(d.customerName || "")}</th>`).join("") + "<th>المجموع</th>";
  const prodRows = products
    .map((pr) => {
      let sum = 0;
      const cells = active
        .map((d) => {
          const q = matrix[d.customerId || d.id]?.[pr.key] || 0;
          sum += q;
          return `<td>${q ? fmtPlain(q) : ""}</td>`;
        })
        .join("");
      return `<tr><td>${esc(pr.name)}${pr.weight ? ` · ${esc(pr.weight)}` : ""}</td>${cells}<td><strong>${fmtPlain(sum)}</strong></td></tr>`;
    })
    .join("");
  const custTotals = active.map((d) => {
    const cid = d.customerId || d.id;
    return products.reduce((s, pr) => s + (matrix[cid]?.[pr.key] || 0), 0);
  });
  const grandQty = custTotals.reduce((a, b) => a + b, 0);
  const totRow = `<tr><td><strong>مجموع الكمية</strong></td>${custTotals
    .map((s) => `<td><strong>${fmtPlain(s)}</strong></td>`)
    .join("")}<td><strong>${fmtPlain(grandQty)}</strong></td></tr>`;
  const moneyCells = active
    .map((d) => {
      const t = calcTotals(d.items || [], num(d.discount));
      return `<td>${fmt(t.total)}</td>`;
    })
    .join("");
  const grandMoney = active.reduce((s, d) => s + calcTotals(d.items || [], num(d.discount)).total, 0);
  const moneyRow = `<tr><td><strong>الإجمالي EGP</strong></td>${moneyCells}<td><strong>${fmt(grandMoney)}</strong></td></tr>`;

  const detailRows: string[] = [];
  active.forEach((d) => {
    const t = calcTotals(d.items || [], num(d.discount));
    (d.items || []).forEach((it) => {
      if (num(it.qty) <= 0) return;
      const line = num(it.qty) * num(it.price);
      detailRows.push(
        `<tr><td>${esc(d.customerName || "")}</td><td>${esc(d.customerPhone || "")}</td><td>${esc(it.name || "")}</td><td>${esc(it.weight || "")}</td><td>${fmtPlain(it.qty)}</td><td>${fmt(it.price)}</td><td>${fmt(line)}</td><td>${fmt(t.total)}</td></tr>`,
      );
    });
  });

  return (
    `<h2>شيت تحضير الفواتير · Balance Bites</h2>` +
    `<p class="muted">التاريخ: ${esc(todayISO())} · ${active.length} عميل · ${products.length} صنف</p>` +
    `<h3>مجموع الكميات · صنف × عميل</h3>` +
    `<table><thead><tr><th>الصنف</th>${headCust}</tr></thead><tbody>${prodRows}${totRow}${moneyRow}</tbody></table>` +
    `<h3>تفصيل الأصناف</h3>` +
    `<table><thead><tr><th>العميل</th><th>تليفون</th><th>الصنف</th><th>وزن</th><th>كمية</th><th>سعر</th><th>سطر</th><th>إجمالي الفاتورة</th></tr></thead><tbody>${detailRows.join("")}</tbody></table>` +
    componentsInnerHtml(drafts, recipes, aggOpts)
  );
}

export function printPrepInvoiceSheet(
  drafts: FinancePending[],
  recipes: Recipe[],
  aggOpts: PrepAggOpts,
) {
  if (!drafts.length) return false;
  const css = `${BASE_CSS}@media print{@page{size:A4 landscape;margin:10mm;}}`;
  return openPrintWindow("شيت تحضير الفواتير", css, sheetInnerHtml(drafts, recipes, aggOpts));
}

export function printPrepInvoiceComponents(
  drafts: FinancePending[],
  recipes: Recipe[],
  aggOpts: PrepAggOpts,
) {
  if (!drafts.length) return false;
  const css = `${BASE_CSS}@media print{@page{size:A4 portrait;margin:12mm;}}`;
  const inner = `<h2>مجموع المكونات · تحضير الفواتير</h2><p class="muted">${esc(todayISO())} · Balance Bites</p>${componentsInnerHtml(drafts, recipes, aggOpts)}`;
  return openPrintWindow("مكونات التحضير", css, inner);
}

export function downloadPrepInvoiceSheet(
  drafts: FinancePending[],
  recipes: Recipe[],
  aggOpts: PrepAggOpts,
) {
  if (typeof document === "undefined" || !drafts.length) return false;
  const inner = sheetInnerHtml(drafts, recipes, aggOpts);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><title>تحضير فواتير</title></head><body dir="rtl">${inner}</body></html>`;
  const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `تحضير-فواتير-${todayISO()}.xls`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 400);
  return true;
}
