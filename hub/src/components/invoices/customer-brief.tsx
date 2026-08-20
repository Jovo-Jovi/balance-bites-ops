"use client";

import { useMemo } from "react";
import { fmt } from "@/lib/invoices/helpers";
import {
  customerPendingCount,
  invoicePayBadgeClass,
  invoicePayLabel,
  invoicePayRowClass,
  invoicePayStatus,
} from "@/lib/invoices/payments";
import { enrichInvoice, salesStatusLabel } from "@/lib/invoices/returns";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, Modal } from "./ui";

export function CustomerPickList({
  query,
  onPick,
}: {
  query: string;
  onPick: (id: string) => void;
}) {
  const { customers, invoices, payments, returns } = useInvoiceApp();
  const q = query.toLowerCase();
  const list = customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").includes(q),
  );
  if (!list.length) return <Empty>لا يوجد عملاء</Empty>;
  return (
    <ul className="flex flex-col gap-2">
      {list.map((c) => {
        const n = invoices.filter((i) => i.customerId === c.id).length;
        const pending = customerPendingCount(invoices, payments, returns, c.id);
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c.id)}
              className={`bb-glass bb-pressable w-full px-3 py-3 text-start ${
                pending ? "bb-card-pending" : "bb-card-clear"
              }`}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--bb-title)]">{c.name}</span>
                <span
                  className={`bb-pay-chip ${
                    pending
                      ? "bg-[color-mix(in_srgb,var(--bb-warn)_18%,transparent)] text-[var(--bb-warn)]"
                      : "bg-[color-mix(in_srgb,var(--bb-ok)_18%,transparent)] text-[var(--bb-ok)]"
                  }`}
                >
                  {pending ? `${pending} معلقة` : "لا معلق"}
                </span>
              </span>
              <span className="text-xs text-[var(--bb-muted)]">
                {c.phone || "بدون هاتف"} · {n} فاتورة
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function CustomerBrief({
  customerId,
  onClose,
  onLoad,
  onUseForInvoice,
}: {
  customerId: string | null;
  onClose: () => void;
  onLoad?: (invoiceId: string) => void;
  onUseForInvoice?: (customerId: string) => void;
}) {
  const app = useInvoiceApp();
  const c = app.customers.find((x) => x.id === customerId);
  const invs = useMemo(() => {
    if (!customerId) return [];
    return app.invoices
      .filter((i) => i.customerId === customerId)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((inv) => enrichInvoice(app.returns, inv));
  }, [app.invoices, app.returns, customerId]);
  const pendingDrafts = useMemo(() => {
    if (!customerId) return [];
    return app.queue.filter((p) => p.customerId === customerId);
  }, [app.queue, customerId]);
  const paidCount = invs.filter(
    (e) => invoicePayStatus(app.payments, e.inv.id) === "paid",
  ).length;
  const pendingCount = invs.length - paidCount;
  const net = invs
    .filter((e) => e.salesStatus !== "full")
    .reduce((s, e) => s + e.net, 0);

  return (
    <Modal
      open={Boolean(customerId && c)}
      title={c ? c.name : ""}
      onClose={onClose}
      footer={
        <>
          {onUseForInvoice && customerId ? (
            <ActionBtn
              onClick={() => {
                onUseForInvoice(customerId);
                onClose();
              }}
            >
              اختر للفاتورة
            </ActionBtn>
          ) : (
            <ActionBtn onClick={onClose}>
              موافق — فاتورة جديدة {app.draft.invoiceNumber}
            </ActionBtn>
          )}
        </>
      }
    >
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        {invs.length} فاتورة · {paidCount} مدفوعة · {pendingCount} معلقة
        {pendingDrafts.length ? ` · ${pendingDrafts.length} مسودة` : ""} · صافي{" "}
        {fmt(net)} {app.strings.cur}
        {c?.phone ? ` · ${c.phone}` : ""}
      </p>
      {pendingDrafts.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {pendingDrafts.map((p) => (
            <li
              key={p.id}
              className="rounded-[var(--bb-radius)] border border-[var(--bb-warn)]/40 px-3 py-2 text-sm"
            >
              <span className="block text-[var(--bb-title)]">
                {p.title || "مسودة تحضير"}
              </span>
              <span className="text-xs text-[var(--bb-muted)]">مسودة · لم تُصدر بعد</span>
            </li>
          ))}
        </ul>
      ) : null}
      {invs.length === 0 ? (
        <Empty>لا يوجد فواتير سابقة</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {invs.map((e) => {
            const pay = invoicePayStatus(app.payments, e.inv.id);
            const row = (
              <>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[var(--bb-title)]">
                    {e.inv.invoiceNumber} · {e.inv.date}
                  </span>
                  <span className={`bb-pay-chip ${invoicePayBadgeClass(pay)}`}>
                    {invoicePayLabel(pay)}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-[var(--bb-muted)]">
                  {fmt(e.net)} {app.strings.cur}
                  {e.salesStatus !== "active"
                    ? ` · ${salesStatusLabel(e.salesStatus)}`
                    : ""}
                  {` · ${e.inv.items?.length || 0} منتج`}
                </span>
              </>
            );
            return (
              <li key={e.inv.id}>
                <div
                  className={`rounded-[var(--bb-radius)] px-3 py-3 ${invoicePayRowClass(pay)}`}
                >
                  {row}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onLoad ? (
                      <ActionBtn
                        onClick={() => onLoad(e.inv.id)}
                      >
                        تحميل
                      </ActionBtn>
                    ) : null}
                    <ActionBtn
                      tone="ghost"
                      onClick={() => app.printSavedInvoice(e.inv.id)}
                    >
                      طباعة
                    </ActionBtn>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
