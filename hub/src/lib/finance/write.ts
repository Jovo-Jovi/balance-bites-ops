import { CloudStore } from "@/lib/cloud-store";
import { isFinanceWriteKey, type BbKey } from "@/lib/keys";
import type { Invoice } from "@/lib/invoices/types";

export function writeFinanceKey(key: BbKey, value: unknown) {
  if (!isFinanceWriteKey(key)) {
    return Promise.reject(
      new Error(
        `المالية لا تكتب ${key} — القوالب من التصميم والمظهر من الفواتير`,
      ),
    );
  }
  return CloudStore.set(key, value);
}

/** Prep approve only: append a finished invoice. Not a second invoice editor. */
export function commitPrepInvoice(invoices: Invoice[]) {
  return CloudStore.set("bb_invoices", invoices);
}
