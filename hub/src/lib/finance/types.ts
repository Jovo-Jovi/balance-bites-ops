import type {
  Invoice,
  InvoiceLine,
  InvoicePayments,
  PendingInvoice,
  Product,
  ReturnRecord,
} from "@/lib/invoices/types";

export type InvItemType = "bb_materials" | "bb_packages" | "bb_stickers";

export type StockItem = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  minStock: number;
  supplier: string;
  notes: string;
  productId?: string;
  recipeId?: string;
  templateKey?: string;
};

export type RecipeIngredient = {
  itemId: string;
  itemType: InvItemType;
  qty: number;
};

export type Recipe = {
  id: string;
  name: string;
  batchSize: number;
  ingredients: RecipeIngredient[];
  productId: string;
  productWeight: string;
  unitPrice: number;
  categoryId: string;
};

export type Purchase = {
  id: string;
  date: string;
  itemId: string;
  itemType: InvItemType;
  itemName: string;
  qty: number;
  costPerUnit: number;
  totalCost: number;
  supplier: string;
  notes?: string;
};

export type ProductionRun = {
  id: string;
  date: string;
  recipeId: string;
  recipeName: string;
  unitsProduced: number;
  notes: string;
  deductions: { itemId: string; itemType: InvItemType; name: string; qty: number }[];
  isAdjustment?: boolean;
};

export type OpCost = {
  id: string;
  date: string;
  name: string;
  category: string;
  amount: number;
  notes: string;
};

export type Investor = {
  id: string;
  name: string;
  phone: string;
  amount: number;
  date: string;
  notes: string;
};

export type InvestorTarget = {
  needed: number;
  split: "equal" | "share";
  projectStart: string;
  collectionLag?: number;
  stockPlacement?: string;
  includeResidual?: boolean;
};

export type CustomerPayment = {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  amount: number;
  mode: string;
  notes: string;
  invoiceId: string;
  prevStatuses?: { id: string; status: string }[];
};

export type BackupMeta = {
  id: string;
  createdAt: string;
  label: string;
};

export type LedgerRow = {
  purchased: number;
  used: number;
  balance: number;
  source: "invoices" | "production" | "—";
};

export type PrepLine = { recipeId: string; units: number };

export type FinancePending = PendingInvoice & {
  prepLines?: PrepLine[];
  productionApprovedAt?: string | null;
};

export type ItemUsageKind = "unused" | "active" | "inactive" | "shared";

export { type Invoice, type InvoiceLine, type InvoicePayments, type Product, type ReturnRecord };
