"use client";

import { ActionBtn, Field, Select, TextArea, TextInput } from "@/components/invoices/ui";
import { genId } from "@/lib/invoices/helpers";
import { churchStatusCell } from "@/lib/status/report";
import { SHEET_CSS } from "@/lib/status/sheet-css";
import {
  RAG_LABEL,
  RAG_LEGEND,
  REPORT_FLOW,
  REPORT_FLOW_NOTE,
  STATUS_FOCUS,
  STATUS_HEAD,
  STATUS_SUB,
  TREND_LEGEND,
  UPDATE_GUIDE,
  type ChurchReport,
  type ChurchStatusDoc,
  type LineNote,
  type Rag,
  type RiskRow,
} from "@/lib/status/types";

type Bucket = "inventory" | "sourcing" | "packing" | "delivery";

function emptyRisk(): RiskRow {
  return {
    id: genId("risk"),
    priority: "High",
    area: "",
    risk: "",
    impact: "",
    action: "",
    owner: "",
    due: "",
    status: "🟡 Open",
  };
}

function heads(labels: string[]) {
  return labels.map((h) => (
    <th key={h} className="colh">
      {h}
    </th>
  ));
}

function FieldCell({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      className="w-full bg-transparent outline-none"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function StatusSheet({
  report,
  doc,
  onDoc,
}: {
  report: ChurchReport;
  doc: ChurchStatusDoc;
  onDoc: (fn: (d: ChurchStatusDoc) => ChurchStatusDoc) => void;
}) {
  function patchChurch(id: string, patch: ChurchStatusDoc["churches"][string]) {
    onDoc((d) => ({
      ...d,
      churches: { ...d.churches, [id]: { ...d.churches[id], ...patch } },
    }));
  }
  function patchNote(bucket: Bucket, id: string, patch: LineNote) {
    onDoc((d) => ({
      ...d,
      [bucket]: { ...d[bucket], [id]: { ...d[bucket][id], ...patch } },
    }));
  }

  const churches = report.churches.length
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
      ];

  return (
    <div className="overflow-x-auto">
      <style>{SHEET_CSS}</style>
      <div className="bb-sr min-w-[1100px]">
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
                {STATUS_HEAD}
              </td>
            </tr>
            <tr>
              <td className="brand" colSpan={8}>
                {STATUS_SUB}
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
              <td colSpan={7}>{report.focus}</td>
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
              {heads(["KPI", "Current Week", "Previous Week", "Trend", "Status"])}
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
                <td className="center">
                  {k.status === "yellow" ? "🟡" : k.status === "red" ? "🔴" : "🟢"}
                </td>
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
                2. CHURCH-LEVEL DISTRIBUTION PERFORMANCE
              </td>
            </tr>
            <tr>
              {heads([
                "Church",
                "Status",
                "Units Distributed",
                "Sales Value (EGP)",
                "Payment",
                "Delivery",
                "Key Issue / Risk",
                "Next Action",
              ])}
            </tr>
            {churches.map((c) => (
              <tr key={c.id || c.name} className={`rag-${c.rag}`}>
                <td>{c.name}</td>
                <td className="center">
                  {c.id ? (
                    <select
                      className="w-full bg-transparent text-center outline-none"
                      value={doc.churches[c.id]?.rag || ""}
                      onChange={(e) =>
                        patchChurch(c.id, { rag: (e.target.value || "") as Rag | "" })
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
                      onChange={(e) => patchChurch(c.id, { delivery: e.target.value })}
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
                    <FieldCell
                      value={doc.churches[c.id]?.issue ?? ""}
                      placeholder={c.issue}
                      onChange={(issue) => patchChurch(c.id, { issue })}
                    />
                  ) : (
                    c.issue
                  )}
                </td>
                <td>
                  {c.id ? (
                    <FieldCell
                      value={doc.churches[c.id]?.nextAction ?? ""}
                      placeholder={c.nextAction}
                      onChange={(nextAction) => patchChurch(c.id, { nextAction })}
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
                3. INVENTORY &amp; SUPPLY READINESS
              </td>
            </tr>
            <tr>
              {heads([
                "Item / Product",
                "Opening Stock",
                "Received (Week)",
                "Distributed (Week)",
                "Closing Stock",
                "Reorder Level",
                "Status",
                "Notes",
              ])}
            </tr>
            {(report.inventory.length
              ? report.inventory
              : [
                  {
                    id: "",
                    name: "—",
                    opening: 0,
                    received: 0,
                    distributed: 0,
                    closing: 0,
                    reorder: 0,
                    rag: "green" as const,
                    statusLabel: "🟢 OK",
                    notes: "—",
                  },
                ]
            ).map((r) => (
              <tr key={r.id || r.name} className={`rag-${r.rag}`}>
                <td>{r.name}</td>
                <td className="num">{r.opening}</td>
                <td className="num">{r.received}</td>
                <td className="num">{r.distributed}</td>
                <td className="num">{r.closing}</td>
                <td className="num">{r.reorder}</td>
                <td>{r.statusLabel}</td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.inventory[r.id]?.notes ?? ""}
                      placeholder={r.notes}
                      onChange={(notes) => patchNote("inventory", r.id, { notes })}
                    />
                  ) : (
                    r.notes
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
                4. PRODUCT SOURCING / PROCUREMENT &amp; PARTNERS
              </td>
            </tr>
            <tr>
              {heads([
                "Partner / Supplier",
                "Item / Product",
                "Order Placed",
                "Expected Delivery",
                "Qty Ordered",
                "Qty Received",
                "Payment Status",
                "Status",
              ])}
            </tr>
            {(report.sourcing.length
              ? report.sourcing
              : [
                  {
                    id: "",
                    partner: "—",
                    item: "—",
                    orderPlaced: "—",
                    expectedDelivery: "—",
                    qtyOrdered: 0,
                    qtyReceived: 0,
                    payment: "—",
                    rag: "green" as const,
                    statusLabel: "🟢 On Track",
                  },
                ]
            ).map((r) => (
              <tr key={r.id || r.partner} className={`rag-${r.rag}`}>
                <td>{r.partner}</td>
                <td>{r.item}</td>
                <td>{r.orderPlaced}</td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.sourcing[r.id]?.scheduled ?? ""}
                      placeholder={r.expectedDelivery}
                      onChange={(scheduled) => patchNote("sourcing", r.id, { scheduled })}
                    />
                  ) : (
                    r.expectedDelivery
                  )}
                </td>
                <td className="num">{r.qtyOrdered || ""}</td>
                <td className="num">{r.qtyReceived || ""}</td>
                <td>
                  {r.id ? (
                    <select
                      className="w-full bg-transparent outline-none"
                      value={doc.sourcing[r.id]?.payment || ""}
                      onChange={(e) => patchNote("sourcing", r.id, { payment: e.target.value })}
                    >
                      <option value="">Auto · {r.payment}</option>
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  ) : (
                    r.payment
                  )}
                </td>
                <td>{r.statusLabel}</td>
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
                5. PACKING &amp; LABELING READINESS
              </td>
            </tr>
            <tr>
              {heads([
                "Product / Batch",
                "Units to Pack",
                "Units Packed",
                "Units Labeled",
                "Ready for Dispatch",
                "Status",
                "Owner",
                "Notes",
              ])}
            </tr>
            {(report.packing.length
              ? report.packing
              : [
                  {
                    id: "",
                    product: "—",
                    toPack: 0,
                    packed: 0,
                    labeled: 0,
                    ready: 0,
                    rag: "green" as const,
                    statusLabel: "🟢 On Track",
                    owner: "[Owner]",
                    notes: "—",
                  },
                ]
            ).map((r) => (
              <tr key={r.id || r.product} className={`rag-${r.rag}`}>
                <td>{r.product}</td>
                <td className="num">{r.toPack || ""}</td>
                <td className="num">{r.packed || ""}</td>
                <td className="num">{r.labeled || ""}</td>
                <td className="num">{r.ready || ""}</td>
                <td>{r.statusLabel}</td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.packing[r.id]?.owner ?? ""}
                      placeholder={r.owner}
                      onChange={(owner) => patchNote("packing", r.id, { owner })}
                    />
                  ) : (
                    r.owner
                  )}
                </td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.packing[r.id]?.notes ?? ""}
                      placeholder={r.notes}
                      onChange={(notes) => patchNote("packing", r.id, { notes })}
                    />
                  ) : (
                    r.notes
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
                6. DELIVERY &amp; DISTRIBUTION EXECUTION
              </td>
            </tr>
            <tr>
              {heads([
                "Church / Destination",
                "Scheduled Date",
                "Actual Delivery Date",
                "Units Delivered",
                "Delivery Method",
                "Status",
                "Delay Reason",
                "Next Action",
              ])}
            </tr>
            {(report.deliveries.length
              ? report.deliveries
              : [
                  {
                    id: "",
                    church: "—",
                    scheduled: "—",
                    actual: "—",
                    units: 0,
                    method: "—",
                    rag: "green" as const,
                    statusLabel: "🟢 Delivered",
                    delay: "—",
                    nextAction: "—",
                  },
                ]
            ).map((r) => (
              <tr key={r.id || r.church} className={`rag-${r.rag}`}>
                <td>{r.church}</td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.delivery[r.id]?.scheduled ?? ""}
                      placeholder={r.scheduled}
                      onChange={(scheduled) => patchNote("delivery", r.id, { scheduled })}
                    />
                  ) : (
                    r.scheduled
                  )}
                </td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.delivery[r.id]?.actual ?? ""}
                      placeholder={r.actual}
                      onChange={(actual) => patchNote("delivery", r.id, { actual })}
                    />
                  ) : (
                    r.actual
                  )}
                </td>
                <td className="num">{r.units || ""}</td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.delivery[r.id]?.method ?? ""}
                      placeholder={r.method}
                      onChange={(method) => patchNote("delivery", r.id, { method })}
                    />
                  ) : (
                    r.method
                  )}
                </td>
                <td>{r.statusLabel}</td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.delivery[r.id]?.delay ?? ""}
                      placeholder={r.delay}
                      onChange={(delay) => patchNote("delivery", r.id, { delay })}
                    />
                  ) : (
                    r.delay
                  )}
                </td>
                <td>
                  {r.id ? (
                    <FieldCell
                      value={doc.delivery[r.id]?.nextAction ?? ""}
                      placeholder={r.nextAction}
                      onChange={(nextAction) => patchNote("delivery", r.id, { nextAction })}
                    />
                  ) : (
                    r.nextAction
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
                7. RISKS, ISSUES &amp; MANAGEMENT ACTIONS
              </td>
            </tr>
            <tr>
              {heads([
                "Priority",
                "Area / Church",
                "Risk / Issue",
                "Business Impact",
                "Action",
                "Owner",
                "Due Date",
                "Status",
              ])}
            </tr>
            {(doc.risks.length ? doc.risks : report.risks).map((risk, i) => (
              <RiskEditor
                key={risk.id || i}
                risk={risk}
                onChange={(patch) => {
                  const base = doc.risks.length ? doc.risks : report.risks;
                  onDoc((d) => ({
                    ...d,
                    risks: base.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
                  }));
                }}
                onRemove={() => {
                  const base = doc.risks.length ? doc.risks : report.risks;
                  onDoc((d) => ({ ...d, risks: base.filter((_, idx) => idx !== i) }));
                }}
              />
            ))}
            <tr>
              <td colSpan={8}>
                <button
                  type="button"
                  className="text-sm text-[var(--bb-gold)] underline"
                  onClick={() =>
                    onDoc((d) => ({
                      ...d,
                      risks: [...(d.risks.length ? d.risks : report.risks), emptyRisk()],
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
                8. ACHIEVEMENTS / CHALLENGES / NEXT-WEEK PRIORITIES
              </td>
            </tr>
            <tr>
              <td className="label">Achievements</td>
              <td colSpan={7}>
                <TextArea
                  rows={3}
                  value={doc.achievements}
                  placeholder={report.achievements}
                  onChange={(e) => onDoc((d) => ({ ...d, achievements: e.target.value }))}
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
                  onChange={(e) => onDoc((d) => ({ ...d, challenges: e.target.value }))}
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
                  onChange={(e) => onDoc((d) => ({ ...d, nextPriorities: e.target.value }))}
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
                RAG status reflects the health of the end-to-end distribution operation —
                sourcing, inventory, packing &amp; labeling, delivery and collections. The
                report focuses on outcomes, exceptions, risks, ownership and next actions so
                management can review the full project flow quickly each week.
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
            <tr className="spacer">
              <td colSpan={8} />
            </tr>
            <tr>
              <td className="legend-h" colSpan={8}>
                Trend Arrows
              </td>
            </tr>
            {TREND_LEGEND.map((row) => (
              <tr key={row.arrow}>
                <td className="center">{row.arrow}</td>
                <td colSpan={7}>{row.definition}</td>
              </tr>
            ))}
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
              <td className="legend-h" colSpan={8}>
                HOW TO UPDATE THIS REPORT EACH WEEK
              </td>
            </tr>
            {UPDATE_GUIDE.map((row) => (
              <tr key={row.step}>
                <td className="label">{row.step}</td>
                <td colSpan={7}>{row.detail}</td>
              </tr>
            ))}
            <tr className="spacer">
              <td colSpan={8} />
            </tr>
            <tr>
              <td className="legend-h" colSpan={8}>
                REPORT FLOW
              </td>
            </tr>
            <tr>
              <td colSpan={8}>{REPORT_FLOW}</td>
            </tr>
            <tr>
              <td className="wrap" colSpan={8}>
                {REPORT_FLOW_NOTE}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusToolbar({
  report,
  doc,
  fallbackName,
  onDoc,
  onSave,
  onPrint,
  onExcel,
}: {
  report: ChurchReport;
  doc: ChurchStatusDoc;
  fallbackName: string;
  onDoc: (fn: (d: ChurchStatusDoc) => ChurchStatusDoc) => void;
  onSave: () => void;
  onPrint: () => void;
  onExcel: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Week start">
          <TextInput
            type="date"
            value={report.weekStart}
            onChange={(e) => onDoc((d) => ({ ...d, weekStart: e.target.value }))}
          />
        </Field>
        <Field label="Week end">
          <TextInput
            type="date"
            value={report.weekEnd}
            onChange={(e) => onDoc((d) => ({ ...d, weekEnd: e.target.value }))}
          />
        </Field>
        <Field label="Prepared by">
          <TextInput
            value={doc.preparedBy}
            placeholder={fallbackName || "[Name]"}
            onChange={(e) => onDoc((d) => ({ ...d, preparedBy: e.target.value }))}
          />
        </Field>
        <Field label="Overall status">
          <Select
            value={doc.overallStatus}
            onChange={(e) =>
              onDoc((d) => ({ ...d, overallStatus: (e.target.value || "") as Rag | "" }))
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
            onChange={(e) => onDoc((d) => ({ ...d, showAll: e.target.checked }))}
          />
          All churches &amp; stock
        </label>
        <ActionBtn onClick={onSave}>Save</ActionBtn>
        <ActionBtn tone="ghost" onClick={onPrint}>
          Print
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={onExcel}>
          Download Excel
        </ActionBtn>
      </div>
      <Field label="Management focus">
        <TextInput
          value={doc.managementFocus}
          placeholder={STATUS_FOCUS}
          onChange={(e) => onDoc((d) => ({ ...d, managementFocus: e.target.value }))}
        />
      </Field>
    </>
  );
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
      <td>{field("area", risk.area)}</td>
      <td>{field("risk", risk.risk)}</td>
      <td>{field("impact", risk.impact)}</td>
      <td>{field("action", risk.action)}</td>
      <td>{field("owner", risk.owner)}</td>
      <td>{field("due", risk.due)}</td>
      <td>
        <div className="flex items-center gap-2">
          {field("status", risk.status)}
          <button type="button" className="shrink-0 text-sm underline" onClick={onRemove}>
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}
