import { genId } from "@/lib/invoices/helpers";
import {
  EMPTY_STATUS_DOC,
  type ChurchOverride,
  type ChurchStatusDoc,
  type Rag,
  type RiskRow,
} from "./types";

function isRag(v: unknown): v is Rag {
  return v === "green" || v === "yellow" || v === "red";
}

function str(v: unknown) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function parseOverride(raw: unknown): ChurchOverride {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const rag = isRag(o.rag) ? o.rag : o.rag === "" ? "" : undefined;
  return {
    rag,
    delivery: o.delivery == null ? undefined : str(o.delivery),
    issue: o.issue == null ? undefined : str(o.issue),
    nextAction: o.nextAction == null ? undefined : str(o.nextAction),
  };
}

function parseRisk(raw: unknown, i: number): RiskRow {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    id: str(o.id) || genId("risk"),
    priority: str(o.priority) || (i === 0 ? "High" : ""),
    risk: str(o.risk),
    impact: str(o.impact),
    action: str(o.action),
    owner: str(o.owner),
    due: str(o.due),
    status: str(o.status),
  };
}

export function parseChurchStatus(raw: unknown): ChurchStatusDoc {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_STATUS_DOC, churches: {}, risks: [] };
  }
  const o = raw as Record<string, unknown>;
  const churches: Record<string, ChurchOverride> = {};
  if (o.churches && typeof o.churches === "object" && !Array.isArray(o.churches)) {
    Object.entries(o.churches as Record<string, unknown>).forEach(([id, val]) => {
      if (!id) return;
      churches[id] = parseOverride(val);
    });
  }
  const risks = Array.isArray(o.risks)
    ? o.risks.map((row, i) => parseRisk(row, i))
    : [];
  return {
    weekStart: str(o.weekStart),
    weekEnd: str(o.weekEnd),
    preparedBy: str(o.preparedBy),
    overallStatus: isRag(o.overallStatus) ? o.overallStatus : "",
    showAll: o.showAll === true,
    churches,
    risks,
    achievements: str(o.achievements),
    challenges: str(o.challenges),
    nextPriorities: str(o.nextPriorities),
  };
}
