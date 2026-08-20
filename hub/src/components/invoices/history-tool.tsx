"use client";

import { useMemo, useState } from "react";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, TextInput } from "./ui";
import { fmt } from "@/lib/invoices/helpers";
import { enrichInvoice, salesStatusLabel } from "@/lib/invoices/returns";

export function HistoryTool() {
  const app = useInvoiceApp();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const query = q.toLowerCase();
    return app.invoices.filter((inv) => {
      if (!query) return true;
      return (
        (inv.invoiceNumber || "").toLowerCase().includes(query) ||
        (inv.customerName || "").toLowerCase().includes(query) ||
        (inv.date || "").includes(query)
      );
    });
  }, [app.invoices, q]);

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث برقم أو عميل أو تاريخ..."
      />
      {list.length === 0 ? (
        <Empty>لا يوجد فواتير محفوظة</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((inv) => {
            const e = enrichInvoice(app.returns, inv);
            const pay = app.payments[inv.id]?.status === "paid" ? "paid" : "pending";
            return (
              <li key={inv.id} className="bb-glass p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[var(--bb-title)]">{inv.invoiceNumber}</span>
                  <span dir="ltr">
                    {e.salesStatus === "partial" ? (
                      <>
                        {fmt(e.net)} {app.strings.cur}{" "}
                        <span className="text-xs text-[var(--bb-muted)] line-through">
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
                </div>
                <p className="mt-1 text-sm text-[var(--bb-muted)]">
                  {inv.customerName || "—"} · {inv.date} · {inv.items?.length || 0} منتج
                  {e.salesStatus !== "active"
                    ? ` · ${salesStatusLabel(e.salesStatus)}`
                    : ""}
                  {` · ${pay === "paid" ? "مدفوعة" : "معلقة"}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionBtn
                    onClick={() => {
                      if (
                        window.confirm(
                          "تحميل هذه الفاتورة؟ ستُستبدل البيانات الحالية.",
                        )
                      ) {
                        app.loadInvoice(inv.id);
                      }
                    }}
                  >
                    تحميل
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
