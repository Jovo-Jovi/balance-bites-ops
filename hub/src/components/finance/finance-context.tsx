"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { CloudStore } from "@/lib/cloud-store";
import { useCloudKey } from "@/hooks/use-cloud-key";
import { useToast } from "@/components/toast";
import type { LabelTemplate } from "@/lib/design/types";
import {
  asArray,
  asRecord,
  emptyStockItem,
  financeId,
  fmt,
  num,
  roundQty,
  todayISO,
  type InvItemType,
} from "@/lib/finance/helpers";
import { adjSupplier } from "@/lib/finance/helpers";
import {
  type BackupMeta,
  type CustomerPayment,
  type FinancePending,
  type Investor,
  type InvestorTarget,
  type OpCost,
  type PrepLine,
  type ProductionRun,
  type Purchase,
  type Recipe,
  type StockItem,
} from "@/lib/finance/types";
import { writeFinanceKey, commitPrepInvoice } from "@/lib/finance/write";
import {
  buildLedgerMap,
  computeItemLedger,
  displayStock,
} from "@/lib/finance/ledger";
import { calcPrep, calcPrepAggregate } from "@/lib/finance/recipes";
import {
  alertSuppressed,
  buildMonthlyProfit,
  buildProductSummary,
  stockStatus,
} from "@/lib/finance/analytics";
import {
  buildLinkedState,
  buildMoneyCycleSummary,
  buildStockValueReport,
} from "@/lib/finance/reports";
import {
  buildCustomerLedger,
  invoicesToMarkPaid,
  invCustKey,
  settleAmount,
} from "@/lib/finance/customer-ledger";
import {
  draftToInvoice,
  emptyInvoiceDraft,
  findDraftByCustomer,
  getAwaitingProduction,
  getInvoiceDrafts,
  getPrepOrders,
  isInvoiceDraft,
  makePrepOrder,
  mergeDraftItem,
  prepLinesToItems,
} from "@/lib/finance/prep";
import { ensureStickerInProductRecipe, removeStickerFromRecipes } from "@/lib/finance/stickers";
import {
  backupFileName,
  collectBackupSnapshot,
  restoreBackupSnapshot,
} from "@/lib/finance/backups";
import { normalizeDisposition } from "@/lib/finance/returns-live";
import { nextInvoiceNumber, draftFromInvoice } from "@/lib/invoices/helpers";
import { printInvoiceDocument, printInvoiceDocuments } from "@/lib/invoices/print";
import { parseInv2, parsePrintLookId, resolvePrintTheme } from "@/lib/invoices/look";
import { parseMargins, parsePageSize } from "@/lib/invoices/print-layout";
import type {
  Category,
  ColorPreset,
  Customer,
  Invoice,
  InvoiceLine,
  InvoicePayments,
  Product,
  ReturnRecord,
} from "@/lib/invoices/types";

export type ItemKind = InvItemType;

type FinanceContextValue = {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  categories: Category[];
  payments: InvoicePayments;
  customerPayments: CustomerPayment[];
  pending: FinancePending[];
  invoiceDrafts: FinancePending[];
  prepOrders: FinancePending[];
  awaitingProduction: FinancePending[];
  returns: ReturnRecord[];
  materials: StockItem[];
  packages: StockItem[];
  stickers: StockItem[];
  recipes: Recipe[];
  purchases: Purchase[];
  production: ProductionRun[];
  opCosts: OpCost[];
  investors: Investor[];
  investorTarget: InvestorTarget;
  templates: LabelTemplate[];
  prepLines: PrepLine[];
  prepProdMode: "all" | "net";
  backupIndex: BackupMeta[];
  lastCustomerId: string;
  setLastCustomer: (id: string) => void;
  findItem: (type: string, id: string) => StockItem | null;
  qtyOf: (type: string, id: string, item?: StockItem | null) => number;
  ledger: ReturnType<typeof buildLedgerMap>;
  sales: ReturnType<typeof buildMoneyCycleSummary>;
  stockReport: ReturnType<typeof buildStockValueReport>;
  linked: ReturnType<typeof buildLinkedState>;
  monthly: ReturnType<typeof buildMonthlyProfit>;
  customerLedger: ReturnType<typeof buildCustomerLedger>;
  productSummary: ReturnType<typeof buildProductSummary>;
  saveItem: (
    type: ItemKind,
    data: Partial<StockItem> & { name: string },
    truthStock: number,
    openedStock: number,
  ) => Promise<string | null>;
  removeItem: (type: ItemKind, id: string) => void;
  applyTruthStock: (type: ItemKind, id: string, truthStock: number) => Promise<boolean>;
  applyProductStock: (productId: string, recipeId: string, truthOnHand: number) => Promise<boolean>;
  saveRecipe: (data: Recipe) => void;
  removeRecipe: (id: string) => void;
  savePurchase: (data: Omit<Purchase, "id" | "totalCost"> & { id?: string }) => Purchase | null;
  removePurchase: (id: string) => void;
  saveProduct: (data: Omit<Product, "id"> & { id?: string }) => void;
  removeProduct: (id: string) => void;
  saveCategory: (data: Omit<Category, "id"> & { id?: string }) => void;
  removeCategory: (id: string) => void;
  saveReturn: (data: Omit<ReturnRecord, "id"> & { id?: string }) => void;
  removeReturn: (id: string) => void;
  setPayment: (invoiceId: string, status: "paid" | "pending") => void;
  toggleInvoicePaid: (invoiceId: string) => { ok: boolean; msg?: string };
  applyCustomerPayment: (data: {
    customerKey: string;
    mode: string;
    amount?: number;
    date?: string;
    notes?: string;
    invoiceId?: string;
  }) => { ok: boolean; msg?: string; amount?: number; remaining?: number };
  removeCustomerPayment: (id: string) => void;
  assignInvestorAmounts: (amounts: Record<string, number>) => void;
  saveOpCost: (data: Omit<OpCost, "id"> & { id?: string }) => void;
  removeOpCost: (id: string) => void;
  saveInvestor: (data: Omit<Investor, "id"> & { id?: string }) => void;
  removeInvestor: (id: string) => void;
  saveInvestorTarget: (patch: Partial<InvestorTarget>) => void;
  setPrepLines: (lines: PrepLine[]) => void;
  setPrepProdMode: (mode: "all" | "net") => void;
  addToCustomerDraft: (customer: Customer, item: InvoiceLine) => void;
  updateDraft: (id: string, patch: Partial<FinancePending>) => void;
  removePending: (id: string) => void;
  approveDraft: (id: string) => Promise<boolean>;
  sendBoardToProduction: (title?: string) => void;
  sendOrderToProduction: (id: string) => void;
  approveProduction: (id: string) => Promise<boolean>;
  addProductionRun: (recipeId: string, units: number, notes: string, date?: string) => void;
  prepareLabelOpen: (stickerId: string) => void;
  printSavedInvoice: (invoiceId: string, mode?: "original" | "net") => void;
  printSavedInvoices: (invoiceIds: string[], mode?: "original" | "net") => void;
  createNamedBackup: (label: string) => Promise<boolean>;
  restoreNamedBackup: (id: string, load: (id: string) => Promise<unknown>) => Promise<boolean>;
  itemStatus: (item: StockItem, type: ItemKind) => "ok" | "low" | "crit";
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function readArr<T>(key: Parameters<typeof CloudStore.get>[0]) {
  return asArray<T>(CloudStore.get(key, []));
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const invoices = asArray<Invoice>(useCloudKey("bb_invoices"));
  const customers = asArray<Customer>(useCloudKey("bb_customers"));
  const products = asArray<Product>(useCloudKey("bb_products"));
  const categories = asArray<Category>(useCloudKey("bb_categories"));
  const payments = asRecord<InvoicePayments>(useCloudKey("bb_invoice_payments"));
  const customerPayments = asArray<CustomerPayment>(useCloudKey("bb_customer_payments"));
  const pending = asArray<FinancePending>(useCloudKey("bb_pending_invoices"));
  const returns = asArray<ReturnRecord>(useCloudKey("bb_returns"));
  const materials = asArray<StockItem>(useCloudKey("bb_materials"));
  const packages = asArray<StockItem>(useCloudKey("bb_packages"));
  const stickers = asArray<StockItem>(useCloudKey("bb_stickers"));
  const recipes = asArray<Recipe>(useCloudKey("bb_recipes"));
  const purchases = asArray<Purchase>(useCloudKey("bb_purchases"));
  const production = asArray<ProductionRun>(useCloudKey("bb_production"));
  const opCosts = asArray<OpCost>(useCloudKey("bb_operation_costs"));
  const investors = asArray<Investor>(useCloudKey("bb_investors"));
  const investorTarget = (useCloudKey("bb_investor_target") || {
    needed: 0,
    split: "equal",
    projectStart: "",
  }) as InvestorTarget;
  const templates = asArray<LabelTemplate>(useCloudKey("bb_label_templates"));
  const prepLines = asArray<PrepLine>(useCloudKey("bb_prep_lines"));
  const prepProdMode = (String(useCloudKey("bb_prep_prod_mode") || "all") === "net" ? "net" : "all") as
    | "all"
    | "net";
  const backupIndex = asArray<BackupMeta>(useCloudKey("bb_backup_index"));
  const lastCustomerId = String(useCloudKey("bb_ret_last_customer") || "");
  const presets = asArray<ColorPreset>(useCloudKey("bb_color_presets"));
  const activePresetId = String(useCloudKey("bb_active_color_preset_id") || "");
  const printLook = parsePrintLookId(useCloudKey("bb_inv_print_preset_id"), presets, activePresetId);
  const fitOne = Boolean(useCloudKey("bb_print_fit_one"));
  const pageSize = parsePageSize(useCloudKey("bb_inv_print_page_size"));
  const margins = parseMargins(useCloudKey("bb_inv_print_margins"));

  const findItem = useCallback(
    (type: string, id: string) => {
      const list =
        type === "bb_materials" ? materials : type === "bb_packages" ? packages : stickers;
      return list.find((i) => i.id === id) || null;
    },
    [materials, packages, stickers],
  );

  const ledger = useMemo(
    () =>
      buildLedgerMap({
        purchases,
        invoices,
        recipes,
        production,
        returns,
        materials,
        packages,
        stickers,
      }),
    [purchases, invoices, recipes, production, returns, materials, packages, stickers],
  );

  const qtyOf = useCallback(
    (type: string, id: string, item?: StockItem | null) =>
      displayStock(ledger, type, id, item || findItem(type, id)),
    [ledger, findItem],
  );

  const sales = useMemo(
    () =>
      buildMoneyCycleSummary(invoices, purchases, opCosts, returns, payments, customerPayments),
    [invoices, purchases, opCosts, returns, payments, customerPayments],
  );

  const productSummary = useMemo(
    () =>
      buildProductSummary(
        invoices,
        recipes,
        production,
        returns,
        payments,
        customerPayments,
        findItem,
      ),
    [invoices, recipes, production, returns, payments, customerPayments, findItem],
  );

  const stockReport = useMemo(
    () =>
      buildStockValueReport({
        invoices,
        recipes,
        production,
        returns,
        payments,
        customerPayments,
        materials,
        packages,
        stickers,
        products,
        ledger,
        findItem,
      }),
    [
      invoices,
      recipes,
      production,
      returns,
      payments,
      customerPayments,
      materials,
      packages,
      stickers,
      products,
      ledger,
      findItem,
    ],
  );

  const linked = useMemo(
    () =>
      buildLinkedState({
        invoices,
        recipes,
        returns,
        payments,
        findItem,
        cycle: sales,
        stockReport,
        investors,
      }),
    [invoices, recipes, returns, payments, findItem, sales, stockReport, investors],
  );

  const monthly = useMemo(
    () => buildMonthlyProfit(invoices, recipes, returns, opCosts, payments, findItem),
    [invoices, recipes, returns, opCosts, payments, findItem],
  );

  const customerLedger = useMemo(
    () => buildCustomerLedger(invoices, returns, payments, customerPayments),
    [invoices, returns, payments, customerPayments],
  );

  const invoiceDrafts = useMemo(() => getInvoiceDrafts(pending), [pending]);
  const prepOrders = useMemo(() => getPrepOrders(pending), [pending]);
  const awaitingProduction = useMemo(() => getAwaitingProduction(pending), [pending]);

  const writeList = useCallback((type: ItemKind, next: StockItem[]) => {
    void writeFinanceKey(type, next);
  }, []);

  const currentList = useCallback(
    (type: ItemKind) => {
      if (type === "bb_materials") return readArr<StockItem>("bb_materials");
      if (type === "bb_packages") return readArr<StockItem>("bb_packages");
      return readArr<StockItem>("bb_stickers");
    },
    [],
  );

  function addRun(recipeId: string, unitsDelta: number, notes: string, date?: string) {
    const rec = readArr<Recipe>("bb_recipes").find((r) => r.id === recipeId);
    if (!rec) return null;
    const units = num(unitsDelta);
    if (Math.abs(units) < 0.0001) return null;
    const batch = Math.max(1, parseInt(String(rec.batchSize), 10) || 1);
    const ratio = units / batch;
    const deductions = (rec.ingredients || []).map((ing) => {
      const item = findItem(ing.itemType, ing.itemId);
      return {
        itemId: ing.itemId,
        itemType: ing.itemType,
        name: item?.name || "؟",
        qty: num(ing.qty) * ratio,
      };
    });
    const run: ProductionRun = {
      id: financeId("run"),
      date: date || todayISO(),
      recipeId,
      recipeName: rec.name,
      unitsProduced: units,
      notes: notes || "",
      deductions,
      isAdjustment: true,
    };
    void writeFinanceKey("bb_production", [run, ...readArr<ProductionRun>("bb_production")]);
    return run;
  }

  const syncItemCost = useCallback((pur: Purchase) => {
    const list = currentList(pur.itemType);
    const idx = list.findIndex((i) => i.id === pur.itemId);
    if (idx < 0) return;
    const item = list[idx];
    if (num(item.costPerUnit) === num(pur.costPerUnit)) return;
    const next = list.slice();
    next[idx] = { ...item, costPerUnit: num(pur.costPerUnit) };
    writeList(pur.itemType, next);
  }, [currentList, writeList]);

  const savePurchase = useCallback(
    (data: Omit<Purchase, "id" | "totalCost"> & { id?: string }) => {
      const qty = roundQty(data.qty);
      const cpu = num(data.costPerUnit);
      const pur: Purchase = {
        id: data.id || financeId("pur"),
        date: data.date || todayISO(),
        itemId: data.itemId,
        itemType: data.itemType,
        itemName: data.itemName || "",
        qty,
        costPerUnit: cpu,
        totalCost: qty * cpu,
        supplier: data.supplier || "",
        notes: data.notes || "",
      };
      const arr = readArr<Purchase>("bb_purchases");
      const idx = arr.findIndex((p) => p.id === pur.id);
      if (idx >= 0) arr[idx] = pur;
      else arr.unshift(pur);
      void writeFinanceKey("bb_purchases", arr);
      if (!adjSupplier(pur.supplier) || Math.abs(qty) > 0.0001) {
        syncItemCost(pur);
      }
      return pur;
    },
    [syncItemCost],
  );

  const applyTruthStock = useCallback(
    async (type: ItemKind, id: string, truthStock: number) => {
      const item = currentList(type).find((i) => i.id === id);
      if (!item) return false;
      const truth = roundQty(truthStock);
      const led = computeItemLedger({
        itemType: type,
        itemId: id,
        purchases: readArr<Purchase>("bb_purchases"),
        invoices: readArr<Invoice>("bb_invoices"),
        recipes: readArr<Recipe>("bb_recipes"),
        production: readArr<ProductionRun>("bb_production"),
        returns: readArr<ReturnRecord>("bb_returns"),
      });
      const delta = roundQty(truth - led.balance);
      if (Math.abs(delta) > 0.0001) {
        savePurchase({
          itemType: type,
          itemId: id,
          itemName: item.name,
          qty: delta,
          costPerUnit: num(item.costPerUnit),
          supplier: "تسوية جرد",
          date: todayISO(),
          notes: `تعديل مخزون يدوي: ${led.balance} → ${truth}`,
        });
      }
      const next = currentList(type).map((i) => (i.id === id ? { ...i, currentStock: truth } : i));
      writeList(type, next);
      return true;
    },
    [currentList, savePurchase, writeList],
  );

  const saveItem = useCallback(
    async (
      type: ItemKind,
      data: Partial<StockItem> & { name: string },
      truthStock: number,
      openedStock: number,
    ) => {
      const name = data.name.trim();
      if (!name) {
        toast.push("الاسم مطلوب", "warn");
        return null;
      }
      let saved = emptyStockItem(type === "bb_stickers" ? "stk" : type === "bb_packages" ? "pkg" : "mat", {
        ...data,
        name,
        id: data.id,
      });
      if (type === "bb_stickers" && saved.templateKey) {
        const tmpl = templates.find((t) => t.id === saved.templateKey);
        if (tmpl?.name) saved = { ...saved, name: tmpl.name };
      }
      const list = currentList(type);
      const stockTouched = Math.abs(roundQty(truthStock) - roundQty(openedStock)) > 0.0001;
      if (data.id) {
        const next = list.map((i) => (i.id === data.id ? { ...i, ...saved, id: data.id } : i));
        writeList(type, next);
        saved = next.find((i) => i.id === data.id) || saved;
        if (stockTouched) await applyTruthStock(type, data.id, truthStock);
        toast.push("تم التحديث", "ok");
      } else {
        saved = { ...saved, currentStock: 0 };
        writeList(type, [saved, ...list]);
        if (Math.abs(roundQty(truthStock)) > 0.0001) {
          savePurchase({
            itemType: type,
            itemId: saved.id,
            itemName: name,
            qty: roundQty(truthStock),
            costPerUnit: num(saved.costPerUnit),
            supplier: "رصيد افتتاحي",
            date: todayISO(),
            notes: "مخزون أول المدة — عد يدوي",
          });
        }
        if (stockTouched) await applyTruthStock(type, saved.id, truthStock);
        toast.push(`تم الإضافة: ${name}`, "ok");
      }
      if (type === "bb_stickers") {
        const linkedTo = saved.productId || saved.recipeId;
        if (linkedTo) {
          const patched = ensureStickerInProductRecipe(saved, readArr<Recipe>("bb_recipes"));
          if (patched) {
            void writeFinanceKey("bb_recipes", patched.recipes);
            if (patched.sticker.recipeId !== saved.recipeId || patched.sticker.productId !== saved.productId) {
              writeList(type, currentList(type).map((i) => (i.id === saved.id ? patched.sticker : i)));
            }
            toast.push(`الملصق في وصفة «${patched.recipes.find((r) => r.id === patched.sticker.recipeId)?.name || ""}»`, "ok");
          } else {
            toast.push("لا توجد وصفة للمنتج — أنشئ وصفة واربطها أولاً", "warn");
          }
        }
      }
      return saved.id;
    },
    [applyTruthStock, currentList, savePurchase, templates, toast, writeList],
  );

  const removeItem = useCallback(
    (type: ItemKind, id: string) => {
      writeList(
        type,
        currentList(type).filter((i) => i.id !== id),
      );
      if (type === "bb_stickers") {
        void writeFinanceKey("bb_recipes", removeStickerFromRecipes(id, readArr<Recipe>("bb_recipes")));
      }
      toast.push("حُذف الصنف", "ok");
    },
    [currentList, toast, writeList],
  );

  const applyProductStock = useCallback(
    async (productId: string, recipeId: string, truthOnHand: number) => {
      const rec = recipeId
        ? readArr<Recipe>("bb_recipes").find((r) => r.id === recipeId)
        : readArr<Recipe>("bb_recipes").find((r) => r.productId === productId);
      if (!rec) {
        toast.push("لا توجد وصفة — أضف وصفة مربوطة بالمنتج", "warn");
        return false;
      }
      const rows = buildProductSummary(
        readArr<Invoice>("bb_invoices"),
        readArr<Recipe>("bb_recipes"),
        readArr<ProductionRun>("bb_production"),
        readArr<ReturnRecord>("bb_returns"),
        asRecord<InvoicePayments>(CloudStore.get("bb_invoice_payments", {})),
        readArr<CustomerPayment>("bb_customer_payments"),
        (type, id) => currentList(type as ItemKind).find((i) => i.id === id) || null,
      );
      const row = rows.find((r) => r.productId === productId);
      if (!row) {
        toast.push("المنتج غير موجود في الفواتير/الوصفات", "warn");
        return false;
      }
      const current = row.onHand;
      const delta = num(truthOnHand) - current;
      if (Math.abs(delta) < 0.0001) return true;
      const prep = calcPrep(rec, Math.abs(delta), (t, id) => findItem(t, id), ledger);
      addRun(rec.id, delta, `مخزون يدوي · ${row.name}: ${current} → ${truthOnHand}`);
      prep.lines.forEach((l) => {
        const ing = findItem(l.type, l.itemId);
        const cpu = ing ? num(ing.costPerUnit) : 0;
        const led = computeItemLedger({
          itemType: l.type as ItemKind,
          itemId: l.itemId,
          purchases: readArr<Purchase>("bb_purchases"),
          invoices: readArr<Invoice>("bb_invoices"),
          recipes: readArr<Recipe>("bb_recipes"),
          production: readArr<ProductionRun>("bb_production"),
          returns: readArr<ReturnRecord>("bb_returns"),
        });
        const qtyAdj = delta > 0 ? -l.needed : l.needed;
        savePurchase({
          itemType: l.type as ItemKind,
          itemId: l.itemId,
          itemName: l.name,
          qty: qtyAdj,
          costPerUnit: cpu,
          supplier: "تسوية جرد",
          date: todayISO(),
          notes: `استخدام إنتاج · ${row.name} · دفتر ${led.balance}`,
        });
      });
      toast.push("تم تحديث مخزون المنتج", "ok");
      return true;
    },
    [findItem, ledger, savePurchase, toast],
  );

  const saveRecipe = useCallback((data: Recipe) => {
    const arr = readArr<Recipe>("bb_recipes");
    const rec: Recipe = {
      ...data,
      id: data.id || financeId("rec"),
      batchSize: Math.max(1, num(data.batchSize) || 1),
      ingredients: data.ingredients || [],
    };
    const idx = arr.findIndex((r) => r.id === rec.id);
    if (idx >= 0) arr[idx] = rec;
    else arr.unshift(rec);
    void writeFinanceKey("bb_recipes", arr);
    toast.push("حُفظت الوصفة", "ok");
  }, [toast]);

  const removeRecipe = useCallback((id: string) => {
    void writeFinanceKey(
      "bb_recipes",
      readArr<Recipe>("bb_recipes").filter((r) => r.id !== id),
    );
  }, []);

  const removePurchase = useCallback((id: string) => {
    void writeFinanceKey(
      "bb_purchases",
      readArr<Purchase>("bb_purchases").filter((p) => p.id !== id),
    );
  }, []);

  const saveProduct = useCallback((data: Omit<Product, "id"> & { id?: string }) => {
    const arr = readArr<Product>("bb_products");
    const rec: Product = {
      id: data.id || financeId("prd"),
      name: data.name,
      packType: data.packType || "",
      weight: data.weight || "",
      unitPrice: num(data.unitPrice),
      categoryId: data.categoryId || null,
      inactive: data.inactive,
      active: data.active,
    };
    const idx = arr.findIndex((p) => p.id === rec.id);
    if (idx >= 0) arr[idx] = rec;
    else arr.unshift(rec);
    void writeFinanceKey("bb_products", arr);
    toast.push("حُفظ المنتج", "ok");
  }, [toast]);

  const removeProduct = useCallback((id: string) => {
    void writeFinanceKey(
      "bb_products",
      readArr<Product>("bb_products").filter((p) => p.id !== id),
    );
  }, []);

  const saveCategory = useCallback((data: Omit<Category, "id"> & { id?: string }) => {
    const arr = readArr<Category>("bb_categories");
    const rec: Category = {
      id: data.id || financeId("cat"),
      name: data.name,
      color: data.color || "#c9a84c",
    };
    const idx = arr.findIndex((c) => c.id === rec.id);
    if (idx >= 0) arr[idx] = rec;
    else arr.push(rec);
    void writeFinanceKey("bb_categories", arr);
  }, []);

  const removeCategory = useCallback((id: string) => {
    void writeFinanceKey(
      "bb_categories",
      readArr<Category>("bb_categories").filter((c) => c.id !== id),
    );
  }, []);

  const saveReturn = useCallback((data: Omit<ReturnRecord, "id"> & { id?: string }) => {
    const items = (data.items || []).map((it) => ({
      ...it,
      qty: num(it.qty),
      price: num(it.price),
      lineTotal: num(it.lineTotal) || num(it.qty) * num(it.price),
      disposition: it.disposition === "expired" ? "expired" : "restock",
    }));
    const rec: ReturnRecord = {
      ...data,
      id: data.id || financeId("ret"),
      date: data.date || todayISO(),
      amount: num(data.amount) || items.reduce((s, it) => s + num(it.lineTotal), 0),
      items,
      source: data.source === "items" || (!data.invoiceId && data.source !== "invoice") ? "items" : "invoice",
      disposition: normalizeDisposition(items),
    };
    const arr = readArr<ReturnRecord>("bb_returns");
    const idx = arr.findIndex((r) => r.id === rec.id);
    if (idx >= 0) arr[idx] = rec;
    else arr.unshift(rec);
    void writeFinanceKey("bb_returns", arr);
    if (rec.customerId) void writeFinanceKey("bb_ret_last_customer", rec.customerId);
    toast.push("حُفظ المرتجع", "ok");
  }, [toast]);

  const removeReturn = useCallback((id: string) => {
    void writeFinanceKey(
      "bb_returns",
      readArr<ReturnRecord>("bb_returns").filter((r) => r.id !== id),
    );
  }, []);

  const setPayment = useCallback((invoiceId: string, status: "paid" | "pending") => {
    const all = asRecord<InvoicePayments>(CloudStore.get("bb_invoice_payments", {}));
    void writeFinanceKey("bb_invoice_payments", {
      ...all,
      [invoiceId]: { status, updatedAt: todayISO() },
    });
  }, []);

  const applyCustomerPayment = useCallback(
    (data: {
      customerKey: string;
      mode: string;
      amount?: number;
      date?: string;
      notes?: string;
      invoiceId?: string;
    }) => {
      const led = buildCustomerLedger(
        readArr<Invoice>("bb_invoices"),
        readArr<ReturnRecord>("bb_returns"),
        asRecord<InvoicePayments>(CloudStore.get("bb_invoice_payments", {})),
        readArr<CustomerPayment>("bb_customer_payments"),
      );
      const c = led.byCustomer[data.customerKey];
      if (!c) return { ok: false, msg: "العميل غير موجود" };
      let amount = num(data.amount);
      if (data.mode === "paid_all") amount = c.remaining;
      if (data.mode === "keep_last") {
        amount = settleAmount(c, "keep_last");
        if (amount <= 0.009) return { ok: false, msg: "فاتورة واحدة متبقية — استخدم «سدّد الكل» أو دفعة" };
      }
      if (!(amount > 0)) return { ok: false, msg: "المبلغ غير صحيح" };
      const rec: CustomerPayment = {
        id: financeId("cpay"),
        date: data.date || todayISO(),
        customerId: data.customerKey === "_none" ? "" : data.customerKey,
        customerName: c.name,
        amount,
        mode: data.mode || "amount",
        notes: data.notes || "",
        invoiceId: data.invoiceId || "",
        prevStatuses: c.invoices.map((row) => ({
          id: row.inv.id,
          status: payments[row.inv.id]?.status || "pending",
        })),
      };
      void writeFinanceKey("bb_customer_payments", [rec, ...readArr<CustomerPayment>("bb_customer_payments")]);
      const led2 = buildCustomerLedger(
        readArr<Invoice>("bb_invoices"),
        readArr<ReturnRecord>("bb_returns"),
        asRecord<InvoicePayments>(CloudStore.get("bb_invoice_payments", {})),
        readArr<CustomerPayment>("bb_customer_payments"),
      );
      const c2 = led2.byCustomer[data.customerKey];
      const remaining = c2?.remaining ?? Math.max(0, c.remaining - amount);
      if (c2) {
        const all = asRecord<InvoicePayments>(CloudStore.get("bb_invoice_payments", {}));
        const next = { ...all };
        invoicesToMarkPaid(c2).forEach((id) => {
          next[id] = { status: "paid", updatedAt: todayISO() };
        });
        if (data.invoiceId && data.mode === "invoice_paid") {
          next[data.invoiceId] = { status: "paid", updatedAt: todayISO() };
        }
        void writeFinanceKey("bb_invoice_payments", next);
      }
      toast.push(
        remaining < 0.009
          ? `تم سداد ${fmt(amount)} EGP · الحساب مُسوّى`
          : `دفعة ${fmt(amount)} EGP · متبقي ${fmt(remaining)}`,
        "ok",
      );
      return { ok: true, amount, remaining };
    },
    [payments, toast],
  );

  const toggleInvoicePaid = useCallback(
    (invoiceId: string) => {
      const all = asRecord<InvoicePayments>(CloudStore.get("bb_invoice_payments", {}));
      const current = all[invoiceId]?.status === "paid" ? "paid" : "pending";
      if (current === "paid") {
        void writeFinanceKey(
          "bb_customer_payments",
          readArr<CustomerPayment>("bb_customer_payments").filter(
            (p) => !(p.mode === "invoice_paid" && p.invoiceId === invoiceId),
          ),
        );
        void writeFinanceKey("bb_invoice_payments", {
          ...all,
          [invoiceId]: { status: "pending", updatedAt: todayISO() },
        });
        toast.push("عُلّقت الفاتورة", "ok");
        return { ok: true };
      }
      const led = buildCustomerLedger(
        readArr<Invoice>("bb_invoices"),
        readArr<ReturnRecord>("bb_returns"),
        all,
        readArr<CustomerPayment>("bb_customer_payments"),
      );
      const row = led.byInvoice[invoiceId];
      if (row && row.remaining > 0.009) {
        return applyCustomerPayment({
          customerKey: invCustKey(row.inv) || "_none",
          mode: "invoice_paid",
          amount: row.remaining,
          invoiceId,
          notes: `تسجيل مدفوع ${row.inv.invoiceNumber || ""}`,
        });
      }
      setPayment(invoiceId, "paid");
      toast.push("سُجّلت مدفوعة", "ok");
      return { ok: true };
    },
    [applyCustomerPayment, setPayment, toast],
  );

  const removeCustomerPayment = useCallback((id: string) => {
    const arr = readArr<CustomerPayment>("bb_customer_payments");
    const rec = arr.find((p) => p.id === id);
    void writeFinanceKey(
      "bb_customer_payments",
      arr.filter((p) => p.id !== id),
    );
    if (rec?.prevStatuses?.length) {
      const all = asRecord<InvoicePayments>(CloudStore.get("bb_invoice_payments", {}));
      const next = { ...all };
      rec.prevStatuses.forEach((s) => {
        if (s?.id) next[s.id] = { status: (s.status as "paid" | "pending") || "pending", updatedAt: todayISO() };
      });
      void writeFinanceKey("bb_invoice_payments", next);
    }
  }, []);

  const saveOpCost = useCallback((data: Omit<OpCost, "id"> & { id?: string }) => {
    const rec: OpCost = {
      id: data.id || financeId("op"),
      date: data.date || todayISO(),
      name: data.name,
      category: data.category || "أخرى",
      amount: num(data.amount),
      notes: data.notes || "",
    };
    const arr = readArr<OpCost>("bb_operation_costs");
    const idx = arr.findIndex((o) => o.id === rec.id);
    if (idx >= 0) arr[idx] = rec;
    else arr.unshift(rec);
    void writeFinanceKey("bb_operation_costs", arr);
  }, []);

  const removeOpCost = useCallback((id: string) => {
    void writeFinanceKey(
      "bb_operation_costs",
      readArr<OpCost>("bb_operation_costs").filter((o) => o.id !== id),
    );
  }, []);

  const saveInvestor = useCallback((data: Omit<Investor, "id"> & { id?: string }) => {
    const rec: Investor = {
      id: data.id || financeId("invstr"),
      name: data.name,
      phone: data.phone || "",
      amount: num(data.amount),
      date: data.date || todayISO(),
      notes: data.notes || "",
    };
    const arr = readArr<Investor>("bb_investors");
    const idx = arr.findIndex((p) => p.id === rec.id);
    if (idx >= 0) arr[idx] = rec;
    else arr.unshift(rec);
    void writeFinanceKey("bb_investors", arr);
  }, []);

  const removeInvestor = useCallback((id: string) => {
    void writeFinanceKey(
      "bb_investors",
      readArr<Investor>("bb_investors").filter((p) => p.id !== id),
    );
  }, []);

  const saveInvestorTarget = useCallback((patch: Partial<InvestorTarget>) => {
    const cur = (CloudStore.get("bb_investor_target", {
      needed: 0,
      split: "equal",
      projectStart: "",
    }) || {}) as InvestorTarget;
    void writeFinanceKey("bb_investor_target", { ...cur, ...patch });
  }, []);

  const assignInvestorAmounts = useCallback((amounts: Record<string, number>) => {
    const arr = readArr<Investor>("bb_investors").map((p) =>
      amounts[p.id] != null ? { ...p, amount: num(amounts[p.id]) } : p,
    );
    void writeFinanceKey("bb_investors", arr);
  }, []);

  const setPrepLines = useCallback((lines: PrepLine[]) => {
    void writeFinanceKey("bb_prep_lines", lines);
  }, []);

  const setPrepProdMode = useCallback((mode: "all" | "net") => {
    void writeFinanceKey("bb_prep_prod_mode", mode);
  }, []);

  const addToCustomerDraft = useCallback((customer: Customer, item: InvoiceLine) => {
    const all = readArr<FinancePending>("bb_pending_invoices");
    let draft = findDraftByCustomer(all, customer.id);
    if (!draft) {
      draft = emptyInvoiceDraft(customer);
      all.unshift(draft);
    }
    const items = mergeDraftItem(draft.items || [], item);
    const next = all.map((p) =>
      p.id === draft!.id ? { ...p, items, updatedAt: new Date().toISOString() } : p,
    );
    void writeFinanceKey("bb_pending_invoices", next);
  }, []);

  const updateDraft = useCallback((id: string, patch: Partial<FinancePending>) => {
    const next = readArr<FinancePending>("bb_pending_invoices").map((p) =>
      p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
    );
    void writeFinanceKey("bb_pending_invoices", next);
  }, []);

  const removePending = useCallback((id: string) => {
    void writeFinanceKey(
      "bb_pending_invoices",
      readArr<FinancePending>("bb_pending_invoices").filter((p) => p.id !== id),
    );
  }, []);

  const approveDraft = useCallback(
    async (id: string) => {
      const pend = readArr<FinancePending>("bb_pending_invoices").find((p) => p.id === id);
      if (!pend || !isInvoiceDraft(pend)) return false;
      if (pend.status === "completed") {
        toast.push("هذه المسودة معتمدة مسبقاً", "warn");
        return false;
      }
      const items = (pend.items || []).filter((it) => num(it.qty) > 0);
      if (!items.length) {
        toast.push("لا أصناف في هذه الفاتورة", "warn");
        return false;
      }
      if (!pend.customerId) {
        toast.push("لا يوجد عميل لهذه المسودة", "warn");
        return false;
      }
      const invs = readArr<Invoice>("bb_invoices");
      const invNum = nextInvoiceNumber(invs, pend.customerId);
      const inv = draftToInvoice({ ...pend, items }, invNum);
      await commitPrepInvoice([inv, ...invs]);
      setPayment(inv.id, "pending");
      const nextPend = readArr<FinancePending>("bb_pending_invoices").map((p) =>
        p.id === id
          ? {
              ...p,
              status: "completed",
              completedInvoiceId: inv.id,
              productionApprovedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : p,
      );
      void writeFinanceKey("bb_pending_invoices", nextPend);
      toast.push(`أُضيفت ${invNum} لـ ${pend.customerName || ""}`, "ok");
      return true;
    },
    [setPayment, toast],
  );

  const sendBoardToProduction = useCallback(
    (title?: string) => {
      const lines = readArr<PrepLine>("bb_prep_lines").filter((l) => num(l.units) > 0);
      if (!lines.length) {
        toast.push("لا بنود في لوحة التحضير", "warn");
        return;
      }
      const items = prepLinesToItems(lines, readArr<Recipe>("bb_recipes"), readArr<Product>("bb_products"));
      const order = makePrepOrder(lines, items, {
        kind: "prep",
        status: "awaiting_production",
        title: title || `طلب تحضير · ${todayISO()}`,
      });
      void writeFinanceKey("bb_pending_invoices", [
        order,
        ...readArr<FinancePending>("bb_pending_invoices"),
      ]);
      toast.push("أُرسل للإنتاج", "ok");
    },
    [toast],
  );

  const sendOrderToProduction = useCallback((id: string) => {
    const p = readArr<FinancePending>("bb_pending_invoices").find((x) => x.id === id);
    if (!p || isInvoiceDraft(p)) {
      toast.push("مسودات الفاتورة لا تُرسل للإنتاج", "warn");
      return;
    }
    updateDraft(id, { status: "awaiting_production" });
    toast.push("أُرسل للإنتاج", "ok");
  }, [toast, updateDraft]);

  const approveProduction = useCallback(
    async (id: string) => {
      const pend = readArr<FinancePending>("bb_pending_invoices").find((p) => p.id === id);
      if (!pend || !pend.prepLines?.length) {
        toast.push("لا بيانات إنتاج", "warn");
        return false;
      }
      const onHandByRecipe: Record<string, number> = {};
      productSummary.forEach((r) => {
        if (r.recipeId) onHandByRecipe[r.recipeId] = r.onHand;
      });
      const agg = calcPrepAggregate(pend.prepLines, recipes, {
        prodMode: prepProdMode,
        onHandByRecipe,
        findItem,
        ledger,
      });
      let produced = 0;
      let runs = 0;
      agg.productRows.forEach((row) => {
        const qty = row.unitsToProduce > 0 ? row.unitsToProduce : 0;
        if (!qty) return;
        const run = addRun(
          row.recipeId,
          qty,
          `طلب: ${pend.title || id}${pend.customerName ? ` · ${pend.customerName}` : ""} · pend:${pend.id}`,
        );
        if (run) {
          runs += 1;
          produced += qty;
        }
      });
      if (!runs) {
        const allCovered =
          agg.productRows.length > 0 &&
          agg.productRows.every((r) => r.coveredByStock || r.unitsToProduce <= 0);
        if (!allCovered) {
          pend.prepLines.forEach((line) => {
            const qty = roundQty(line.units);
            if (!qty) return;
            const run = addRun(line.recipeId, qty, `طلب: ${pend.title || id} · pend:${pend.id}`);
            if (run) {
              runs += 1;
              produced += qty;
            }
          });
        }
      }
      updateDraft(id, {
        status: "completed",
        productionApprovedAt: new Date().toISOString(),
      });
      const doneIds = new Set((pend.prepLines || []).map((l) => l.recipeId));
      void writeFinanceKey(
        "bb_prep_lines",
        readArr<PrepLine>("bb_prep_lines").filter((l) => !doneIds.has(l.recipeId)),
      );
      toast.push(`تمت الموافقة · ${runs} دورة · ${produced} وحدة`, "ok");
      return true;
    },
    [findItem, ledger, prepProdMode, productSummary, recipes, toast, updateDraft],
  );

  const addProductionRun = useCallback(
    (recipeId: string, units: number, notes: string, date?: string) => {
      const run = addRun(recipeId, units, notes, date);
      if (!run) toast.push("تعذر تسجيل الإنتاج", "warn");
      else toast.push("سُجّلت دورة الإنتاج", "ok");
    },
    [toast],
  );

  const prepareLabelOpen = useCallback(
    (stickerId: string) => {
      const item = stickers.find((s) => s.id === stickerId);
      void writeFinanceKey("bb_label_open", {
        stickerId: stickerId || "",
        templateId: item?.templateKey || "",
        productId: item?.productId || "",
        recipeId: item?.recipeId || "",
        ts: Date.now(),
      });
    },
    [stickers],
  );

  const printSavedInvoice = useCallback(
    (invoiceId: string, mode: "original" | "net" = "original") => {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (!inv) {
        toast.push("لم يتم إيجاد الفاتورة", "warn");
        return;
      }
      const snap = parseInv2(CloudStore.get("bb_inv2", {}));
      const ok = printInvoiceDocument({
        draft: draftFromInvoice(inv),
        theme: resolvePrintTheme(printLook, snap.C, presets),
        strings: snap.S,
        mode,
        returns,
        invoices,
        fitOne,
        pageSize,
        margins,
      });
      if (!ok) toast.push("اسمح بالنوافذ المنبثقة للطباعة", "warn");
    },
    [fitOne, invoices, margins, pageSize, presets, printLook, returns, toast],
  );

  const printSavedInvoices = useCallback(
    (invoiceIds: string[], mode: "original" | "net" = "original") => {
      if (!invoiceIds.length) {
        toast.push("حدد فاتورة واحدة على الأقل", "warn");
        return;
      }
      const byId = new Map(invoices.map((inv) => [inv.id, inv]));
      const selected = invoiceIds
        .map((id) => byId.get(id))
        .filter((inv): inv is Invoice => !!inv)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      if (!selected.length) {
        toast.push("لم يتم إيجاد الفواتير المحددة", "warn");
        return;
      }
      const snap = parseInv2(CloudStore.get("bb_inv2", {}));
      const ok = printInvoiceDocuments({
        drafts: selected.map((inv) => draftFromInvoice(inv)),
        theme: resolvePrintTheme(printLook, snap.C, presets),
        strings: snap.S,
        mode,
        returns,
        invoices,
        fitOne: selected.length === 1 ? fitOne : false,
        pageSize,
        margins,
      });
      if (!ok) toast.push("اسمح بالنوافذ المنبثقة للطباعة", "warn");
      else {
        toast.push(
          `${mode === "net" ? "بعد المرتجع" : "أصلية"} · ${selected.length} فاتورة`,
          "ok",
        );
      }
    },
    [fitOne, invoices, margins, pageSize, presets, printLook, returns, toast],
  );

  const createNamedBackup = useCallback(
    async (label: string) => {
      try {
        const { uploadBackupJson } = await import("@/lib/storage");
        const snap = collectBackupSnapshot(label.trim() || "نقطة حفظ");
        await uploadBackupJson(backupFileName(snap.id), JSON.stringify(snap));
        const meta: BackupMeta = { id: snap.id, createdAt: snap.createdAt, label: snap.label };
        const index = [meta, ...readArr<BackupMeta>("bb_backup_index")].slice(0, 25);
        void writeFinanceKey("bb_backup_index", index);
        toast.push("حُفظت النسخة على السحابة", "ok");
        return true;
      } catch (err) {
        toast.push(err instanceof Error ? err.message : "تعذر حفظ النسخة", "bad");
        return false;
      }
    },
    [toast],
  );

  const restoreNamedBackup = useCallback(
    async (id: string, load: (id: string) => Promise<unknown>) => {
      try {
        await createNamedBackup(`قبل الاستعادة · ${id}`);
        const raw = await load(id);
        const snap = raw as {
          id?: string;
          createdAt?: string;
          label?: string;
          keys?: string[];
          data?: Record<string, unknown>;
        };
        if (!snap?.data) {
          toast.push("النقطة غير موجودة", "warn");
          return false;
        }
        await restoreBackupSnapshot({
          id: snap.id || id,
          createdAt: snap.createdAt || "",
          label: snap.label || "",
          keys: snap.keys || Object.keys(snap.data),
          data: snap.data,
        });
        toast.push("تمت الاستعادة — المفاتيح الموجودة في النقطة فقط", "ok");
        return true;
      } catch (err) {
        toast.push(err instanceof Error ? err.message : "تعذر الاستعادة", "bad");
        return false;
      }
    },
    [createNamedBackup, toast],
  );

  const setLastCustomer = useCallback((id: string) => {
    void writeFinanceKey("bb_ret_last_customer", id || "");
  }, []);

  const itemStatus = useCallback(
    (item: StockItem, type: ItemKind) => {
      const qty = qtyOf(type, item.id, item);
      const suppressed = alertSuppressed(item, type, recipes, products, stickers);
      return stockStatus(item, qty, suppressed);
    },
    [products, qtyOf, recipes, stickers],
  );

  const value: FinanceContextValue = {
    invoices,
    customers,
    products,
    categories,
    payments,
    customerPayments,
    pending,
    invoiceDrafts,
    prepOrders,
    awaitingProduction,
    returns,
    materials,
    packages,
    stickers,
    recipes,
    purchases,
    production,
    opCosts,
    investors,
    investorTarget,
    templates,
    prepLines,
    prepProdMode,
    backupIndex,
    lastCustomerId,
    setLastCustomer,
    findItem,
    qtyOf,
    ledger,
    sales,
    stockReport,
    linked,
    monthly,
    customerLedger,
    productSummary,
    saveItem,
    removeItem,
    applyTruthStock,
    applyProductStock,
    saveRecipe,
    removeRecipe,
    savePurchase,
    removePurchase,
    saveProduct,
    removeProduct,
    saveCategory,
    removeCategory,
    saveReturn,
    removeReturn,
    setPayment,
    toggleInvoicePaid,
    applyCustomerPayment,
    removeCustomerPayment,
    saveOpCost,
    removeOpCost,
    saveInvestor,
    removeInvestor,
    saveInvestorTarget,
    assignInvestorAmounts,
    setPrepLines,
    setPrepProdMode,
    addToCustomerDraft,
    updateDraft,
    removePending,
    approveDraft,
    sendBoardToProduction,
    sendOrderToProduction,
    approveProduction,
    addProductionRun,
    prepareLabelOpen,
    printSavedInvoice,
    printSavedInvoices,
    createNamedBackup,
    restoreNamedBackup,
    itemStatus,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinanceApp() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinanceApp must be used inside FinanceProvider");
  return ctx;
}
