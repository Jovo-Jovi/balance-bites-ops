"use client";

import { useMemo, useState } from "react";
import { ActionBtn, Empty, Field, Modal, Select, TextInput } from "@/components/invoices/ui";
import { fmt } from "@/lib/finance/helpers";
import {
  invoicePayBadgeClass,
  invoicePayLabel,
  invoicePayRowClass,
  invoicePayStatus,
} from "@/lib/invoices/payments";
import { enrichInvoice, salesStatusLabel } from "@/lib/invoices/returns";
import { useFinanceApp } from "./finance-context";
import { SectionChips } from "./section-chips";

const SECTIONS = [
  { id: "invoices", label: "الفواتير" },
  { id: "ledger", label: "كشف عميل" },
] as const;

const PAY_FILTERS = [
  { id: "all", label: "الكل" },
  { id: "pending", label: "معلقة" },
  { id: "paid", label: "مدفوعة" },
] as const;

export function InvoicesTool() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("invoices");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--bb-muted)]">
        الفواتير تُنشأ في تطبيق الفواتير أو باعتماد التحضير. هنا التحصيل وكشف العميل.
      </p>
      <SectionChips items={[...SECTIONS]} value={section} onChange={setSection} />
      {section === "invoices" ? <InvoiceCards /> : <CustomerLedgers />}
    </div>
  );
}

function InvoiceCards() {
  const app = useFinanceApp();
  const [q, setQ] = useState("");
  const [payFilter, setPayFilter] = useState<(typeof PAY_FILTERS)[number]["id"]>("all");
  const list = useMemo(() => {
    const query = q.toLowerCase();
    return app.invoices.filter((inv) => {
      const pay = invoicePayStatus(app.payments, inv.id);
      if (payFilter !== "all" && pay !== payFilter) return false;
      if (!query) return true;
      return (
        (inv.invoiceNumber || "").toLowerCase().includes(query) ||
        (inv.customerName || "").toLowerCase().includes(query) ||
        (inv.date || "").includes(query)
      );
    });
  }, [app.invoices, app.payments, q, payFilter]);

  return (
    <>
      <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم أو عميل أو تاريخ..." />
      <SectionChips items={[...PAY_FILTERS]} value={payFilter} onChange={setPayFilter} />
      {list.length === 0 ? (
        <Empty>لا فواتير في هذا التصفية</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((inv) => {
            const e = enrichInvoice(app.returns, inv);
            const pay = invoicePayStatus(app.payments, inv.id);
            return (
              <li key={inv.id} className={`rounded-[var(--bb-radius)] p-4 ${invoicePayRowClass(pay)}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[var(--bb-title)]">{inv.invoiceNumber}</span>
                  <span className={`bb-pay-chip ${invoicePayBadgeClass(pay)}`}>{invoicePayLabel(pay)}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--bb-muted)]">
                  {inv.customerName || "—"} · {inv.date}
                  {e.salesStatus !== "active" ? ` · ${salesStatusLabel(e.salesStatus)}` : ""}
                  {" · "}
                  <span dir="ltr">
                    {fmt(e.net)} EGP
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionBtn
                    onClick={() =>
                      app.setPayment(inv.id, pay === "paid" ? "pending" : "paid")
                    }
                  >
                    {pay === "paid" ? "تعليق" : "مدفوعة"}
                  </ActionBtn>
                  <ActionBtn tone="ghost" onClick={() => app.printSavedInvoice(inv.id)}>
                    طباعة
                  </ActionBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function CustomerLedgers() {
  const app = useFinanceApp();
  const [q, setQ] = useState("");
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [mode, setMode] = useState("amount");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const cards = Object.values(app.customerLedger.byCustomer).filter((c) => {
    if (!q) return true;
    return c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q);
  });
  const t = app.customerLedger.totals;
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <p className="bb-glass p-3 text-sm">مدفوع <span dir="ltr">{fmt(t.paid)}</span></p>
        <p className="bb-glass p-3 text-sm">متبقي <span dir="ltr">{fmt(t.remaining)}</span></p>
        <p className="bb-glass p-3 text-sm">مرتجع <span dir="ltr">{fmt(t.returned)}</span></p>
      </div>
      <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عميل..." />
      {cards.length === 0 ? (
        <Empty>لا حسابات</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((c) => (
            <li key={c.key} className="bb-glass p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-[var(--bb-title)]">{c.name}</p>
                  <p className="text-xs text-[var(--bb-muted)]">{c.phone}</p>
                </div>
                <p className="text-sm" dir="ltr">
                  متبقي {fmt(c.remaining)} · مدفوع {fmt(c.paid)}
                </p>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-[var(--bb-muted)]">
                {c.invoices.map((row) => (
                  <li key={row.inv.id} className="flex justify-between gap-2">
                    <span>{row.inv.invoiceNumber}</span>
                    <span dir="ltr">
                      {row.status} · {fmt(row.remaining)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn onClick={() => { setPayOpen(c.key); setMode("amount"); setAmount(""); }}>
                  دفعة
                </ActionBtn>
                <ActionBtn tone="ghost" onClick={() => app.applyCustomerPayment({ customerKey: c.key, mode: "paid_all" })}>
                  سدّد الكل
                </ActionBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={!!payOpen}
        title="دفعة عميل"
        onClose={() => setPayOpen(null)}
        footer={
          <>
            <ActionBtn
              onClick={() => {
                if (!payOpen) return;
                const res = app.applyCustomerPayment({
                  customerKey: payOpen,
                  mode,
                  amount: parseFloat(amount) || 0,
                  date,
                });
                if (res.ok) setPayOpen(null);
              }}
            >
              حفظ
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => setPayOpen(null)}>
              إلغاء
            </ActionBtn>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="النوع">
            <Select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="amount">مبلغ</option>
              <option value="paid_all">سدّد الكل</option>
              <option value="keep_last">أبقِ الأخيرة</option>
            </Select>
          </Field>
          {mode === "amount" ? (
            <Field label="المبلغ">
              <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
          ) : null}
          <Field label="التاريخ">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
