"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CloudStore } from "@/lib/cloud-store";
import { useCloudKey } from "@/hooks/use-cloud-key";
import { useToast } from "@/components/toast";
import {
  asArray,
  asRecord,
  calcTotals,
  cloneLineFromProduct,
  cloneLines,
  emptyDraft,
  draftFromInvoice,
  genId,
  isInactiveProduct,
  nextGlobalInvoiceNumber,
  nextInvoiceNumber,
  normalizeLine,
  todayISO,
} from "@/lib/invoices/helpers";
import { parseInv2, parsePrintLookId, resolvePrintTheme, themeFromPreset } from "@/lib/invoices/look";
import {
  DEFAULT_PRINT_MARGINS,
  parseMargins,
  parsePageSize,
  type PrintMargins,
  type PrintPageSize,
} from "@/lib/invoices/print-layout";
import { visiblePendingQueue } from "@/lib/invoices/pending";
import {
  printCustomerList,
  printInvoiceDocument,
  printPriceList,
} from "@/lib/invoices/print";
import { writeInvoiceKey } from "@/lib/invoices/write";
import type { PrintLookId } from "@/lib/invoices/look";
import { INVOICE_HISTORY_MAX, type InvoiceDraft } from "@/lib/invoices/types";
import type {
  Category,
  ColorPreset,
  Customer,
  Invoice,
  InvoiceBundle,
  InvoiceLine,
  InvoicePayments,
  InvoiceStrings,
  InvoiceTheme,
  PendingInvoice,
  Product,
  ReturnRecord,
} from "@/lib/invoices/types";

type InvoiceContextValue = {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  activeProducts: Product[];
  categories: Category[];
  pending: PendingInvoice[];
  queue: PendingInvoice[];
  bundles: InvoiceBundle[];
  returns: ReturnRecord[];
  payments: InvoicePayments;
  presets: ColorPreset[];
  activePresetId: string;
  fitOne: boolean;
  draft: InvoiceDraft;
  theme: InvoiceTheme;
  strings: InvoiceStrings;
  setDraft: (patch: Partial<InvoiceDraft>) => void;
  setLine: (index: number, patch: Partial<InvoiceLine>) => void;
  removeLine: (index: number) => void;
  addManualLine: () => void;
  addProduct: (id: string) => void;
  addProducts: (list: Product[]) => number;
  newInvoice: () => void;
  saveInvoice: () => Promise<string | false>;
  loadInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => void;
  removeInvoice: (id: string) => void;
  selectCustomer: (id: string) => { showHistory: boolean };
  saveCustomer: (data: Omit<Customer, "id" | "createdAt"> & { id?: string }) => Customer | null;
  removeCustomer: (id: string) => void;
  loadPending: (id: string) => void;
  completePending: () => Promise<boolean>;
  removePending: (id: string) => void;
  saveBundle: (name: string) => void;
  applyBundle: (id: string, replace: boolean) => void;
  removeBundle: (id: string) => void;
  multiCopyBundle: (bundleId: string, customerIds: string[]) => void;
  setPayment: (invoiceId: string, status: "paid" | "pending") => void;
  applyPreset: (id: string) => void;
  savePreset: (name: string) => void;
  removePreset: (id: string) => void;
  setTheme: (patch: Partial<InvoiceTheme>) => void;
  setStrings: (patch: Partial<InvoiceStrings>) => void;
  persistLook: () => void;
  setFitOne: (on: boolean) => void;
  pageSize: PrintPageSize;
  setPageSize: (size: PrintPageSize) => void;
  margins: PrintMargins;
  setMargins: (patch: Partial<PrintMargins>) => void;
  printLook: PrintLookId;
  setPrintLook: (look: PrintLookId) => void;
  printInvoice: (mode: "original" | "net", look?: PrintLookId) => void;
  printSavedInvoice: (invoiceId: string, mode?: "original" | "net") => void;
  printPrices: (productIds: string[], note: string) => void;
  printCustomers: (
    customerIds: string[],
    note: string,
    cols: {
      includeInvDate: boolean;
      includeInvVal: boolean;
      includePayStatus: boolean;
      includePendingList: boolean;
    },
  ) => void;
  catalogLocked: () => void;
};

const InvoiceContext = createContext<InvoiceContextValue | null>(null);

function readInvoices() {
  return asArray<Invoice>(CloudStore.get("bb_invoices", []));
}
function readCustomers() {
  return asArray<Customer>(CloudStore.get("bb_customers", []));
}
function readPending() {
  return asArray<PendingInvoice>(CloudStore.get("bb_pending_invoices", []));
}
function readBundles() {
  return asArray<InvoiceBundle>(CloudStore.get("bb_invoice_bundles", []));
}
function readPayments() {
  return asRecord<InvoicePayments>(CloudStore.get("bb_invoice_payments", {}));
}
function readPresets() {
  return asArray<ColorPreset>(CloudStore.get("bb_color_presets", []));
}

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const invoices = asArray<Invoice>(useCloudKey("bb_invoices"));
  const customers = asArray<Customer>(useCloudKey("bb_customers"));
  const products = asArray<Product>(useCloudKey("bb_products"));
  const categories = asArray<Category>(useCloudKey("bb_categories"));
  const pending = asArray<PendingInvoice>(useCloudKey("bb_pending_invoices"));
  const bundles = asArray<InvoiceBundle>(useCloudKey("bb_invoice_bundles"));
  const returns = asArray<ReturnRecord>(useCloudKey("bb_returns"));
  const payments = asRecord<InvoicePayments>(useCloudKey("bb_invoice_payments"));
  const presets = asArray<ColorPreset>(useCloudKey("bb_color_presets"));
  const activePresetId = String(useCloudKey("bb_active_color_preset_id") || "");
  const fitOne = Boolean(useCloudKey("bb_print_fit_one"));
  const printLook = parsePrintLookId(
    useCloudKey("bb_inv_print_preset_id"),
    presets,
    activePresetId,
  );
  const pageSize = parsePageSize(useCloudKey("bb_inv_print_page_size"));
  const margins = parseMargins(useCloudKey("bb_inv_print_margins"));

  const [draft, setDraftState] = useState<InvoiceDraft>(() => {
    const snap = parseInv2(CloudStore.get("bb_inv2", {}));
    return {
      ...emptyDraft(nextInvoiceNumber(readInvoices(), null)),
      items: snap.hasSnapshot ? snap.items : [],
    };
  });
  const [theme, setThemeState] = useState<InvoiceTheme>(
    () => parseInv2(CloudStore.get("bb_inv2", {})).C,
  );
  const [strings, setStringsState] = useState<InvoiceStrings>(
    () => parseInv2(CloudStore.get("bb_inv2", {})).S,
  );

  const persistInv2 = useCallback(
    (nextTheme = theme, nextStrings = strings, nextItems = draft.items) => {
      const prev = asRecord<Record<string, unknown>>(CloudStore.get("bb_inv2", {}));
      void writeInvoiceKey("bb_inv2", {
        ...prev,
        C: nextTheme,
        S: { ...nextStrings, discount: draft.discount },
        items: nextItems,
      });
    },
    [theme, strings, draft.items, draft.discount],
  );

  const setDraft = useCallback((patch: Partial<InvoiceDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const catalogLocked = useCallback(() => {
    toast.push("أضف التصنيفات والمنتجات من المالية والمخزون", "warn");
  }, [toast]);

  const activeProducts = useMemo(
    () => products.filter((p) => !isInactiveProduct(p)),
    [products],
  );
  const queue = useMemo(() => visiblePendingQueue(pending), [pending]);

  const value = useMemo<InvoiceContextValue>(() => {
    function setLine(index: number, patch: Partial<InvoiceLine>) {
      setDraftState((prev) => ({
        ...prev,
        items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
      }));
    }
    function removeLine(index: number) {
      setDraftState((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
    function addManualLine() {
      setDraftState((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            productId: null,
            name: "",
            packType: "",
            weight: "",
            categoryId: null,
            qty: 1,
            price: 0,
          },
        ],
      }));
    }
    function addProduct(id: string) {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      if (isInactiveProduct(p)) {
        toast.push("المنتج غير نشط — فعّله من كتالوج المالية", "warn");
        return;
      }
      setDraftState((prev) => ({
        ...prev,
        items: [...prev.items, cloneLineFromProduct(p)],
      }));
      toast.push(p.name.split("·")[0].trim(), "ok");
    }
    function addProducts(list: Product[]) {
      const usable = list.filter((p) => p && !isInactiveProduct(p));
      if (!usable.length) return 0;
      setDraftState((prev) => ({
        ...prev,
        items: [...prev.items, ...usable.map(cloneLineFromProduct)],
      }));
      return usable.length;
    }
    function newInvoice() {
      if (!window.confirm("إنشاء فاتورة جديدة؟\nستُفقد البيانات غير المحفوظة.")) return;
      setDraftState(emptyDraft(nextInvoiceNumber(readInvoices(), null)));
      toast.push("فاتورة جديدة", "ok");
    }
    async function saveInvoice() {
      const current = draft;
      if (current.pendingId && !current.customerId) {
        toast.push("عيّن العميل أولاً قبل إصدار المسودة", "warn");
        return false;
      }
      if (!current.customerName && current.items.length === 0) {
        toast.push("الفاتورة فارغة!", "warn");
        return false;
      }
      const totals = calcTotals(current.items, current.discount);
      const arr = readInvoices();
      const existing = current.loadedInvoiceId
        ? arr.find((i) => i.id === current.loadedInvoiceId)
        : undefined;
      const inv: Invoice = {
        ...(existing || {}),
        id: current.loadedInvoiceId || genId("inv"),
        customerId: current.customerId,
        invoiceNumber: current.invoiceNumber,
        date: current.date,
        customerName: current.customerName,
        customerPhone: current.customerPhone,
        items: current.items.map((it) => normalizeLine(it)),
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountAmount: totals.discountAmount,
        total: totals.total,
        notes: current.notes,
        savedAt: new Date().toISOString(),
      };
      const idx = arr.findIndex((i) => i.id === inv.id);
      let next = arr;
      if (idx >= 0) next = arr.map((i, iAt) => (iAt === idx ? inv : i));
      else next = [inv, ...arr].slice(0, INVOICE_HISTORY_MAX);
      await writeInvoiceKey("bb_invoices", next);
      if (current.pendingId) {
        void writeInvoiceKey(
          "bb_pending_invoices",
          readPending().map((p) =>
            p.id === current.pendingId
              ? {
                  ...p,
                  status: "completed",
                  completedInvoiceId: inv.id,
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        );
      }
      setDraftState((prev) => ({
        ...prev,
        loadedInvoiceId: inv.id,
        pendingId: current.pendingId ? null : prev.pendingId,
      }));
      persistInv2(theme, strings, current.items);
      toast.push(
        current.pendingId
          ? `تم حفظ الفاتورة ${inv.invoiceNumber} — أُغلقت المسودة`
          : `تم حفظ الفاتورة ${inv.invoiceNumber}`,
        "ok",
      );
      return inv.id;
    }
    function loadInvoice(id: string) {
      const inv = readInvoices().find((i) => i.id === id);
      if (!inv) {
        toast.push("لم يتم إيجاد الفاتورة", "warn");
        return;
      }
      setDraftState(draftFromInvoice(inv));
      toast.push(`تم تحميل الفاتورة ${inv.invoiceNumber}`, "ok");
    }
    function duplicateInvoice(id: string) {
      const arr = readInvoices();
      const inv = arr.find((i) => i.id === id);
      if (!inv) return;
      const copy: Invoice = {
        ...JSON.parse(JSON.stringify(inv)),
        id: genId("inv"),
        invoiceNumber: nextGlobalInvoiceNumber(arr),
        savedAt: new Date().toISOString(),
        date: todayISO(),
      };
      void writeInvoiceKey("bb_invoices", [copy, ...arr]);
      toast.push(`تم نسخ الفاتورة → ${copy.invoiceNumber}`, "ok");
    }
    function removeInvoice(id: string) {
      void writeInvoiceKey(
        "bb_invoices",
        readInvoices().filter((i) => i.id !== id),
      );
      setDraftState((prev) =>
        prev.loadedInvoiceId === id ? { ...prev, loadedInvoiceId: null } : prev,
      );
      toast.push("تم حذف الفاتورة", "ok");
    }
    function selectCustomer(id: string) {
      const c = readCustomers().find((x) => x.id === id);
      if (!c) return { showHistory: false };
      const count = readInvoices().filter((inv) => inv.customerId === id).length;
      setDraftState((prev) => {
        if (prev.pendingId) {
          const arr = readPending();
          void writeInvoiceKey(
            "bb_pending_invoices",
            arr.map((p) =>
              p.id === prev.pendingId
                ? {
                    ...p,
                    customerId: id,
                    customerName: c.name,
                    customerPhone: c.phone || "",
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          );
          return {
            ...prev,
            customerId: id,
            customerName: c.name,
            customerPhone: c.phone || "",
            invoiceNumber: nextInvoiceNumber(readInvoices(), id),
            date: todayISO(),
          };
        }
        return {
          ...emptyDraft(nextInvoiceNumber(readInvoices(), id)),
          customerId: id,
          customerName: c.name,
          customerPhone: c.phone || "",
        };
      });
      return { showHistory: count > 0 };
    }
    function saveCustomer(
      data: Omit<Customer, "id" | "createdAt"> & { id?: string },
    ) {
      const name = data.name.trim();
      if (!name) {
        toast.push("الاسم مطلوب", "warn");
        return null;
      }
      const arr = readCustomers();
      if (data.id) {
        const next = arr.map((c) => (c.id === data.id ? { ...c, ...data, name } : c));
        void writeInvoiceKey("bb_customers", next);
        const updated = next.find((c) => c.id === data.id)!;
        toast.push("تم حفظ العميل", "ok");
        return updated;
      }
      const c: Customer = {
        id: genId("c"),
        name,
        phone: data.phone || "",
        address: data.address || "",
        notes: data.notes || "",
        createdAt: new Date().toISOString(),
      };
      void writeInvoiceKey("bb_customers", [c, ...arr]);
      toast.push("تم إضافة العميل", "ok");
      return c;
    }
    function removeCustomer(id: string) {
      void writeInvoiceKey(
        "bb_customers",
        readCustomers().filter((c) => c.id !== id),
      );
      setDraftState((prev) =>
        prev.customerId === id
          ? { ...prev, customerId: null, customerName: "", customerPhone: "" }
          : prev,
      );
    }
    function loadPending(id: string) {
      const pend = readPending().find((p) => p.id === id);
      if (!pend || pend.status === "completed") {
        toast.push("المسودة غير موجودة أو أُصدرت مسبقاً", "warn");
        return;
      }
      setDraftState((prev) => {
        if (prev.items.length && !window.confirm("تحميل المسودة؟ ستُستبدل الأصناف الحالية.")) {
          return prev;
        }
        return {
          loadedInvoiceId: null,
          pendingId: id,
          customerId: pend.customerId || null,
          customerName: pend.customerName || "",
          customerPhone: pend.customerPhone || "",
          invoiceNumber: nextInvoiceNumber(readInvoices(), pend.customerId || null),
          date: todayISO(),
          notes: pend.notes || "",
          discount: 0,
          items: cloneLines(pend.items),
        };
      });
      toast.push(`${pend.title || "مسودة"} — عيّن العميل ثم احفظ`, "ok");
    }
    async function completePending() {
      if (!draft.pendingId) {
        toast.push("لا توجد مسودة محمّلة", "warn");
        return false;
      }
      return (await saveInvoice()) !== false;
    }
    function removePending(id: string) {
      void writeInvoiceKey(
        "bb_pending_invoices",
        readPending().filter((p) => p.id !== id),
      );
      setDraftState((prev) => (prev.pendingId === id ? { ...prev, pendingId: null } : prev));
    }
    function saveBundle(name: string) {
      const trimmed = name.trim();
      if (!trimmed) {
        toast.push("أدخل اسم المجموعة", "warn");
        return;
      }
      const cloned = cloneLines(draft.items);
      if (!cloned.length) {
        toast.push("لا توجد أصناف صالحة للحفظ", "warn");
        return;
      }
      const arr = readBundles();
      const existing = arr.find((b) => b.name === trimmed);
      if (existing) {
        if (!window.confirm(`مجموعة «${trimmed}» موجودة. استبدالها؟`)) return;
        void writeInvoiceKey(
          "bb_invoice_bundles",
          arr.map((b) =>
            b.id === existing.id
              ? { ...b, items: cloned, updatedAt: new Date().toISOString() }
              : b,
          ),
        );
        toast.push(`تم تحديث المجموعة · ${cloned.length} صنف`, "ok");
        return;
      }
      const bundle: InvoiceBundle = {
        id: genId("bundle"),
        name: trimmed,
        items: cloned,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      void writeInvoiceKey("bb_invoice_bundles", [bundle, ...arr]);
      toast.push(`تم حفظ المجموعة «${trimmed}» · ${cloned.length} صنف`, "ok");
    }
    function applyBundle(id: string, replace: boolean) {
      const b = readBundles().find((x) => x.id === id);
      if (!b) return;
      const cloned = cloneLines(b.items);
      if (!cloned.length) {
        toast.push("المجموعة فارغة", "warn");
        return;
      }
      setDraftState((prev) => {
        if (replace && prev.items.length && !window.confirm(`استبدال أصناف الفاتورة الحالية بـ «${b.name}»؟`)) {
          return prev;
        }
        return { ...prev, items: replace ? cloned : prev.items.concat(cloned) };
      });
      toast.push(`${replace ? "استُبدلت" : "أُضيفت"} · ${cloned.length} صنف من «${b.name}»`, "ok");
    }
    function removeBundle(id: string) {
      void writeInvoiceKey(
        "bb_invoice_bundles",
        readBundles().filter((b) => b.id !== id),
      );
    }
    function multiCopyBundle(bundleId: string, customerIds: string[]) {
      const b = readBundles().find((x) => x.id === bundleId);
      if (!b) return;
      const cloned = cloneLines(b.items);
      if (!cloned.length) {
        toast.push("المجموعة فارغة", "warn");
        return;
      }
      if (!customerIds.length) {
        toast.push("حدّد عميلاً واحداً على الأقل", "warn");
        return;
      }
      let arr = readInvoices();
      let created = 0;
      customerIds.forEach((cid) => {
        const c = readCustomers().find((x) => x.id === cid);
        if (!c) return;
        const totals = calcTotals(cloned, 0);
        const inv: Invoice = {
          id: genId("inv"),
          customerId: cid,
          invoiceNumber: nextInvoiceNumber(arr, cid),
          date: todayISO(),
          customerName: c.name || "",
          customerPhone: c.phone || "",
          items: JSON.parse(JSON.stringify(cloned)),
          subtotal: totals.subtotal,
          discount: 0,
          discountAmount: 0,
          total: totals.total,
          notes: `من مجموعة: ${b.name || ""}`,
          savedAt: new Date().toISOString(),
          fromBundleId: b.id,
        };
        arr = [inv, ...arr];
        created += 1;
      });
      void writeInvoiceKey("bb_invoices", arr);
      toast.push(`تم إنشاء ${created} فاتورة من «${b.name}»`, "ok");
    }
    function setPayment(invoiceId: string, status: "paid" | "pending") {
      const next = {
        ...readPayments(),
        [invoiceId]: { status, updatedAt: todayISO() },
      };
      void writeInvoiceKey("bb_invoice_payments", next);
    }
    function applyPreset(id: string) {
      const p = readPresets().find((x) => x.id === id);
      if (!p) return;
      const next = themeFromPreset(p);
      setThemeState(next);
      void writeInvoiceKey("bb_active_color_preset_id", id);
      persistInv2(next, strings, draft.items);
      toast.push(`المظهر: ${p.name}`, "ok");
    }
    function savePreset(name: string) {
      const trimmed = name.trim();
      if (!trimmed) {
        toast.push("أدخل اسم البريسيت", "warn");
        return;
      }
      const preset: ColorPreset = { id: `cp_${Date.now()}`, name: trimmed, ...theme };
      void writeInvoiceKey("bb_color_presets", [...readPresets(), preset]);
      void writeInvoiceKey("bb_active_color_preset_id", preset.id);
      toast.push("حُفظ المظهر", "ok");
    }
    function removePreset(id: string) {
      void writeInvoiceKey(
        "bb_color_presets",
        readPresets().filter((p) => p.id !== id),
      );
      if (activePresetId === id) void writeInvoiceKey("bb_active_color_preset_id", "");
    }
    function persistLook() {
      persistInv2();
      void writeInvoiceKey("bb_inv_print_preset_id", printLook);
      toast.push("تم حفظ إعدادات الطباعة", "ok");
    }
    function printInvoice(mode: "original" | "net", look?: PrintLookId) {
      if (mode === "net") {
        const inv = draft.loadedInvoiceId
          ? readInvoices().find((i) => i.id === draft.loadedInvoiceId)
          : null;
        if (!inv) {
          toast.push("حمّل فاتورة بها مرتجع أولاً", "warn");
          return;
        }
      }
      const resolved = look ?? printLook;
      void writeInvoiceKey("bb_inv_print_preset_id", resolved);
      const ok = printInvoiceDocument({
        draft,
        theme: resolvePrintTheme(resolved, theme, readPresets()),
        strings,
        mode,
        returns,
        invoices,
        fitOne,
        pageSize,
        margins,
      });
      if (!ok) toast.push("اسمح بالنوافذ المنبثقة للطباعة", "warn");
    }
    function printSavedInvoice(
      invoiceId: string,
      mode: "original" | "net" = "original",
    ) {
      const inv = readInvoices().find((i) => i.id === invoiceId);
      if (!inv) {
        toast.push("لم يتم إيجاد الفاتورة", "warn");
        return;
      }
      const ok = printInvoiceDocument({
        draft: draftFromInvoice(inv),
        theme: resolvePrintTheme(printLook, theme, readPresets()),
        strings,
        mode,
        returns,
        invoices,
        fitOne,
        pageSize,
        margins,
      });
      if (!ok) toast.push("اسمح بالنوافذ المنبثقة للطباعة", "warn");
    }
    function printPrices(productIds: string[], note: string) {
      const selected = activeProducts.filter((p) => productIds.includes(p.id));
      if (!selected.length) {
        toast.push("حدّد منتجاً واحداً على الأقل", "warn");
        return;
      }
      const ok = printPriceList({
        products: selected,
        categories,
        strings,
        note,
      });
      if (!ok) toast.push("اسمح بالنوافذ المنبثقة للطباعة", "warn");
    }
    function printCustomers(
      customerIds: string[],
      note: string,
      cols: {
        includeInvDate: boolean;
        includeInvVal: boolean;
        includePayStatus: boolean;
        includePendingList: boolean;
      },
    ) {
      const selected = customers.filter((c) => customerIds.includes(c.id));
      if (!selected.length) {
        toast.push("حدّد عميلاً واحداً على الأقل", "warn");
        return;
      }
      const ok = printCustomerList({
        customers: selected,
        invoices,
        returns,
        payments,
        strings,
        note,
        ...cols,
      });
      if (!ok) toast.push("اسمح بالنوافذ المنبثقة للطباعة", "warn");
    }

    return {
      invoices,
      customers,
      products,
      activeProducts,
      categories,
      pending,
      queue,
      bundles,
      returns,
      payments,
      presets,
      activePresetId,
      fitOne,
      draft,
      theme,
      strings,
      setDraft,
      setLine,
      removeLine,
      addManualLine,
      addProduct,
      addProducts,
      newInvoice,
      saveInvoice,
      loadInvoice,
      duplicateInvoice,
      removeInvoice,
      selectCustomer,
      saveCustomer,
      removeCustomer,
      loadPending,
      completePending,
      removePending,
      saveBundle,
      applyBundle,
      removeBundle,
      multiCopyBundle,
      setPayment,
      applyPreset,
      savePreset,
      removePreset,
      setTheme: (patch) => setThemeState((prev) => ({ ...prev, ...patch })),
      setStrings: (patch) => setStringsState((prev) => ({ ...prev, ...patch })),
      persistLook,
      setFitOne: (on) => {
        void writeInvoiceKey("bb_print_fit_one", on);
      },
      pageSize,
      setPageSize: (size: PrintPageSize) => {
        void writeInvoiceKey("bb_inv_print_page_size", size);
      },
      margins,
      setMargins: (patch: Partial<PrintMargins>) => {
        void writeInvoiceKey("bb_inv_print_margins", {
          ...DEFAULT_PRINT_MARGINS,
          ...margins,
          ...patch,
        });
      },
      printLook,
      setPrintLook: (look: PrintLookId) => {
        void writeInvoiceKey("bb_inv_print_preset_id", look);
      },
      printInvoice,
      printSavedInvoice,
      printPrices,
      printCustomers,
      catalogLocked,
    };
  }, [
    invoices,
    customers,
    products,
    activeProducts,
    categories,
    pending,
    queue,
    bundles,
    returns,
    payments,
    presets,
    activePresetId,
    fitOne,
    pageSize,
    margins,
    printLook,
    draft,
    theme,
    strings,
    persistInv2,
    setDraft,
    catalogLocked,
    toast,
  ]);

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
}

export function useInvoiceApp() {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error("useInvoiceApp must be used inside InvoiceProvider");
  return ctx;
}
