import { CloudStore } from "@/lib/cloud-store";
import { isInvoiceWriteKey, type BbKey } from "@/lib/keys";

export function writeInvoiceKey(key: BbKey, value: unknown, basedOn?: string) {
  if (!isInvoiceWriteKey(key)) {
    return Promise.reject(
      new Error(`تطبيق الفواتير لا يكتب ${key} — الكتالوج والمرتجعات من المالية`),
    );
  }
  if (key === "bb_invoices") {
    return CloudStore.setFrom(key, value, basedOn ?? "");
  }
  return CloudStore.set(key, value);
}
