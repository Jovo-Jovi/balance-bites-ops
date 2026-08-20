import type {
  ColorPreset,
  Inv2Snapshot,
  InvoiceLine,
  InvoiceStrings,
  InvoiceTheme,
} from "./types";
import { normalizeLine } from "./helpers";

export const FALLBACK_THEME: InvoiceTheme = {
  bg: "#0a0804",
  gold: "#c9a84c",
  txt: "#e8e0cc",
  mut: "#6b5e3a",
  row: "#12100a",
  tot: "#12100a",
  grand: "#1e1a0f",
};

/** Linen hub look — used only when the user picks web-app print. */
export const HUB_PRINT_THEME: InvoiceTheme = {
  bg: "#f4f0ea",
  gold: "#0f6e6b",
  txt: "#1f2930",
  mut: "#6b645c",
  row: "#fffbf7",
  tot: "#fffbf7",
  grand: "#ebe4da",
};

export type PrintLookId = "__inv2__" | "__hub__";

export const FALLBACK_STRINGS: InvoiceStrings = {
  mono: "BB",
  brand: "Balance Bites",
  docTitle: "فاتورة · Invoice",
  web: "balancebites.com",
  footNote: "شكراً لثقتكم · Thank you for your order",
  cur: "EGP",
  discount: 0,
  discLabel: "خصم · Discount",
  hItem: "المنتج · Item",
  hQty: "الكمية",
  hPrice: "سعر الوحدة",
  hSub: "الإجمالي",
  lSubtotal: "المجموع · Subtotal",
  lTotal: "الإجمالي · Total",
  plTitle: "قائمة الأسعار · Price List",
  plFootNote: "الأسعار قابلة للتغيير · Prices subject to change",
  plDefaultNote: "",
  plHProduct: "المنتج · Product",
  plHPack: "التغليف · Pack",
  plHWeight: "الوزن · Weight",
  plHPrice: "السعر · Price",
  plLblProducts: "منتج",
  plLblCategories: "تصنيف",
  plLblOther: "أخرى · Other",
  plCatSuffix: "منتج",
  clTitle: "قائمة العملاء · Customer List",
  clFootNote: "بيانات العملاء · Customer directory",
  clDefaultNote: "",
  clHNum: "#",
  clHName: "الاسم · Name",
  clHPhone: "الهاتف · Phone",
  clHAddress: "العنوان · Address",
  clHNotes: "ملاحظات · Notes",
  clHLatestInv: "آخر فاتورة · Last Invoice",
  clHLatestVal: "قيمة آخر فاتورة · Last Value",
  clHPayStatus: "الدفع · Payment",
  clHPendingList: "فواتير معلقة · Pending Invoices",
  clLblCustomers: "عميل",
  clLblWithInv: "لديهم فواتير",
  clLblPendingCount: "فاتورة معلقة",
  clPaid: "مدفوعة · Paid",
  clPending: "معلقة · Pending",
  clNoInv: "—",
};

export function mergeTheme(partial?: Partial<InvoiceTheme> | null): InvoiceTheme {
  return { ...FALLBACK_THEME, ...(partial || {}) };
}

export function mergeStrings(partial?: Partial<InvoiceStrings> | null): InvoiceStrings {
  return { ...FALLBACK_STRINGS, ...(partial || {}) };
}

export function parseInv2(value: unknown): {
  hasSnapshot: boolean;
  C: InvoiceTheme;
  S: InvoiceStrings;
  items: InvoiceLine[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { hasSnapshot: false, C: FALLBACK_THEME, S: FALLBACK_STRINGS, items: [] };
  }
  const snap = value as Inv2Snapshot;
  const hasSnapshot = Boolean(snap.C || snap.S || snap.items);
  return {
    hasSnapshot,
    C: mergeTheme(snap.C),
    S: mergeStrings(snap.S),
    items: Array.isArray(snap.items) ? snap.items.map((it) => normalizeLine(it)) : [],
  };
}

export function resolvePrintTheme(
  look: PrintLookId,
  invoiceTheme: InvoiceTheme,
): InvoiceTheme {
  return look === "__hub__" ? HUB_PRINT_THEME : invoiceTheme;
}

export function parsePrintLookId(value: unknown): PrintLookId {
  return value === "__hub__" ? "__hub__" : "__inv2__";
}

export function themeFromPreset(p: ColorPreset): InvoiceTheme {
  return {
    bg: p.bg,
    gold: p.gold,
    txt: p.txt,
    mut: p.mut,
    row: p.row,
    tot: p.tot,
    grand: p.grand,
  };
}

export function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length < 6) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
