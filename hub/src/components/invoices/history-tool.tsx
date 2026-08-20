"use client";

import { useMemo, useState } from "react";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, TextInput } from "./ui";
import { fmt } from "@/lib/invoices/helpers";
import {
  invoicePayBadgeClass,
  invoicePayLabel,
  invoicePayRowClass,
  invoicePayStatus,
} from "@/lib/invoices/payments";
import { enrichInvoice, salesStatusLabel } from "@/lib/invoices/returns";
import { useWorkspaceTab } from "@/hooks/use-workspace-tab";

const PAY_FILTERS = [
  { id: "all", label: "الكل" },
  { id: "pending", label: "معلقة" },
  { id: "paid", label: "مدفوعة" },
] as const;

type PayFilter = (typeof PAY_FILTERS)[number]["id"];

export function HistoryTool() {
  const app = useInvoiceApp();
  const openTab = useWorkspaceTab();
  const [q, setQ] = useState("");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
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
    <div className="flex flex-col gap-4">
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث برقم أو عميل أو تاريخ..."
      />
      <div className="flex flex-wrap gap-2">
        {PAY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={payFilter === f.id}
            onClick={() => setPayFilter(f.id)}
            className={`bb-btn rounded-full text-sm ${
              payFilter === f.id
                ? "border border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                : "bb-glass"
            }`}
            data-tone={payFilter === f.id ? undefined : "ghost"}
          >
            {f.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty>
          {payFilter === "pending"
            ? "لا توجد فواتير معلقة"
            : payFilter === "paid"
              ? "لا توجد فواتير مدفوعة"
              : "لا يوجد فواتير محفوظة"}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((inv) => {
            const e = enrichInvoice(app.returns, inv);
            const pay = invoicePayStatus(app.payments, inv.id);
            return (
              <li
                key={inv.id}
                className={`rounded-[var(--bb-radius)] p-4 ${invoicePayRowClass(pay)}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[var(--bb-title)]">{inv.invoiceNumber}</span>
                  <span className={`bb-pay-chip ${invoicePayBadgeClass(pay)}`}>
                    {invoicePayLabel(pay)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--bb-muted)]">
                  {inv.customerName || "—"} · {inv.date} · {inv.items?.length || 0} منتج
                  {e.salesStatus !== "active"
                    ? ` · ${salesStatusLabel(e.salesStatus)}`
                    : ""}
                  {" · "}
                  <span dir="ltr">
                    {e.salesStatus === "partial" ? (
                      <>
                        {fmt(e.net)} {app.strings.cur}{" "}
                        <span className="text-xs line-through">
                          {fmt(e.gross)}
                        </span>
                      </>
                    ) : e.salesStatus === "full" ? (
                      <span className="line-through opacity-60">
                        {fmt(e.gross)} {app.strings.cur}
                      </span>
                    ) : (
                      `${fmt(e.gross)} ${app.strings.cur}`
                    )}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionBtn
                    onClick={() => {
                      app.loadInvoice(inv.id);
                      openTab("editor");
                    }}
                  >
                    تحميل
                  </ActionBtn>
                  <ActionBtn
                    tone="ghost"
                    onClick={() => app.printSavedInvoice(inv.id)}
                  >
                    طباعة
                  </ActionBtn>
                  <ActionBtn tone="ghost" onClick={() => app.duplicateInvoice(inv.id)}>
                    نسخ
                  </ActionBtn>
                  <ActionBtn
                    tone="ghost"
                    onClick={() =>
                      app.setPayment(inv.id, pay === "paid" ? "pending" : "paid")
                    }
                  >
                    {pay === "paid" ? "تعيين معلق" : "تعيين مدفوع"}
                  </ActionBtn>
                  <ActionBtn
                    tone="danger"
                    onClick={() => {
                      if (window.confirm(`حذف الفاتورة ${inv.invoiceNumber}؟`)) {
                        app.removeInvoice(inv.id);
                      }
                    }}
                  >
                    حذف
                  </ActionBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
