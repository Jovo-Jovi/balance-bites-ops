export type Rag = "green" | "yellow" | "red";

export type PaymentLabel = "Paid" | "Pending" | "—";
export type DeliveryLabel = "Delivered" | "Pending" | "—";

export type ChurchOverride = {
  rag?: Rag | "";
  delivery?: string;
  issue?: string;
  nextAction?: string;
};

export type RiskRow = {
  id: string;
  priority: string;
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
  showAll: boolean;
  churches: Record<string, ChurchOverride>;
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

export const CHURCH_STATUS_TITLE =
  "Project Management Executive View — Church-Level Distribution";
export const CHURCH_STATUS_BRAND =
  "BalanceBytes | WEEKLY CHURCH DISTRIBUTION STATUS REPORT";
export const CHURCH_STATUS_FOCUS =
  "Distribution • Church Engagement • Delivery • Collections";
export const PM_FOOTNOTE =
  "RAG status reflects the health of the church distribution operation. The report focuses on outcomes, exceptions, risks, ownership and next actions so management can review the project quickly each week.";

export const RAG_LEGEND: { rag: Rag; label: string; definition: string }[] = [
  {
    rag: "green",
    label: "🟢 On Track",
    definition:
      "No material issue; planned distribution progressing as expected.",
  },
  {
    rag: "yellow",
    label: "🟡 At Risk",
    definition:
      "Issue may affect distribution, cash collection, delivery or church engagement if not addressed.",
  },
  {
    rag: "red",
    label: "🔴 Critical",
    definition: "Immediate management action required.",
  },
];

export const EMPTY_STATUS_DOC: ChurchStatusDoc = {
  weekStart: "",
  weekEnd: "",
  preparedBy: "",
  overallStatus: "",
  showAll: false,
  churches: {},
  risks: [],
  achievements: "",
  challenges: "",
  nextPriorities: "",
};
