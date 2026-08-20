export type RemoteSnapKind = "empty" | "own" | "echo" | "hydrate" | "conflict";

export type RemoteSnapInput = {
  exists: boolean;
  writeId: string;
  pendingHasWriteId: boolean;
  lastApplied: string;
  alreadyWatching: boolean;
  hasPendingWrites: boolean;
};

export function classifyRemoteSnapshot(input: RemoteSnapInput): RemoteSnapKind {
  if (!input.exists) return "empty";
  if (input.pendingHasWriteId) return "own";
  if (input.writeId && input.writeId === input.lastApplied) return "echo";
  if (!input.alreadyWatching) return "hydrate";
  if (input.hasPendingWrites) return "echo";
  return "conflict";
}

/** Arabic label for staff toasts — never show raw bb_* keys. */
export function conflictToastLabel(key: string): string {
  if (
    key === "bb_inv2" ||
    key === "bb_active_color_preset_id" ||
    key === "bb_color_presets" ||
    key === "bb_active_theme" ||
    key === "bb_inv_print_preset_id" ||
    key === "bb_inv_print_page_size" ||
    key === "bb_inv_print_margins" ||
    key === "bb_print_fit_one"
  ) {
    return "المظهر";
  }
  if (key === "bb_customers") return "العملاء";
  if (key === "bb_invoices" || key === "bb_invoice_payments") return "الفواتير";
  return "البيانات";
}
