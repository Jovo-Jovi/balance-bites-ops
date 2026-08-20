import { CloudStore } from "@/lib/cloud-store";
import { isInvoiceWriteKey, type BbKey } from "@/lib/keys";

export function writeInvoiceKey(key: BbKey, value: unknown) {
  if (!isInvoiceWriteKey(key)) {
    return Promise.reject(
      new Error(`تطبيق الفواتير لا يكتب ${key} — الكتالوج والمرتجعات من المالية`),
    );
  }
  return CloudStore.set(key, value);
}
