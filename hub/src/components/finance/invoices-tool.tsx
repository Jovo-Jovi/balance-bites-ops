"use client";

import { useMemo, useState } from "react";
import {
  Accordion,
  ActionBtn,
  Empty,
  Field,
  Modal,
  Select,
  TextArea,
  TextInput,
} from "@/components/invoices/ui";
import { fmt, todayISO } from "@/lib/finance/helpers";
import {
  custKey,
  lastDueInvoice,
  settleAmount,
  type CustomerLedgerCard,
  type LedgerInvoiceRow,
} from "@/lib/finance/customer-ledger";
import { invoicePayBadgeClass } from "@/lib/invoices/payments";
import { useFinanceApp } from "./finance-context";
import { FinanceTable, StatCard, tdClass, thClass } from "./section-chips";

function ledgerCardClass(status: LedgerInvoiceRow["status"]) {
  if (status === "paid") {
    return "border border-[var(--bb-ok)]/40 bg-[color-mix(in_srgb,var(--bb-ok)_12%,var(--bb-panel))]";
  }
  if (status === "return-full") {
    return "border border-[var(--bb-line)] bg-[color-mix(in_srgb,var(--bb-muted)_8%,var(--bb-panel))]";
  }
  if (status === "return-partial") {
    return "border border-[var(--bb-warn)]/50 bg-[color-mix(in_srgb,var(--bb-warn)_10%,var(--bb-panel))]";
  }
  return "border border-[var(--bb-warn)]/40 bg-[color-mix(in_srgb,var(--bb-warn)_12%,var(--bb-panel))]";
}

function ledgerBadge(status: LedgerInvoiceRow["status"]) {
  if (status === "return-full") {
    return { cls: "bg-[color-mix(in_srgb,var(--bb-muted)_18%,transparent)] text-[var(--bb-muted)]", txt: "مرتجع كامل" };
  }
  if (status === "return-partial") {
    return {
      cls: "bg-[color-mix(in_srgb,var(--bb-warn)_18%,transparent)] text-[var(--bb-warn)]",
      txt: "مرتجع جزئي · متبقي",
    };
  }
  if (status === "paid") return { cls: invoicePayBadgeClass("paid"), txt: "مدفوع" };
  return { cls: invoicePayBadgeClass("pending"), txt: "معلق" };
}

function payModeLabel(mode: string) {
  if (mode === "paid_all") return "سدّد الكل";
  if (mode === "keep_last") return "آخر فاتورة";
  if (mode === "invoice_paid") return "تسجيل مدفوع";
  return "دفعة";
}

function confirmSettle(c: CustomerLedgerCard, mode: string) {
  if (mode === "paid_all") {
    return window.confirm(
      `تأكيد «سدّد الكل»؟\nيُسجَّل سداد كل المتبقي (${fmt(c.remaining)} EGP) على «${c.name}».`,
    );
  }
  if (mode === "keep_last") {
    return window.confirm(
      `تأكيد «آخر فاتورة»؟\nتُسوّى الفواتير الأقدم ويبقى المتبقي على آخر فاتورة فقط.`,
    );
  }
  return true;
}

export function InvoicesTool() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--bb-muted)]">
        الفواتير تُنشأ في تطبيق الفواتير أو باعتماد التحضير. هنا التحصيل وكشف العميل والطباعة.
      </p>
      <InvoiceWorkspace />
    </div>
  );
}

function InvoiceWorkspace() {
  const app = useFinanceApp();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [pay, setPay] = useState<{ key: string; mode: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  const led = app.customerLedger;
  const rows = useMemo(() => Object.values(led.byInvoice), [led.byInvoice]);
  const pending = rows.filter((r) => r.status === "pending").sort(byDateDesc);
  const paid = rows.filter((r) => r.status === "paid").sort(byDateDesc);
  const partial = rows.filter((r) => r.status === "return-partial").sort(byDateDesc);
  const full = rows.filter((r) => r.status === "return-full").sort(byDateDesc);
  const visibleIds = [...pending, ...paid, ...partial, ...full].map((r) => r.inv.id);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const cards = Object.values(led.byCustomer)
    .filter((c) => c.key !== "_none" || c.gross > 0 || c.remaining > 0)
    .filter((c) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return c.name.toLowerCase().includes(s) || c.phone.includes(q);
    })
    .sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name, "ar"));

  const t = led.totals;
  const custCount = Object.keys(led.byCustomer).filter((k) => k !== "_none").length;

  function toggleId(id: string, on: boolean) {
    setSelected((cur) => (on ? Array.from(new Set([...cur, id])) : cur.filter((x) => x !== id)));
  }

  function openPay(c: CustomerLedgerCard, mode: string) {
    setPay({ key: c.key, mode });
    const preset =
      mode === "paid_all"
        ? c.remaining
        : mode === "keep_last"
          ? settleAmount(c, "keep_last")
          : c.remaining > 0
            ? c.remaining
            : 0;
    setAmount(preset > 0 ? preset.toFixed(2) : "");
    setDate(todayISO());
    setNotes("");
  }

  function settleNow(c: CustomerLedgerCard, mode: string) {
    if (!confirmSettle(c, mode)) return;
    const res = app.applyCustomerPayment({ customerKey: c.key, mode });
    if (!res.ok && res.msg) window.alert(res.msg);
  }

  const payCust = pay ? led.byCustomer[pay.key] : null;
  const detail = detailKey ? led.byCustomer[detailKey] : null;

  return (
    <>
      <div className="bb-glass flex flex-wrap items-center gap-2 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => setSelected(e.target.checked ? visibleIds : [])}
          />
          تحديد الكل
        </label>
        <span className="text-xs text-[var(--bb-muted)]">{selected.length} محددة</span>
        <ActionBtn tone="ghost" onClick={() => app.printSavedInvoices(selected, "original")}>
          طباعة أصلية
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={() => app.printSavedInvoices(selected, "net")}>
          طباعة بعد المرتجع
        </ActionBtn>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="عميل" value={String(custCount)} />
        <StatCard label="مدفوعة" value={String(paid.length)} />
        <StatCard label="معلقة" value={String(pending.length + partial.length)} />
        <StatCard label="مرتجع جزئي" value={String(partial.length)} />
        <StatCard label="مدفوع بعد المرتجع" value={`${fmt(t.paid)} EGP`} />
        <StatCard label="معلق العملاء" value={`${fmt(t.remaining)} EGP`} />
      </div>
      <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عميل..." />
      <Accordion title="كشف عميل" hint={`${cards.length} حساب`} defaultOpen>
        {cards.length === 0 ? (
          <Empty>لا حسابات</Empty>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((c) => (
              <CustomerCard
                key={c.key}
                card={c}
                onOpen={() => setDetailKey(c.key)}
                onPay={() => openPay(c, "amount")}
                onSettleAll={() => settleNow(c, "paid_all")}
                onKeepLast={() => settleNow(c, "keep_last")}
              />
            ))}
          </ul>
        )}
      </Accordion>
      <InvoiceSection
        title="معلقة"
        hint={`${pending.length} · ${fmt(pending.reduce((s, r) => s + r.remaining, 0))} EGP`}
        rows={pending}
        empty="لا يوجد فواتير معلقة"
        selected={selected}
        onToggle={toggleId}
        onCustomer={(key) => {
          if (!key) {
            window.alert("لا يوجد عميل على هذه الفاتورة");
            return;
          }
          setDetailKey(key);
        }}
      />
      <InvoiceSection
        title="مدفوعة"
        hint={`${paid.length} · ${fmt(paid.reduce((s, r) => s + r.paid, 0))} EGP`}
        rows={paid}
        empty="لا يوجد فواتير مدفوعة"
        selected={selected}
        onToggle={toggleId}
        onCustomer={(key) => {
          if (!key) {
            window.alert("لا يوجد عميل على هذه الفاتورة");
            return;
          }
          setDetailKey(key);
        }}
        defaultOpen={false}
      />
      <InvoiceSection
        title="مرتجع جزئي"
        hint={`${partial.length} · متبقي ${fmt(partial.reduce((s, r) => s + r.remaining, 0))}`}
        rows={partial}
        empty="لا يوجد مرتجعات جزئية بمبلغ متبقي"
        selected={selected}
        onToggle={toggleId}
        onCustomer={(key) => {
          if (!key) {
            window.alert("لا يوجد عميل على هذه الفاتورة");
            return;
          }
          setDetailKey(key);
        }}
        defaultOpen={false}
      />
      <InvoiceSection
        title="مرتجع كامل"
        hint={`${full.length} · ${fmt(full.reduce((s, r) => s + r.gross, 0))} EGP`}
        rows={full}
        empty="لا يوجد فواتير مرتجعة بالكامل"
        selected={selected}
        onToggle={toggleId}
        onCustomer={(key) => {
          if (!key) {
            window.alert("لا يوجد عميل على هذه الفاتورة");
            return;
          }
          setDetailKey(key);
        }}
        defaultOpen={false}
      />
      <CustomerDetailModal
        card={detail || null}
        onClose={() => setDetailKey(null)}
        onPay={(mode) => {
          if (!detail) return;
          openPay(detail, mode);
        }}
        onSettleAll={() => {
          if (!detail) return;
          settleNow(detail, "paid_all");
        }}
      />
      <Modal
        open={!!pay}
        title="دفعة عميل"
        onClose={() => setPay(null)}
        footer={
          <>
            <ActionBtn
              onClick={() => {
                if (!pay || !payCust) return;
                if (pay.mode === "amount") {
                  const amt = parseFloat(amount) || 0;
                  if (
                    !window.confirm(`تسجيل دفعة ${fmt(amt)} EGP لـ «${payCust.name}»؟`)
                  ) {
                    return;
                  }
                } else if (!confirmSettle(payCust, pay.mode)) {
                  return;
                }
                const res = app.applyCustomerPayment({
                  customerKey: pay.key,
                  mode: pay.mode,
                  amount: parseFloat(amount) || 0,
                  date,
                  notes,
                });
                if (res.ok) setPay(null);
                else if (res.msg) window.alert(res.msg);
              }}
            >
              حفظ
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => setPay(null)}>
              إلغاء
            </ActionBtn>
          </>
        }
      >
        {payCust ? (
          <div className="grid gap-3">
            <p className="text-sm text-[var(--bb-title)]">
              {payCust.name}
              {payCust.phone ? ` · ${payCust.phone}` : ""}
            </p>
            <p className="text-xs text-[var(--bb-muted)]">
              صافي بعد المرتجع: {fmt(payCust.net)} EGP · مدفوع {fmt(payCust.paid)} · متبقي{" "}
              {fmt(payCust.remaining)} EGP
            </p>
            <Field label="النوع">
              <Select
                value={pay?.mode || "amount"}
                onChange={(e) => {
                  const mode = e.target.value;
                  if (!payCust || !pay) return;
                  setPay({ ...pay, mode });
                  const preset =
                    mode === "paid_all"
                      ? payCust.remaining
                      : mode === "keep_last"
                        ? settleAmount(payCust, "keep_last")
                        : payCust.remaining;
                  setAmount(preset > 0 ? preset.toFixed(2) : "");
                }}
              >
                <option value="amount">مبلغ</option>
                <option value="paid_all">سدّد الكل</option>
                <option value="keep_last">أبقِ الأخيرة</option>
              </Select>
            </Field>
            {pay?.mode === "amount" ? (
              <Field label="المبلغ">
                <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
            ) : null}
            <Field label="التاريخ">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="ملاحظات">
              <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function byDateDesc(a: LedgerInvoiceRow, b: LedgerInvoiceRow) {
  return (b.inv.date || "").localeCompare(a.inv.date || "");
}

function CustomerCard({
  card: c,
  onOpen,
  onPay,
  onSettleAll,
  onKeepLast,
}: {
  card: CustomerLedgerCard;
  onOpen: () => void;
  onPay: () => void;
  onSettleAll: () => void;
  onKeepLast: () => void;
}) {
  const due = c.remaining > 0.009;
  const last = lastDueInvoice(c);
  const lastLbl = last ? last.inv.invoiceNumber || last.inv.date || "آخر فاتورة" : "—";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`bb-pressable w-full rounded-[var(--bb-radius)] p-4 text-start ${
          due
            ? "border border-[var(--bb-warn)]/40 bg-[color-mix(in_srgb,var(--bb-warn)_8%,var(--bb-panel))]"
            : "bb-glass"
        }`}
      >
        <p className="text-[var(--bb-title)]">{c.name}</p>
        <p className="mt-1 text-xs text-[var(--bb-gold)]">اضغط للتفاصيل والدفعات ←</p>
        <p className="mt-1 text-xs text-[var(--bb-muted)]">
          {c.invoices.length} فاتورة · مرتجع {fmt(c.returned + (c.extraReturns || 0))} · دفعات {c.payments.length}
          {due ? ` · آخر معلق: ${lastLbl}` : ""}
        </p>
        <dl className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--bb-muted)]">الفواتير</dt>
            <dd dir="ltr">{fmt(c.gross)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--bb-muted)]">مرتجعات</dt>
            <dd className="text-[var(--bb-bad)]" dir="ltr">
              −{fmt(c.returned + (c.extraReturns || 0))}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--bb-muted)]">الصافي</dt>
            <dd dir="ltr">{fmt(Math.max(0, c.gross - (c.returned || 0) - (c.extraReturns || 0)))}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--bb-muted)]">مدفوع</dt>
            <dd className="text-[var(--bb-ok)]" dir="ltr">
              {fmt(c.paid)}
            </dd>
          </div>
          <div className={`flex justify-between gap-2 ${due ? "text-[var(--bb-warn)]" : "text-[var(--bb-ok)]"}`}>
            <dt>المتبقي</dt>
            <dd dir="ltr">{fmt(c.remaining)} EGP</dd>
          </div>
        </dl>
      </button>
      <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        <ActionBtn onClick={onPay}>دفعة</ActionBtn>
        <ActionBtn tone="ghost" onClick={onSettleAll}>
          سدّد الكل
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={onKeepLast}>
          آخر فاتورة
        </ActionBtn>
      </div>
    </li>
  );
}

function InvoiceSection({
  title,
  hint,
  rows,
  empty,
  selected,
  onToggle,
  onCustomer,
  defaultOpen = true,
}: {
  title: string;
  hint: string;
  rows: LedgerInvoiceRow[];
  empty: string;
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
  onCustomer: (key: string) => void;
  defaultOpen?: boolean;
}) {
  return (
    <Accordion title={title} hint={hint} defaultOpen={defaultOpen}>
      {rows.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <InvoiceCard
              key={row.inv.id}
              row={row}
              checked={selected.includes(row.inv.id)}
              onToggle={onToggle}
              onCustomer={onCustomer}
            />
          ))}
        </ul>
      )}
    </Accordion>
  );
}

function InvoiceCard({
  row,
  checked,
  onToggle,
  onCustomer,
}: {
  row: LedgerInvoiceRow;
  checked: boolean;
  onToggle: (id: string, on: boolean) => void;
  onCustomer: (key: string) => void;
}) {
  const app = useFinanceApp();
  const inv = row.inv;
  const badge = ledgerBadge(row.status);
  const showAmt =
    row.status === "pending" || row.status === "return-partial" ? row.remaining : row.paid;
  const retAmt = (row.returned || 0) + (row.extraReturned || 0);
  const custKeyVal = custKey(inv.customerId, inv.customerName);
  const invTotal = Number(inv.total) || 0;
  return (
    <li className={`rounded-[var(--bb-radius)] p-4 ${ledgerCardClass(row.status)}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(e) => onToggle(inv.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[var(--bb-title)]">{inv.invoiceNumber || "—"}</p>
          <button
            type="button"
            className="mt-1 text-sm text-[var(--bb-gold)]"
            onClick={() => onCustomer(custKeyVal)}
          >
            {inv.customerName || "—"} · تفاصيل الدفعات
          </button>
          <p className="mt-1 text-xs text-[var(--bb-muted)]">
            {inv.date}
            {inv.items ? ` · ${inv.items.length} منتج` : ""}
          </p>
          <p className="mt-1 text-sm" dir="ltr">
            {fmt(showAmt)} EGP
            {invTotal - showAmt > 0.009 ? (
              <span className="ms-2 text-xs text-[var(--bb-muted)] line-through">{fmt(invTotal)}</span>
            ) : null}
          </p>
          {retAmt > 0.009 ? (
            <p className="mt-1 text-xs text-[var(--bb-bad)]" dir="ltr">
              −{fmt(retAmt)} EGP مرتجع
            </p>
          ) : null}
          {row.status === "return-partial" ? (
            <p className="mt-1 text-xs text-[var(--bb-warn)]">متبقي على العميل: {fmt(row.remaining)} EGP</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`bb-pay-chip ${badge.cls}`}>{badge.txt}</span>
        <ActionBtn tone="ghost" onClick={() => onCustomer(custKeyVal)}>
          الحساب
        </ActionBtn>
        {row.status !== "return-full" ? (
          <ActionBtn
            onClick={() => {
              const nextPaid = row.status !== "paid";
              const msg = nextPaid
                ? `تسجيل الفاتورة ${inv.invoiceNumber} مدفوعة؟`
                : `تعليق الفاتورة ${inv.invoiceNumber}؟`;
              if (!window.confirm(msg)) return;
              const res = app.toggleInvoicePaid(inv.id);
              if (!res.ok && res.msg) window.alert(res.msg);
            }}
          >
            {row.status === "paid" ? "تحديد معلق" : "تسجيل مدفوع"}
          </ActionBtn>
        ) : null}
        {retAmt > 0.009 || row.status === "return-partial" || row.status === "return-full" ? (
          <>
            <ActionBtn tone="ghost" onClick={() => app.printSavedInvoice(inv.id, "original")}>
              أصلية
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => app.printSavedInvoice(inv.id, "net")}>
              للدفع
            </ActionBtn>
          </>
        ) : (
          <ActionBtn tone="ghost" onClick={() => app.printSavedInvoice(inv.id, "original")}>
            طباعة
          </ActionBtn>
        )}
      </div>
    </li>
  );
}

function CustomerDetailModal({
  card,
  onClose,
  onPay,
  onSettleAll,
}: {
  card: CustomerLedgerCard | null;
  onClose: () => void;
  onPay: (mode: string) => void;
  onSettleAll: () => void;
}) {
  const app = useFinanceApp();
  const c = card;
  const rets = c
    ? app.returns.filter((r) => {
        const key = custKey(r.customerId, r.customerName);
        return key === c.key || (!!c.name && r.customerName === c.name);
      })
    : [];
  return (
    <Modal
      open={!!c}
      title={c ? `حساب · ${c.name}` : "حساب"}
      onClose={onClose}
      wide
      footer={
        c ? (
          <>
            <ActionBtn onClick={() => onPay("amount")}>دفعة</ActionBtn>
            <ActionBtn tone="ghost" onClick={onSettleAll}>
              سدّد الكل
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => onPay("keep_last")}>
              آخر فاتورة
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={onClose}>
              إغلاق
            </ActionBtn>
          </>
        ) : null
      }
    >
      {c ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <StatCard label="فاتورة" value={String(c.invoices.length)} />
            <StatCard label="مرتجعات" value={`${fmt(c.returned + (c.extraReturns || 0))} EGP`} />
            <StatCard label="مدفوع" value={`${fmt(c.paid)} EGP`} />
            <StatCard label="متبقي" value={`${fmt(c.remaining)} EGP`} />
          </div>
          {c.remaining > 0.009 ? (
            <p className="text-xs text-[var(--bb-muted)]">
              المتبقي {fmt(c.remaining)} EGP = الفواتير {fmt(c.gross)} − مرتجع{" "}
              {fmt(c.returned + (c.extraReturns || 0))} − مدفوع {fmt(c.paid)}.
            </p>
          ) : null}
          <h3 className="text-xs tracking-[0.14em] text-[var(--bb-gold)] uppercase">فواتير</h3>
          {c.invoices.length === 0 ? (
            <Empty>لا فواتير</Empty>
          ) : (
            <FinanceTable minWidth="28rem">
              <thead>
                <tr>
                  <th className={thClass}>فاتورة</th>
                  <th className={thClass}>صافي / أصل</th>
                  <th className={thClass}>حالة</th>
                </tr>
              </thead>
              <tbody>
                {c.invoices
                  .slice()
                  .reverse()
                  .map((r) => {
                    const st =
                      r.status === "paid"
                        ? "مدفوعة"
                        : r.status === "return-full"
                          ? "مرتجع كامل"
                          : r.status === "return-partial"
                            ? `جزئي · متبقي ${fmt(r.remaining)}`
                            : `معلق ${fmt(r.remaining)}`;
                    return (
                      <tr key={r.inv.id}>
                        <td className={tdClass}>
                          {r.inv.invoiceNumber || "—"} · {r.inv.date || ""}
                        </td>
                        <td className={tdClass} dir="ltr">
                          {fmt(r.net)} / {fmt(r.gross)}
                        </td>
                        <td className={tdClass}>{st}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </FinanceTable>
          )}
          <h3 className="text-xs tracking-[0.14em] text-[var(--bb-gold)] uppercase">دفعات</h3>
          {c.payments.length === 0 ? (
            <Empty>لا دفعات مسجّلة بعد — اضغط دفعة</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {c.payments
                .slice()
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                .map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      {p.date || "—"} · {payModeLabel(p.mode)}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </span>
                    <span className="flex items-center gap-2" dir="ltr">
                      {fmt(p.amount)} EGP
                      <ActionBtn
                        tone="danger"
                        onClick={() => {
                          if (!window.confirm("حذف هذه الدفعة وإرجاع حالة الفواتير كما كانت؟")) return;
                          app.removeCustomerPayment(p.id);
                        }}
                      >
                        حذف
                      </ActionBtn>
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <h3 className="text-xs tracking-[0.14em] text-[var(--bb-gold)] uppercase">مرتجعات</h3>
          {rets.length === 0 ? (
            <Empty>لا مرتجعات</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {rets.slice(0, 20).map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>
                    {r.date || "—"} · {r.invoiceNumber || "أصناف"} · {r.reason || ""}
                  </span>
                  <span className="text-[var(--bb-bad)]" dir="ltr">
                    −{fmt(r.amount || 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
