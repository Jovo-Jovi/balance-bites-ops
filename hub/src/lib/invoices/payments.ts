import type { InvoicePayments, PaymentStatus } from "./types";

export function invoicePayStatus(
  payments: InvoicePayments,
  invoiceId: string,
): PaymentStatus {
  return payments[invoiceId]?.status === "paid" ? "paid" : "pending";
}

export function invoicePayLabel(status: PaymentStatus) {
  return status === "paid" ? "مدفوعة" : "معلقة";
}

export function invoicePayRowClass(status: PaymentStatus) {
  return status === "paid"
    ? "border border-[var(--bb-ok)]/40 bg-[color-mix(in_srgb,var(--bb-ok)_12%,var(--bb-panel))]"
    : "border border-[var(--bb-warn)]/40 bg-[color-mix(in_srgb,var(--bb-warn)_12%,var(--bb-panel))]";
}

export function invoicePayBadgeClass(status: PaymentStatus) {
  return status === "paid"
    ? "bg-[color-mix(in_srgb,var(--bb-ok)_18%,transparent)] text-[var(--bb-ok)]"
    : "bg-[color-mix(in_srgb,var(--bb-warn)_18%,transparent)] text-[var(--bb-warn)]";
}
