import { CloudStore } from "@/lib/cloud-store";
import { FINANCE_PREP_APPEND_KEYS, isFinanceWriteKey, type BbKey } from "@/lib/keys";
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
export function commitPrepInvoice(invoices: Invoice[], basedOn: string) {
  const key = "bb_invoices" satisfies (typeof FINANCE_PREP_APPEND_KEYS)[number];
  if (!(FINANCE_PREP_APPEND_KEYS as readonly string[]).includes(key)) {
    return Promise.reject(
      new Error(
        `المالية لا تكتب ${key} — القوالب من التصميم والمظهر من الفواتير`,
      ),
    );
  }
  return CloudStore.setFrom(key, invoices, basedOn);
}
