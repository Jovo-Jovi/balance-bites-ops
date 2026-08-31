"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ActionBtn, Field, Select, TextArea, TextInput } from "@/components/invoices/ui";
import { useCloudKey } from "@/hooks/use-cloud-key";
import { useToast } from "@/components/toast";
import { fireAndForget } from "@/lib/cloud-store";
import { asArray, asRecord, genId } from "@/lib/invoices/helpers";
import type {
  Customer,
  Invoice,
  InvoicePayments,
  PendingInvoice,
  ReturnRecord,
} from "@/lib/invoices/types";
import type { CustomerPayment } from "@/lib/finance/types";
import { parseChurchStatus } from "@/lib/status/parse";
import { downloadChurchReportXlsx, printChurchReport } from "@/lib/status/print";
import { buildChurchReport, churchStatusCell } from "@/lib/status/report";
import { SHEET_CSS } from "@/lib/status/sheet-css";
import {
  CHURCH_STATUS_BRAND,
  CHURCH_STATUS_FOCUS,
  CHURCH_STATUS_TITLE,
  PM_FOOTNOTE,
  RAG_LABEL,
  RAG_LEGEND,
  type ChurchStatusDoc,
  type Rag,
  type RiskRow,
} from "@/lib/status/types";
import { writeStatusKey } from "@/lib/status/write";

export function StatusApp() {
  const { storeReady, error, user } = useAuth();
  if (!storeReady) {
    return (
      <p className="py-16 text-center text-[var(--bb-muted)]">
        {error || "Syncing from the cloud…"}
      </p>
    );
  }
  return <StatusPanel email={user?.email || ""} />;
}

function StatusPanel({ email }: { email: string }) {
  const toast = useToast();
  const invoices = asArray<Invoice>(useCloudKey("bb_invoices"));
  const customers = asArray<Customer>(useCloudKey("bb_customers"));
  const returns = asArray<ReturnRecord>(useCloudKey("bb_returns"));
  const payments = asRecord<InvoicePayments>(useCloudKey("bb_invoice_payments"));
  const customerPayments = asArray<CustomerPayment>(useCloudKey("bb_customer_payments"));
  const pending = asArray<PendingInvoice>(useCloudKey("bb_pending_invoices"));
  const raw = useCloudKey<unknown>("bb_church_status");
  const saved = useMemo(() => parseChurchStatus(raw), [raw]);
  const [draft, setDraft] = useState<ChurchStatusDoc | null>(null);
  const doc = draft ?? saved;

  const fallbackName = email.includes("@") ? email.slice(0, email.indexOf("@")) : email;
  const report = useMemo(
    () =>
      buildChurchReport(
        {
          invoices,
          customers,
          returns,
          payments,
          customerPayments,
          pending,
          preparedByFallback: fallbackName,
        },
        doc,
      ),
    [invoices, customers, returns, payments, customerPayments, pending, doc, fallbackName],
  );

  function set(fn: (d: ChurchStatusDoc) => ChurchStatusDoc) {
    setDraft(fn(doc));
  }

  function save() {
    const next: ChurchStatusDoc = {
      ...doc,
      weekStart: report.weekStart,
      weekEnd: report.weekEnd,
      preparedBy: doc.preparedBy.trim() || fallbackName,
    };
    setDraft(next);
    fireAndForget(
      writeStatusKey("bb_church_status", next).then(() => {
        toast.push("Weekly status saved", "ok");
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4" dir="ltr">
      <style>{SHEET_CSS}</style>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Week start">
          <TextInput
            type="date"
            value={report.weekStart}
            onChange={(e) => set((d) => ({ ...d, weekStart: e.target.value }))}
          />
        </Field>
        <Field label="Week end">
          <TextInput
            type="date"
            value={report.weekEnd}
            onChange={(e) => set((d) => ({ ...d, weekEnd: e.target.value }))}
          />
        </Field>
        <Field label="Prepared by">
          <TextInput
            value={doc.preparedBy}
            placeholder={fallbackName || "[Name]"}
            onChange={(e) => set((d) => ({ ...d, preparedBy: e.target.value }))}
          />
        </Field>
        <Field label="Overall status">
          <Select
            value={doc.overallStatus}
            onChange={(e) =>
              set((d) => ({ ...d, overallStatus: (e.target.value || "") as Rag | "" }))
            }
          >
            <option value="">Auto ({report.overallLabel})</option>
            <option value="green">{RAG_LABEL.green}</option>
            <option value="yellow">{RAG_LABEL.yellow}</option>
            <option value="red">{RAG_LABEL.red}</option>
          </Select>
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--bb-text)]">
          <input
            type="checkbox"
            checked={doc.showAll}
            onChange={(e) => set((d) => ({ ...d, showAll: e.target.checked }))}
          />
          All churches
        </label>
        <ActionBtn onClick={save}>Save</ActionBtn>
        <ActionBtn tone="ghost" onClick={() => printChurchReport(report)}>
          Print
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={() => downloadChurchReportXlsx(report)}>
          Download Excel
        </ActionBtn>
      </div>
      <p className="text-sm text-[var(--bb-muted)]">
        Units, sales, payment and outstanding come from invoices and collections.
        Issue, next action, risks and the executive notes are yours to edit. Save
        writes <span dir="ltr">bb_church_status</span> only.
      </p>

      <div className="overflow-x-auto">
        <div className="bb-sr min-w-[960px]">
          <table>
            <colgroup>
              <col className="cA" />
              <col className="cB" />
              <col className="cC" />
              <col className="cD" />
              <col className="cE" />
              <col className="cF" />
              <col className="cG" />
              <col className="cH" />
            </colgroup>
            <tbody>
              <tr>
                <td className="title" colSpan={8}>
                  {CHURCH_STATUS_TITLE}
                </td>
              </tr>
              <tr>
                <td className="brand" colSpan={8}>
                  {CHURCH_STATUS_BRAND}
                </td>
              </tr>
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr>
                <td className="label">Reporting Week</td>
                <td colSpan={7}>{report.weekLabel}</td>
              </tr>
              <tr>
                <td className="label">Overall Status</td>
                <td colSpan={7}>{report.overallLabel}</td>
              </tr>
              <tr>
                <td className="label">Prepared By</td>
                <td colSpan={7}>{report.preparedBy || "[Name]"}</td>
              </tr>
              <tr>
                <td className="label">Management Focus</td>
                <td colSpan={7}>{CHURCH_STATUS_FOCUS}</td>
              </tr>
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr>
                <td className="section" colSpan={8}>
                  1. EXECUTIVE KPI SUMMARY
                </td>
              </tr>
              <tr>
                <th className="colh">KPI</th>
                <th className="colh">Current Week</th>
                <th className="colh">Previous Week</th>
                <th className="colh">Trend</th>
                <th className="colh">Status</th>
                <th />
                <th />
                <th />
              </tr>
              {report.kpis.map((k) => (
                <tr key={k.name}>
                  <td>{k.name}</td>
                  <td className="num">{k.current}</td>
                  <td className="num">{k.previous}</td>
                  <td className="center">{k.trend}</td>
                  <td className="center">{k.status === "yellow" ? "🟡" : "🟢"}</td>
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr>
                <td className="section" colSpan={8}>
                  2. CHURCH-LEVEL STATUS
                </td>
              </tr>
              <tr>
                <th className="colh">Church</th>
                <th className="colh">Status</th>
                <th className="colh">Units Distributed</th>
                <th className="colh">Sales Value (EGP)</th>
                <th className="colh">Payment</th>
                <th className="colh">Delivery</th>
                <th className="colh">Key Issue / Risk</th>
                <th className="colh">Next Action</th>
              </tr>
              {(report.churches.length
                ? report.churches
                : [
                    {
                      id: "",
                      name: "—",
                      units: 0,
                      sales: 0,
                      payment: "—" as const,
                      delivery: "—" as const,
                      rag: "green" as const,
                      issue: "—",
                      nextAction: "—",
                      outstanding: 0,
                      servedThisWeek: false,
                      servedPrevWeek: false,
                    },
                  ]
              ).map((c) => (
                <tr key={c.id || c.name} className={`rag-${c.rag}`}>
                  <td>{c.name}</td>
                  <td className="center">
                    {c.id ? (
                      <select
                        className="w-full bg-transparent text-center outline-none"
                        value={doc.churches[c.id]?.rag || ""}
                        onChange={(e) =>
                          set((d) => ({
                            ...d,
                            churches: {
                              ...d.churches,
                              [c.id]: {
                                ...d.churches[c.id],
                                rag: (e.target.value || "") as Rag | "",
                              },
                            },
                          }))
                        }
                        aria-label={`${c.name} status`}
                      >
                        <option value="">Auto · {churchStatusCell(c.rag)}</option>
                        <option value="green">{RAG_LABEL.green}</option>
                        <option value="yellow">{RAG_LABEL.yellow}</option>
                        <option value="red">{RAG_LABEL.red}</option>
                      </select>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="num">{c.servedThisWeek ? c.units : ""}</td>
                  <td className="num">
                    {c.servedThisWeek
                      ? c.sales.toLocaleString("en-GB", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : ""}
                  </td>
                  <td>{c.payment}</td>
                  <td>
                    {c.id ? (
                      <select
                        className="w-full bg-transparent outline-none"
                        value={doc.churches[c.id]?.delivery || ""}
                        onChange={(e) =>
                          set((d) => ({
                            ...d,
                            churches: {
                              ...d.churches,
                              [c.id]: {
                                ...d.churches[c.id],
                                delivery: e.target.value,
                              },
                            },
                          }))
                        }
                        aria-label={`${c.name} delivery`}
                      >
                        <option value="">Auto · {c.delivery}</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Pending">Pending</option>
                        <option value="—">—</option>
                      </select>
                    ) : (
                      c.delivery
                    )}
                  </td>
                  <td>
                    {c.id ? (
                      <input
                        className="w-full bg-transparent outline-none"
                        value={doc.churches[c.id]?.issue ?? ""}
                        placeholder={c.issue}
                        onChange={(e) =>
                          set((d) => ({
                            ...d,
                            churches: {
                              ...d.churches,
                              [c.id]: {
                                ...d.churches[c.id],
                                issue: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    ) : (
                      c.issue
                    )}
                  </td>
                  <td>
                    {c.id ? (
                      <input
                        className="w-full bg-transparent outline-none"
                        value={doc.churches[c.id]?.nextAction ?? ""}
                        placeholder={c.nextAction}
                        onChange={(e) =>
                          set((d) => ({
                            ...d,
                            churches: {
                              ...d.churches,
                              [c.id]: {
                                ...d.churches[c.id],
                                nextAction: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    ) : (
                      c.nextAction
                    )}
                  </td>
                </tr>
              ))}
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr>
                <td className="section" colSpan={8}>
                  3. KEY RISKS &amp; MANAGEMENT ACTIONS
                </td>
              </tr>
              <tr>
                <th className="colh">Priority</th>
                <th className="colh">Risk / Issue</th>
                <th className="colh">Business Impact</th>
                <th className="colh">Action</th>
                <th className="colh">Owner</th>
                <th className="colh">Due Date</th>
                <th className="colh">Status</th>
                <th className="colh" />
              </tr>
              {(doc.risks.length ? doc.risks : report.risks).map((risk, i) => (
                <RiskEditor
                  key={risk.id || i}
                  risk={risk}
                  onChange={(patch) => {
                    const base = doc.risks.length ? doc.risks : report.risks;
                    const next = base.map((row, idx) =>
                      idx === i ? { ...row, ...patch } : row,
                    );
                    set((d) => ({ ...d, risks: next }));
                  }}
                  onRemove={() => {
                    const base = doc.risks.length ? doc.risks : report.risks;
                    set((d) => ({ ...d, risks: base.filter((_, idx) => idx !== i) }));
                  }}
                />
              ))}
              <tr>
                <td colSpan={8}>
                  <button
                    type="button"
                    className="text-sm text-[var(--bb-gold)] underline"
                    onClick={() =>
                      set((d) => ({
                        ...d,
                        risks: [
                          ...(d.risks.length ? d.risks : report.risks),
                          emptyRisk(),
                        ],
                      }))
                    }
                  >
                    Add risk row
                  </button>
                </td>
              </tr>
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr>
                <td className="section" colSpan={8}>
                  4. EXECUTIVE PROJECT UPDATE
                </td>
              </tr>
              <tr>
                <td className="label">Achievements</td>
                <td colSpan={7}>
                  <TextArea
                    rows={3}
                    value={doc.achievements}
                    placeholder={report.achievements}
                    onChange={(e) => set((d) => ({ ...d, achievements: e.target.value }))}
                  />
                </td>
              </tr>
              <tr>
                <td className="label">Challenges / Risks</td>
                <td colSpan={7}>
                  <TextArea
                    rows={3}
                    value={doc.challenges}
                    placeholder={report.challenges}
                    onChange={(e) => set((d) => ({ ...d, challenges: e.target.value }))}
                  />
                </td>
              </tr>
              <tr>
                <td className="label">Next Week Priorities</td>
                <td colSpan={7}>
                  <TextArea
                    rows={4}
                    value={doc.nextPriorities}
                    placeholder={report.nextPriorities}
                    onChange={(e) => set((d) => ({ ...d, nextPriorities: e.target.value }))}
                  />
                </td>
              </tr>
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr className="spacer">
                <td colSpan={8} />
              </tr>
              <tr>
                <td className="section" colSpan={8}>
                  PROJECT MANAGEMENT VIEW
                </td>
              </tr>
              <tr>
                <td className="wrap" colSpan={8}>
                  {PM_FOOTNOTE}
                </td>
              </tr>
            </tbody>
          </table>
          <table className="mt-7">
            <colgroup>
              <col className="cA" />
              <col className="cB" />
              <col className="cC" />
              <col className="cD" />
              <col className="cE" />
              <col className="cF" />
              <col className="cG" />
              <col className="cH" />
            </colgroup>
            <tbody>
              <tr>
                <td className="legend-h">Status</td>
                <td className="legend-h" colSpan={7}>
                  Definition
                </td>
              </tr>
              {RAG_LEGEND.map((row) => (
                <tr key={row.rag}>
                  <td>{row.label}</td>
                  <td colSpan={7}>{row.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function emptyRisk(): RiskRow {
  return {
    id: genId("risk"),
    priority: "High",
    risk: "",
    impact: "",
    action: "",
    owner: "",
    due: "",
    status: "🟡 Open",
  };
}

function RiskEditor({
  risk,
  onChange,
  onRemove,
}: {
  risk: RiskRow;
  onChange: (patch: Partial<RiskRow>) => void;
  onRemove: () => void;
}) {
  const tone = risk.status.includes("🔴")
    ? "rag-red"
    : risk.status.includes("🟡")
      ? "rag-yellow"
      : "rag-green";
  const field = (key: keyof RiskRow, value: string) => (
    <input
      className="w-full bg-transparent outline-none"
      value={value}
      onChange={(e) => onChange({ [key]: e.target.value })}
    />
  );
  return (
    <tr className={tone}>
      <td>{field("priority", risk.priority)}</td>
      <td>{field("risk", risk.risk)}</td>
      <td>{field("impact", risk.impact)}</td>
      <td>{field("action", risk.action)}</td>
      <td>{field("owner", risk.owner)}</td>
      <td>{field("due", risk.due)}</td>
      <td>{field("status", risk.status)}</td>
      <td>
        <button type="button" className="text-sm underline" onClick={onRemove}>
          Remove
        </button>
      </td>
    </tr>
  );
}
