import type { PendingInvoice } from "./types";

/** Invoice Pro queue: skip prep drafts until finance approves them. */
export function visiblePendingQueue(all: PendingInvoice[]) {
  return all.filter((p) => p.status !== "completed" && p.kind !== "invoice_draft");
}
