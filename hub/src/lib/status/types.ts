export type Rag = "green" | "yellow" | "red";

export type PaymentLabel = "Paid" | "Pending" | "—";
export type DeliveryLabel = "Delivered" | "Pending" | "—";

export type ChurchOverride = {
  rag?: Rag | "";
  delivery?: string;
  issue?: string;
  nextAction?: string;
};

export type LineNote = {
  notes?: string;
  owner?: string;
  method?: string;
  scheduled?: string;
  actual?: string;
  delay?: string;
  nextAction?: string;
  payment?: string;
  status?: string;
};

export type RiskRow = {
  id: string;
  priority: string;
  area: string;
  risk: string;
  impact: string;
  action: string;
  owner: string;
  due: string;
  status: string;
};

export type ChurchStatusDoc = {
  weekStart: string;
  weekEnd: string;
  preparedBy: string;
  overallStatus: Rag | "";
  managementFocus: string;
  showAll: boolean;
  churches: Record<string, ChurchOverride>;
  inventory: Record<string, LineNote>;
  sourcing: Record<string, LineNote>;
  packing: Record<string, LineNote>;
  delivery: Record<string, LineNote>;
  risks: RiskRow[];
  achievements: string;
  challenges: string;
  nextPriorities: string;
};

export type ChurchRow = {
  id: string;
  name: string;
  units: number;
  sales: number;
  payment: PaymentLabel;
  delivery: DeliveryLabel;
  rag: Rag;
  issue: string;
  nextAction: string;
  outstanding: number;
  servedThisWeek: boolean;
  servedPrevWeek: boolean;
};

export type InventoryRow = {
  id: string;
  name: string;
  opening: number;
  received: number;
  distributed: number;
  closing: number;
  reorder: number;
  rag: Rag;
  statusLabel: string;
  notes: string;
};

export type SourcingRow = {
  id: string;
  partner: string;
  item: string;
  orderPlaced: string;
  expectedDelivery: string;
  qtyOrdered: number;
  qtyReceived: number;
  payment: string;
  rag: Rag;
  statusLabel: string;
};

export type PackingRow = {
  id: string;
  product: string;
  toPack: number;
  packed: number;
  labeled: number;
  ready: number;
  rag: Rag;
  statusLabel: string;
  owner: string;
  notes: string;
};

export type DeliveryExecRow = {
  id: string;
  church: string;
  scheduled: string;
  actual: string;
  units: number;
  method: string;
  rag: Rag;
  statusLabel: string;
  delay: string;
  nextAction: string;
};

export type KpiRow = {
  name: string;
  current: string;
  previous: string;
  trend: "↑" | "↓" | "→";
  status: Rag;
};

export type ChurchReport = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  preparedBy: string;
  overall: Rag;
  overallLabel: string;
  focus: string;
  kpis: KpiRow[];
  churches: ChurchRow[];
  inventory: InventoryRow[];
  sourcing: SourcingRow[];
  packing: PackingRow[];
  deliveries: DeliveryExecRow[];
  risks: RiskRow[];
  achievements: string;
  challenges: string;
  nextPriorities: string;
};

export const RAG_LABEL: Record<Rag, string> = {
  green: "🟢 On Track",
  yellow: "🟡 At Risk",
  red: "🔴 Critical",
};

export const RAG_DOT: Record<Rag, string> = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
};

export const STATUS_HEAD =
  "BalanceBytes  |  PM & OPERATIONS EXECUTIVE WEEKLY STATUS REPORT";
export const STATUS_SUB =
  "End-to-End View — Sourcing • Inventory • Packing & Labeling • Distribution • Payment";
export const STATUS_FOCUS =
  "Sourcing • Inventory • Packing & Labeling • Distribution • Church Engagement • Collections";
export const PM_FOOTNOTE =
  "RAG status reflects the health of the end-to-end distribution operation — sourcing, inventory, packing & labeling, delivery and collections. The report focuses on outcomes, exceptions, risks, ownership and next actions so management can review the full project flow quickly each week.";

/** @deprecated use STATUS_HEAD / STATUS_SUB */
export const CHURCH_STATUS_TITLE = STATUS_HEAD;
export const CHURCH_STATUS_BRAND = STATUS_SUB;
export const CHURCH_STATUS_FOCUS = STATUS_FOCUS;

export const RAG_LEGEND: { rag: Rag; label: string; definition: string }[] = [
  {
    rag: "green",
    label: "🟢 On Track",
    definition:
      "No material issue; planned activity (sourcing, inventory, packing, delivery, payment) progressing as expected.",
  },
  {
    rag: "yellow",
    label: "🟡 At Risk",
    definition:
      "Issue may affect distribution, cash collection, delivery, packing, sourcing or church engagement if not addressed.",
  },
  {
    rag: "red",
    label: "🔴 Critical",
    definition:
      "Immediate management action required to avoid missed delivery, stock-out, or financial impact.",
  },
];

export const TREND_LEGEND: { arrow: string; definition: string }[] = [
  { arrow: "↑", definition: "Improved vs. previous week." },
  { arrow: "→", definition: "Unchanged vs. previous week." },
  { arrow: "↓", definition: "Declined vs. previous week." },
];

export const UPDATE_GUIDE: { step: string; detail: string }[] = [
  {
    step: "1. Reporting Week & Header",
    detail:
      "Update the reporting week date range, Overall Status RAG, Prepared By, and Management Focus at the top of the Weekly Status Report tab.",
  },
  {
    step: "2. Executive KPI Summary",
    detail:
      "Enter this week's and last week's figures for each KPI. Update the Trend arrow (↑ / → / ↓) and Status RAG manually based on the comparison.",
  },
  {
    step: "3. Church-Level Distribution Performance",
    detail:
      "Add one row per active church. Fill in Units Distributed, Sales Value, Payment status, Delivery status, and any issue/risk. Set the row's fill color to match its Status (green = On Track, yellow = At Risk, red = Critical).",
  },
  {
    step: "4. Inventory & Supply Readiness",
    detail:
      "For each item, enter Opening Stock, Received (Week), and Distributed (Week) only. Closing Stock is calculated automatically — do not overwrite column E. Formula: Closing Stock = Opening Stock + Received − Distributed.",
  },
  {
    step: "5. Product Sourcing / Procurement & Partners",
    detail:
      "List each active purchase order or supplier engagement: item, order date, expected delivery, quantities ordered vs. received, payment status, and overall status.",
  },
  {
    step: "6. Packing & Labeling Readiness",
    detail:
      "Track each batch's packing and labeling progress and whether it is ready for dispatch. Flag delays in the Notes column.",
  },
  {
    step: "7. Delivery & Distribution Execution",
    detail:
      "Record scheduled vs. actual delivery dates, units delivered, delivery method, and any delay reason per church/destination.",
  },
  {
    step: "8. Risks, Issues & Management Actions",
    detail:
      "Log every open risk across the full chain (sourcing, inventory, packing, delivery, payment) with a priority, owner, due date, and status. Close out resolved items by updating Status rather than deleting the row (keeps a visible history).",
  },
  {
    step: "9. Achievements / Challenges / Next-Week Priorities",
    detail:
      "Summarize the week in 2–4 bullets each. Keep bullets short and outcome-focused for executive readability.",
  },
  {
    step: "10. Color Coding",
    detail:
      "Use the RAG Legend tab as the single source of truth for status colors and definitions. Keep colors consistent across all sections.",
  },
];

export const REPORT_FLOW =
  "Church Demand  →  Sourcing  →  Inventory  →  Packing & Labeling  →  Distribution  →  Payment";

export const REPORT_FLOW_NOTE =
  "This structure gives management visibility over the entire delivery chain — not just sales outcomes — so risks can be caught upstream (sourcing/inventory) before they become downstream delivery or payment problems.";

export const EMPTY_STATUS_DOC: ChurchStatusDoc = {
  weekStart: "",
  weekEnd: "",
  preparedBy: "",
  overallStatus: "",
  managementFocus: "",
  showAll: false,
  churches: {},
  inventory: {},
  sourcing: {},
  packing: {},
  delivery: {},
  risks: [],
  achievements: "",
  challenges: "",
  nextPriorities: "",
};
