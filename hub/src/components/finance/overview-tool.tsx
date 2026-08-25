"use client";

import { useMemo, useState } from "react";
import { fmt, fmtQty, monthIntersectsWindow, todayISO } from "@/lib/finance/helpers";
import { buildPeriodProfit } from "@/lib/finance/analytics";
import { periodRangeLabel, printPeriodProfit } from "@/lib/finance/print-period";
import { unmatchedInvoiceLines } from "@/lib/finance/recipe-match";
import { recipeSellPrice, calcCOGS } from "@/lib/finance/recipes";
import { investorShareOf } from "@/lib/finance/reports";
import { buildInvestorSnapshot } from "@/lib/finance/investors";
import type { Recipe } from "@/lib/finance/types";
import { ActionBtn, Empty, Field, Modal, Select, TextArea, TextInput } from "@/components/invoices/ui";
import { useFinanceApp } from "./finance-context";
import {
  ColumnChart,
  FinanceTable,
  MixBar,
  SectionChips,
  StatCard,
  UnmatchedLinesHint,
  plTone,
  plWord,
  tdClass,
  thClass,
} from "./section-chips";

const SECTIONS = [
  { id: "dash", label: "اللوحة" },
  { id: "cogs", label: "COGS" },
  { id: "profit", label: "الأرباح" },
  { id: "investors", label: "المستثمرون" },
] as const;

export function OverviewTool() {
  const app = useFinanceApp();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("dash");
  const L = app.linked;
  const spent = L.spent;

  return (
    <div className="flex flex-col gap-4">
      <SectionChips items={[...SECTIONS]} value={section} onChange={setSection} />
      {section === "dash" ? <Dash /> : null}
      {section === "cogs" ? <Cogs /> : null}
      {section === "profit" ? <Profit /> : null}
      {section === "investors" ? <Investors /> : null}
      <p className="text-xs text-[var(--bb-muted)]">
        المصروف {fmt(spent)} EGP · الربح لا يشمل المخزون المتبقي (أصل). المعلق يُحصَّل في الإغلاق دائماً.
      </p>
    </div>
  );
}

function Dash() {
  const app = useFinanceApp();
  const L = app.linked;
  const unmatched = useMemo(
    () => unmatchedInvoiceLines(app.invoices, app.recipes),
    [app.invoices, app.recipes],
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="تكلفة المشروع"
          value={`${fmt(L.spent)} EGP`}
          hint={`مشتريات ${fmt(L.purchases)} · تشغيل ${fmt(L.opex)}`}
          formula="المصروف = مشتريات + تشغيل"
          brief={[
            { label: "مشتريات", value: `${fmt(L.purchases)} EGP` },
            { label: "تشغيل", value: `${fmt(L.opex)} EGP` },
            { label: "المجموع", value: `${fmt(L.spent)} EGP` },
          ]}
        />
        <StatCard
          label="إجمالي المبيعات"
          value={`${fmt(L.gross)} EGP`}
          hint={`مدفوع ${fmt(L.paid)} · معلق ${fmt(L.pending)}`}
          formula="المبيعات = مجموع الفواتير بعد المرتجع · مدفوع / معلق من حالة التحصيل"
          brief={[
            { label: "مدفوع", value: `${fmt(L.paid)} EGP` },
            { label: "معلق", value: `${fmt(L.pending)} EGP` },
            { label: "الإجمالي", value: `${fmt(L.gross)} EGP` },
          ]}
        />
        <StatCard
          label="قيمة المخزون"
          value={`${fmt(L.stock)} EGP`}
          hint={`نشط ${fmt(L.stockActive)} · غير نشط ${fmt(L.stockInactive)}`}
          formula="المخزون أصل بسعر التكلفة = مواد + تغليف + ملصقات + جاهز"
          brief={[
            { label: "مواد", value: `${fmt(L.stockMat)} EGP` },
            { label: "تغليف", value: `${fmt(L.stockPkg)} EGP` },
            { label: "ملصقات", value: `${fmt(L.stockStk)} EGP` },
            { label: "جاهز", value: `${fmt(L.stockFg)} EGP` },
          ]}
        />
      </div>
      <ColumnChart
        label="مقارنة الأرقام"
        items={[
          { key: "spent", label: "مصروف", value: L.spent, fill: "var(--bb-muted)" },
          { key: "sales", label: "مبيعات", value: L.gross, fill: "var(--bb-gold)" },
          { key: "stock", label: "مخزون", value: L.stock, fill: "var(--bb-title)" },
          {
            key: "net",
            label: "صافي",
            value: L.netProfit,
            fill: L.netProfit >= -0.009 ? "var(--bb-ok)" : "var(--bb-bad)",
          },
        ]}
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <MixBar
          label="المصروف"
          segments={[
            { key: "purchases", label: "مشتريات", value: L.purchases, fill: "var(--bb-gold)" },
            { key: "opex", label: "تشغيل", value: L.opex, fill: "var(--bb-muted)" },
          ]}
        />
        <MixBar
          label="المبيعات"
          segments={[
            { key: "paid", label: "مدفوع", value: L.paid, fill: "var(--bb-ok)" },
            { key: "pending", label: "معلق", value: L.pending, fill: "var(--bb-warn)" },
          ]}
        />
        <MixBar
          label="المخزون"
          segments={[
            { key: "mat", label: "مواد", value: L.stockMat, fill: "var(--bb-title)" },
            { key: "pkg", label: "تغليف", value: L.stockPkg, fill: "color-mix(in srgb, var(--bb-gold) 70%, var(--bb-title))" },
            { key: "stk", label: "ملصقات", value: L.stockStk, fill: "var(--bb-gold)" },
            { key: "fg", label: "جاهز", value: L.stockFg, fill: "color-mix(in srgb, var(--bb-ok) 55%, var(--bb-gold))" },
          ]}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ShutdownCol
          title="① المخزون يتحول إلى نقد"
          hint="تحصّل المعلق + تبيع/تسترد المخزون بسعر التكلفة"
          formula="السيولة = مدفوع + معلق + مخزون بالتكلفة · النتيجة = السيولة − المصروف"
          liquid={L.shutdownLiquid}
          pl={L.shutdownPL}
        />
        <ShutdownCol
          title="② المخزون خسارة"
          hint="تحصّل المعلق فقط · المخزون المتبقي يُعدم ولا يُحوَّل"
          formula="السيولة = مدفوع + معلق فقط · النتيجة = السيولة − المصروف. المعلق يُحصَّل في الحالتين"
          liquid={L.shutdownLiquidLoss}
          pl={L.shutdownPLLoss}
        />
      </div>
      <p className="text-sm text-[var(--bb-muted)]">
        ① السيولة = مدفوع + معلق + مخزون · النتيجة = السيولة − المصروف. ② السيولة = مدفوع + معلق فقط.
        المعلق يُحصَّل في الحالتين. المخزون بسعر التكلفة وليس سعر التجزئة.
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <StatCard label="مواد" value={`${fmt(L.stockMat)} EGP`} formula="قيمة المواد الخام بالتكلفة" />
        <StatCard label="تغليف" value={`${fmt(L.stockPkg)} EGP`} formula="قيمة التغليف بالتكلفة" />
        <StatCard label="ملصقات" value={`${fmt(L.stockStk)} EGP`} formula="قيمة الملصقات بالتكلفة" />
        <StatCard label="جاهز" value={`${fmt(L.stockFg)} EGP`} formula="منتج جاهز بالتكلفة (COGS للوحدة × الكمية)" />
      </div>
      <UnmatchedLinesHint lines={unmatched} />
    </>
  );
}

function ShutdownCol({
  title,
  hint,
  formula,
  liquid,
  pl,
}: {
  title: string;
  hint: string;
  formula: string;
  liquid: number;
  pl: number;
}) {
  return (
    <div
      title={formula}
      className={`bb-pressable rounded-[var(--bb-radius)] border p-4 ${
        pl >= -0.009
          ? "border-[var(--bb-ok)]/40 bg-[color-mix(in_srgb,var(--bb-ok)_10%,var(--bb-panel))]"
          : "border-[var(--bb-bad)]/40 bg-[color-mix(in_srgb,var(--bb-bad)_10%,var(--bb-panel))]"
      }`}
    >
      <p className="text-sm text-[var(--bb-title)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--bb-muted)]">{hint}</p>
      <p className="mt-3 text-2xl text-[var(--bb-title)]" dir="ltr">
        {fmt(liquid)} EGP
      </p>
      <p className={`mt-2 text-sm ${pl >= -0.009 ? "text-[var(--bb-ok)]" : "text-[var(--bb-bad)]"}`}>
        {plWord(pl)} {pl >= 0 ? "+" : ""}
        {fmt(pl)} EGP
      </p>
    </div>
  );
}

function Cogs() {
  const app = useFinanceApp();
  const unmatched = useMemo(
    () => unmatchedInvoiceLines(app.invoices, app.recipes),
    [app.invoices, app.recipes],
  );
  if (!app.recipes.length) {
    return (
      <>
        <UnmatchedLinesHint lines={unmatched} />
        <Empty>لا وصفات — أضف وصفة لرؤية تكلفة الوحدة</Empty>
      </>
    );
  }
  return (
    <>
      <UnmatchedLinesHint lines={unmatched} />
      <p className="text-xs text-[var(--bb-muted)]">
        اضغط البطاقة لرؤية مكوّنات الدفعة. التحويم يعرض المعادلة: مجموع (كمية × تكلفة) ÷ حجم الدفعة.
      </p>
      <ul className="grid gap-3 lg:grid-cols-2">
        {app.recipes.map((r) => (
          <CogsCard key={r.id} recipe={r} />
        ))}
      </ul>
    </>
  );
}

function CogsCard({ recipe: r }: { recipe: Recipe }) {
  const app = useFinanceApp();
  const [open, setOpen] = useState(false);
  const detail = calcCOGS(r, app.findItem);
  const sell = recipeSellPrice(r, app.products);
  const cogs = detail.total;
  const margin = sell - cogs;
  const pct = sell > 0.009 ? (cogs / sell) * 100 : 0;
  const fillPct = sell > 0.009 ? Math.min(100, Math.max(0, pct)) : 0;
  const formula = `COGS للوحدة = تكلفة الدفعة ${fmt(detail.totalBatch)} ÷ ${r.batchSize} = ${fmt(cogs)} · البيع ${fmt(sell)}`;
  return (
    <li>
      <button
        type="button"
        title={formula}
        onClick={() => setOpen((v) => !v)}
        className="bb-glass bb-pressable w-full p-4 text-start"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-[var(--bb-title)]">{r.name}</span>
          <span className={`text-sm ${plTone(margin) === "ok" ? "text-[var(--bb-ok)]" : "text-[var(--bb-bad)]"}`} dir="ltr">
            هامش {fmt(margin)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <p>
            <span className="block text-[10px] tracking-[0.12em] text-[var(--bb-muted)]">تكلفة الوحدة</span>
            <span className="text-2xl text-[var(--bb-title)]" dir="ltr">
              {fmt(cogs)}
            </span>
          </p>
          <p>
            <span className="block text-[10px] tracking-[0.12em] text-[var(--bb-muted)]">سعر البيع</span>
            <span className="text-2xl text-[var(--bb-title)]" dir="ltr">
              {fmt(sell)}
            </span>
          </p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--bb-gold)_12%,transparent)]">
          <div className="h-full bg-[var(--bb-warn)]" style={{ width: `${fillPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--bb-muted)]">
          COGS {fmt(pct)}% من سعر البيع · دفعة {r.batchSize} · {detail.lines.length} مكوّن
        </p>
        {open ? (
          <ul className="mt-3 space-y-2 border-t border-[var(--bb-line)]/50 pt-3 text-sm">
            {detail.lines.length === 0 ? (
              <li className="text-[var(--bb-muted)]">لا مكوّنات على هذه الوصفة</li>
            ) : (
              detail.lines.map((line) => (
                <li key={`${line.name}-${line.qty}`} className="flex justify-between gap-2">
                  <span>
                    {line.name}
                    <span className="ms-2 text-xs text-[var(--bb-muted)]">
                      {fmtQty(line.qty)} {line.unit}
                    </span>
                  </span>
                  <span dir="ltr">{fmt(line.lineCost)}</span>
                </li>
              ))
            )}
            <li className="flex justify-between gap-2 text-[var(--bb-muted)]">
              <span>تكلفة الدفعة</span>
              <span dir="ltr">{fmt(detail.totalBatch)}</span>
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-[10px] text-[var(--bb-gold)]">اضغط لتفصيل المكوّنات</p>
        )}
      </button>
    </li>
  );
}

function Profit() {
  const app = useFinanceApp();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const period = useMemo(
    () =>
      buildPeriodProfit({
        from,
        to,
        invoices: app.invoices,
        returns: app.returns,
        opCosts: app.opCosts,
        purchases: app.purchases,
        recipes: app.recipes,
        payments: app.payments,
        customerPayments: app.customerPayments,
        findItem: app.findItem,
      }),
    [
      from,
      to,
      app.invoices,
      app.returns,
      app.opCosts,
      app.purchases,
      app.recipes,
      app.payments,
      app.customerPayments,
      app.findItem,
    ],
  );
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const months = Object.keys(app.monthly)
    .filter((m) => monthIntersectsWindow(m, from, to))
    .sort()
    .reverse();
  const maxRev = Math.max(1, ...months.map((m) => app.monthly[m].revenue));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="من">
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="إلى">
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
          <ActionBtn
            tone="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            كل الفترة
          </ActionBtn>
          <ActionBtn
            onClick={() => {
              if (!printPeriodProfit(period)) {
                window.alert("اسمح بالنوافذ المنبثقة للطباعة");
              }
            }}
          >
            طباعة الفترة
          </ActionBtn>
          <span className="text-xs text-[var(--bb-muted)]">{periodRangeLabel(from, to)}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="مبيعات"
          value={`${fmt(period.sales)} EGP`}
          formula="مجموع الفواتير في الفترة (بتاريخ الفاتورة) بعد مرتجعات الفترة"
          brief={[
            { label: "فواتير", value: String(period.invoiceCount) },
            { label: "مبيعات", value: `${fmt(period.sales)} EGP` },
            { label: "مدفوع", value: `${fmt(period.paid)} EGP` },
            { label: "معلق", value: `${fmt(period.pending)} EGP` },
          ]}
        />
        <StatCard
          label="مدفوع / معلق"
          value={`${fmt(period.paid)} / ${fmt(period.pending)}`}
          formula="حالة التحصيل الحالية للفواتير داخل الفترة"
          brief={[
            { label: "مدفوع", value: `${fmt(period.paid)} EGP` },
            { label: "معلق", value: `${fmt(period.pending)} EGP` },
            { label: "المجموع", value: `${fmt(period.paid + period.pending)} EGP` },
          ]}
        />
        <StatCard
          label="تكلفة المباع"
          value={`${fmt(period.cogs)} EGP`}
          formula="COGS الوصفة × كمية المباع في فواتير الفترة"
          brief={[{ label: "تكلفة المباع", value: `${fmt(period.cogs)} EGP` }]}
        />
        <StatCard
          label="تشغيل + حوالك"
          value={`${fmt(period.opex + period.hawalek)} EGP`}
          formula="تشغيل وحوالك بتاريخها داخل الفترة"
          brief={[
            { label: "تشغيل", value: `${fmt(period.opex)} EGP` },
            { label: "حوالك", value: `${fmt(period.hawalek)} EGP` },
            { label: "المجموع", value: `${fmt(period.opex + period.hawalek)} EGP` },
          ]}
        />
        <StatCard
          label="صافي الربح"
          value={`${fmt(period.net)} EGP`}
          tone={plTone(period.net)}
          hint="مبيعات − COGS المباع − تشغيل − حوالك. المخزون أصل."
          formula="صافي = مبيعات − تكلفة المباع − تشغيل − حوالك. المخزون المتبقي لا يُطرح"
          brief={[
            { label: "مبيعات", value: `${fmt(period.sales)} EGP` },
            { label: "− تكلفة المباع", value: `${fmt(period.cogs)} EGP` },
            { label: "− تشغيل", value: `${fmt(period.opex)} EGP` },
            { label: "− حوالك", value: `${fmt(period.hawalek)} EGP` },
            { label: "صافي", value: `${fmt(period.net)} EGP` },
          ]}
        />
        <StatCard
          label="مشتريات الفترة"
          value={`${fmt(period.purchases)} EGP`}
          formula="مشتريات بتاريخها — أصل مخزون وليست في سطر الربح"
          brief={[{ label: "مشتريات", value: `${fmt(period.purchases)} EGP` }]}
        />
      </div>
      <ColumnChart
        label="أرقام الفترة"
        items={[
          { key: "sales", label: "مبيعات", value: period.sales, fill: "var(--bb-gold)" },
          { key: "cogs", label: "COGS", value: period.cogs, fill: "var(--bb-warn)" },
          { key: "opex", label: "تشغيل", value: period.opex + period.hawalek, fill: "var(--bb-muted)" },
          {
            key: "net",
            label: "صافي",
            value: period.net,
            fill: period.net >= -0.009 ? "var(--bb-ok)" : "var(--bb-bad)",
          },
        ]}
      />
      {months.length === 0 ? (
        <Empty>لا أشهر في هذه الفترة</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {months.map((m) => {
            const row = app.monthly[m];
            const net = row.revenue - row.cogs - row.opcost - row.hawalekCogs;
            const paidPct = maxRev > 0 ? (row.paid / maxRev) * 100 : 0;
            const pendPct = maxRev > 0 ? (row.pending / maxRev) * 100 : 0;
            const hover = `مدفوع ${fmt(row.paid)} · معلق ${fmt(row.pending)} · صافي ${fmt(net)}`;
            return (
              <li key={m}>
                <button
                  type="button"
                  className="bb-glass bb-pressable w-full p-3 text-start text-sm"
                  title={hover}
                  onClick={() => setOpenMonth((cur) => (cur === m ? null : m))}
                >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{m}</span>
                  <span
                    className={plTone(net) === "ok" ? "text-[var(--bb-ok)]" : "text-[var(--bb-bad)]"}
                    dir="ltr"
                  >
                    {net >= 0 ? "+" : ""}
                    {fmt(net)} EGP
                  </span>
                </div>
                <div className="relative mt-2 h-4 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--bb-gold)_12%,transparent)]">
                  <div
                    className="absolute inset-y-0 start-0 rounded-full bg-[var(--bb-ok)]/85"
                    style={{ width: `${paidPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 bg-[var(--bb-warn)]/70"
                    style={{ insetInlineStart: `${paidPct}%`, width: `${pendPct}%` }}
                  />
                </div>
                {openMonth === m ? (
                  <dl className="mt-3 space-y-1 border-t border-[var(--bb-line)]/50 pt-3 text-xs text-[var(--bb-muted)]">
                    <div className="flex justify-between gap-2">
                      <dt>مدفوع</dt>
                      <dd dir="ltr">{fmt(row.paid)} EGP</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>معلق</dt>
                      <dd dir="ltr">{fmt(row.pending)} EGP</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>مبيعات</dt>
                      <dd dir="ltr">{fmt(row.revenue)} EGP</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>COGS</dt>
                      <dd dir="ltr">{fmt(row.cogs)} EGP</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>تشغيل</dt>
                      <dd dir="ltr">{fmt(row.opcost)} EGP</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>حوالك</dt>
                      <dd dir="ltr">{fmt(row.hawalekCogs)} EGP</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>صافي</dt>
                      <dd dir="ltr">{fmt(net)} EGP</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-1 text-xs text-[var(--bb-gold)]">اضغط لتفصيل الأرقام</p>
                )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Investors() {
  const app = useFinanceApp();
  const [edit, setEdit] = useState<(typeof app.investors)[number] | "new" | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [joinDate, setJoinDate] = useState(todayISO());
  const L = app.linked;
  const snap = useMemo(
    () =>
      buildInvestorSnapshot({
        investors: app.investors,
        plan: app.investorTarget,
        invoices: app.invoices,
        returns: app.returns,
        recipes: app.recipes,
        opCosts: app.opCosts,
        ledger: app.customerLedger,
        linked: L,
        findItem: app.findItem,
      }),
    [
      app.investors,
      app.investorTarget,
      app.invoices,
      app.returns,
      app.recipes,
      app.opCosts,
      app.customerLedger,
      L,
      app.findItem,
    ],
  );
  const earliest = snap.rows.reduce((m, r) => (r.joinDay && r.joinDay < m ? r.joinDay : m), "9999-99-99");
  const visibleNow = L.stock + L.pending + L.cashIfAny;

  function start(rec?: (typeof app.investors)[number]) {
    setEdit(rec || "new");
    setName(rec?.name || "");
    setAmount(rec ? String(rec.amount) : "");
    setPhone(rec?.phone || "");
    setNotes(rec?.notes || "");
    setJoinDate(rec?.date || todayISO());
  }

  return (
    <>
      <p className="text-xs text-[var(--bb-muted)]">
        الذروة ≈ المصروف − المبيعات (رأس المال الذي لم يُعَد من البيع). حصة قيمة المشروع = NAV × (الحصة نحو
        الفعلي / الذروة). الربح يُوزَّع من تاريخ دخول كل مستثمر فقط — الربح السابق للمستثمرين الأقدم.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="رأس المال الأصلي (ذروة)" value={`${fmt(snap.peak)} EGP`} />
        <StatCard label="مسجّل للمستثمرين" value={`${fmt(L.invested)} EGP`} />
        <StatCard
          label="المطلوب للوضع الحالي"
          value={`${fmt(snap.cap.gap)} EGP`}
          tone={snap.cap.gap > 0.009 ? "warn" : "ok"}
        />
        <StatCard
          label="فائض نقدي"
          value={`${fmt(snap.cap.overflow)} EGP`}
          tone={snap.cap.overflow > 0.009 ? "warn" : undefined}
        />
        <StatCard label="أُعيد من المبيعات" value={`${fmt(snap.recycled)} EGP`} />
        <StatCard label="السيولة التقديرية" value={`${fmt(L.cash)} EGP`} tone={L.cash >= -0.009 ? "ok" : "warn"} />
        <StatCard label="قيمة المشروع NAV" value={`${fmt(L.nav)} EGP`} hint="نقد + مخزون + معلق" />
        <StatCard
          label="عائد على رأس المال"
          value={snap.roi == null ? "—" : `${snap.roi >= 0 ? "+" : ""}${snap.roi.toFixed(1)}%`}
          tone={plTone(L.netProfit)}
        />
      </div>
      <p className="text-xs text-[var(--bb-muted)]">
        النقد = مسجّل {fmt(L.invested)} + محصّل {fmt(L.paid)} − مصروف {fmt(L.spent)} = {fmt(L.cash)}. ما تراه الآن =
        مخزون {fmt(L.stock)} + معلق {fmt(L.pending)} + نقد إن وُجد {fmt(L.cashIfAny)} = {fmt(visibleNow)}.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="زيادة رأس مال إضافية (اختياري)">
          <TextInput
            type="number"
            value={String(app.investorTarget.needed || "")}
            onChange={(e) => app.saveInvestorTarget({ needed: parseFloat(e.target.value) || 0 })}
          />
        </Field>
        <Field label="توزيع الفعلي">
          <Select
            value={app.investorTarget.split || "equal"}
            onChange={(e) =>
              app.saveInvestorTarget({ split: e.target.value === "share" ? "share" : "equal" })
            }
          >
            <option value="share">حسب الحصة الحالية</option>
            <option value="equal">بالتساوي</option>
          </Select>
        </Field>
        <Field label="بداية المشروع">
          <TextInput
            type="date"
            value={app.investorTarget.projectStart || snap.start || ""}
            onChange={(e) => app.saveInvestorTarget({ projectStart: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionBtn onClick={() => start()}>مستثمر جديد</ActionBtn>
        <ActionBtn
          tone="ghost"
          onClick={() => {
            if (snap.peak <= 0.009) {
              window.alert("لا يوجد رأس مال فعلي محسوب بعد");
              return;
            }
            if (!app.investors.length) {
              window.alert("أضف المستثمرين أولاً ثم وزّع رأس المال الفعلي");
              return;
            }
            const mode = app.investorTarget.split === "equal" ? "بالتساوي" : "حسب الحصة الحالية";
            if (app.investors.length === 1) {
              if (
                !window.confirm(
                  "يوجد مستثمر واحد فقط. التعيين سيجعل حصته 100% من رأس المال الفعلي.\nإذا كان هناك شركاء آخرون، أضفهم أولاً ثم وزّع.\nالمتابعة على أي حال؟",
                )
              ) {
                return;
              }
            }
            if (
              !window.confirm(
                `تعيين مبالغ المستثمرين حسب رأس المال الفعلي ${fmt(snap.peak)} EGP (${mode})؟\nالمصروف الإجمالي يُعاد تدويره من المبيعات ولا يُقسَم كما هو.`,
              )
            ) {
              return;
            }
            app.assignInvestorAmounts(
              investorShareOf(app.investors, snap.peak, app.investorTarget.split || "share"),
            );
          }}
        >
          تعيين كرأس مال المستثمرين
        </ActionBtn>
      </div>
      {app.investors.length === 0 ? (
        <Empty>لا مستثمرين بعد — أضف الشركاء ثم اضغط «تعيين كرأس مال المستثمرين» لتوزيع رأس المال الفعلي</Empty>
      ) : (
        <FinanceTable minWidth="64rem">
          <thead>
            <tr>
              <th className={thClass}>المستثمر</th>
              <th className={thClass}>تاريخ الدخول</th>
              <th className={thClass}>المبلغ المسجّل</th>
              <th className={thClass}>الحصة</th>
              <th className={thClass}>حصة الفعلي</th>
              <th className={thClass}>المطلوب منه</th>
              <th className={thClass}>حصة الربح بعد الدخول</th>
              <th className={thClass}>حصة قيمة المشروع</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {snap.rows.map((row) => {
              const p = row.investor;
              const isNew = row.joinDay > earliest;
              return (
                <tr key={p.id}>
                  <td className={tdClass}>
                    <span className="text-[var(--bb-title)]">{p.name}</span>
                    {p.phone ? <div className="text-xs text-[var(--bb-muted)]">{p.phone}</div> : null}
                  </td>
                  <td className={tdClass}>
                    {row.joinDay}
                    {isNew ? <div className="text-[10px] text-[var(--bb-muted)]">من هذا التاريخ فقط</div> : null}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmt(row.recorded)}
                    {row.overflow > 0.009 ? (
                      <div className="text-[10px] text-[var(--bb-warn)]">فائض {fmt(row.overflow)}</div>
                    ) : null}
                  </td>
                  <td className={tdClass}>
                    <span dir="ltr">{row.pctActual.toFixed(1)}%</span>
                    <div className="text-[10px] text-[var(--bb-muted)]" dir="ltr">
                      من المسجّلين {row.pctRecorded.toFixed(1)}%
                    </div>
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmt(row.toward)}
                  </td>
                  <td className={tdClass}>
                    {row.extraNeed > 0.009 ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="text-[var(--bb-bad)]" dir="ltr">
                          {fmt(row.extraNeed)}
                        </span>
                        <ActionBtn
                          tone="ghost"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `إضافة ${fmt(row.extraNeed)} EGP إلى «${p.name}»؟ يصبح رأس ماله ${fmt(p.amount + row.extraNeed)} EGP.`,
                              )
                            ) {
                              return;
                            }
                            app.saveInvestor({ ...p, amount: p.amount + row.extraNeed });
                            app.saveInvestorTarget({
                              needed: Math.max(0, (app.investorTarget.needed || 0) - row.extraNeed),
                            });
                          }}
                        >
                          أضف
                        </ActionBtn>
                      </span>
                    ) : snap.cap.gap > 0.009 ? (
                      <span className="text-xs text-[var(--bb-muted)]">يتبقى للقادمين</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${tdClass} ${plTone(row.profitAfterJoin) === "ok" ? "text-[var(--bb-ok)]" : "text-[var(--bb-bad)]"}`} dir="ltr">
                    {row.profitAfterJoin >= 0 ? "+" : ""}
                    {fmt(row.profitAfterJoin)}
                    {isNew && Math.abs(row.profitAfterJoin) < 0.01 ? (
                      <div className="text-[10px] text-[var(--bb-muted)]">مال جديد — الربح السابق ليس له</div>
                    ) : null}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmt(row.navShare)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <ActionBtn tone="ghost" onClick={() => start(p)}>
                      تعديل
                    </ActionBtn>{" "}
                    <ActionBtn
                      tone="danger"
                      onClick={() => {
                        if (window.confirm(`حذف المستثمر «${p.name}»؟`)) app.removeInvestor(p.id);
                      }}
                    >
                      حذف
                    </ActionBtn>
                  </td>
                </tr>
              );
            })}
            {snap.cap.gap > 0.009 ? (
              <tr>
                <td className={tdClass} colSpan={4}>
                  غير موزّع بعد
                  <div className="text-[10px] text-[var(--bb-muted)]">يُسجَّل عند إضافة باقي المستثمرين</div>
                </td>
                <td className={tdClass} dir="ltr">
                  {fmt(snap.cap.gap)}
                </td>
                <td className={tdClass} colSpan={4} />
              </tr>
            ) : null}
          </tbody>
        </FinanceTable>
      )}
      <Modal
        open={edit !== null}
        title={edit && edit !== "new" ? "تعديل مستثمر" : "مستثمر"}
        onClose={() => setEdit(null)}
        footer={
          <>
            <ActionBtn
              onClick={() => {
                if (!name.trim()) return;
                app.saveInvestor({
                  id: edit && edit !== "new" ? edit.id : undefined,
                  name: name.trim(),
                  amount: parseFloat(amount) || 0,
                  phone,
                  notes,
                  date: joinDate || todayISO(),
                });
                setEdit(null);
              }}
            >
              حفظ
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => setEdit(null)}>
              إلغاء
            </ActionBtn>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="الاسم">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="المبلغ">
            <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="تاريخ الدخول">
            <TextInput type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
          </Field>
          <Field label="هاتف">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="ملاحظات">
            <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
