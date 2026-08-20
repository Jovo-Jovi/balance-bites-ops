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
