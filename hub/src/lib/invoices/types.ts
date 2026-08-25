export type InvoiceLine = {
  productId: string | null;
  name: string;
  packType: string;
  weight: string;
  categoryId: string | null;
  qty: number;
  price: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Product = {
  id: string;
  name: string;
  packType: string;
  weight: string;
  unitPrice: number;
  categoryId: string | null;
  inactive?: boolean;
  active?: boolean;
};

export type Invoice = {
  id: string;
  customerId: string | null;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceLine[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  notes: string;
  savedAt: string;
  fromBundleId?: string;
  fromPrepInvoiceId?: string;
};

export type PendingInvoice = {
  id: string;
  kind?: string;
  status?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  date?: string;
  discount?: number;
  items?: InvoiceLine[];
  prepSummary?: { stockOk?: boolean };
  completedInvoiceId?: string | null;
};

export type InvoiceBundle = {
  id: string;
  name: string;
  items: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
};

export type ReturnLine = {
  productId?: string | null;
  name?: string;
  qty?: number;
  price?: number;
  lineTotal?: number;
  disposition?: string;
  skipCustomerCredit?: boolean;
};

export type ReturnRecord = {
  id: string;
  date?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  amount?: number;
  reason?: string;
  notes?: string;
  source?: string;
  skipCustomerCredit?: boolean;
  disposition?: string;
  fullReturn?: boolean;
  items?: ReturnLine[];
  outAllocations?: {
    productId?: string | null;
    name?: string;
    qty?: number;
    toCustomerName?: string;
    toInvoiceNumber?: string;
  }[];
};

export type PaymentStatus = "paid" | "pending";

export type InvoicePayment = {
  status: PaymentStatus;
  updatedAt: string;
};

export type InvoicePayments = Record<string, InvoicePayment>;

export type ColorPreset = {
  id: string;
  name: string;
  bg: string;
  gold: string;
  txt: string;
  mut: string;
  row: string;
  tot: string;
  grand: string;
};

export type InvoiceTheme = Omit<ColorPreset, "id" | "name">;

export type InvoiceStrings = {
  mono: string;
  brand: string;
  docTitle: string;
  web: string;
  footNote: string;
  cur: string;
  discount: number;
  discLabel: string;
  hItem: string;
  hQty: string;
  hPrice: string;
  hSub: string;
  lSubtotal: string;
  lTotal: string;
  plTitle: string;
  plFootNote: string;
  plDefaultNote: string;
  plHProduct: string;
  plHPack: string;
  plHWeight: string;
  plHPrice: string;
  plLblProducts: string;
  plLblCategories: string;
  plLblOther: string;
  plCatSuffix: string;
  clTitle: string;
  clFootNote: string;
  clDefaultNote: string;
  clHNum: string;
  clHName: string;
  clHPhone: string;
  clHAddress: string;
  clHNotes: string;
  clHLatestInv: string;
  clHLatestVal: string;
  clHPayStatus: string;
  clHPendingList: string;
  clLblCustomers: string;
  clLblWithInv: string;
  clLblPendingCount: string;
  clPaid: string;
  clPending: string;
  clNoInv: string;
};

export type Inv2Snapshot = {
  C?: Partial<InvoiceTheme>;
  S?: Partial<InvoiceStrings>;
  items?: InvoiceLine[];
};

export type InvoiceDraft = {
  loadedInvoiceId: string | null;
  pendingId: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  invoiceNumber: string;
  date: string;
  notes: string;
  discount: number;
  items: InvoiceLine[];
};

export type SalesStatus = "active" | "partial" | "full";

export type ReturnInfo = {
  records: ReturnRecord[];
  totalQty: number;
  totalRevenue: number;
  totalExpiredAmt: number;
  fullReturn: boolean;
};

export type EnrichedInvoice = {
  inv: Invoice;
  gross: number;
  net: number;
  returnInfo: ReturnInfo | null;
  salesStatus: SalesStatus;
};

export type ItemReturnBreakdown = {
  name: string;
  expiredQty: number;
  restockQty: number;
  soldTo: { customerName: string; invoiceNumber: string; qty: number }[];
};

export const INVOICE_HISTORY_MAX = 100;
