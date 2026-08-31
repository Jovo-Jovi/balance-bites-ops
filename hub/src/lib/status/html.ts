import { esc } from "@/lib/invoices/helpers";
import { churchStatusCell } from "./report";
import { SHEET_CSS } from "./sheet-css";
import {
  CHURCH_STATUS_BRAND,
  CHURCH_STATUS_FOCUS,
  CHURCH_STATUS_TITLE,
  PM_FOOTNOTE,
  RAG_LEGEND,
  type ChurchReport,
  type Rag,
} from "./types";

function ragClass(rag: Rag) {
  return `rag-${rag}`;
}

function bullets(text: string) {
  return esc(text).replace(/\n/g, "<br>");
}

export function churchReportTableHtml(report: ChurchReport) {
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

  const kpiRows = report.kpis
    .map(
      (k) => `<tr>
        <td>${esc(k.name)}</td>
        <td class="num">${esc(k.current)}</td>
        <td class="num">${esc(k.previous)}</td>
        <td class="center">${esc(k.trend)}</td>
        <td class="center">${k.status === "yellow" ? "🟡" : "🟢"}</td>
        <td></td><td></td><td></td>
      </tr>`,
    )
    .join("");

  const churchRows = churches
    .map(
      (c) => `<tr class="${ragClass(c.rag)}">
        <td>${esc(c.name)}</td>
        <td class="center">${esc(churchStatusCell(c.rag))}</td>
        <td class="num">${c.servedThisWeek ? esc(String(c.units)) : ""}</td>
        <td class="num">${c.servedThisWeek ? esc(c.sales.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : ""}</td>
        <td>${esc(c.payment)}</td>
        <td>${esc(c.delivery)}</td>
        <td>${esc(c.issue)}</td>
        <td>${esc(c.nextAction)}</td>
      </tr>`,
    )
    .join("");

  const riskRows = (report.risks.length ? report.risks : [{
    id: "",
    priority: "",
    risk: "—",
    impact: "",
    action: "",
    owner: "",
    due: "",
    status: "",
  }])
    .map((r) => {
      const tone =
        r.status.includes("🔴") ? "rag-red" : r.status.includes("🟡") ? "rag-yellow" : "";
      return `<tr class="${tone}">
        <td>${esc(r.priority)}</td>
        <td>${esc(r.risk)}</td>
        <td>${esc(r.impact)}</td>
        <td>${esc(r.action)}</td>
        <td>${esc(r.owner || "[Owner]")}</td>
        <td>${esc(r.due || "[DD/MM]")}</td>
        <td>${esc(r.status)}</td>
        <td></td>
      </tr>`;
    })
    .join("");

  const legendRows = RAG_LEGEND.map(
    (row) => `<tr>
      <td>${esc(row.label)}</td>
      <td colspan="7">${esc(row.definition)}</td>
    </tr>`,
  ).join("");

  return `<div class="bb-sr">
<table>
  <colgroup>
    <col class="cA"><col class="cB"><col class="cC"><col class="cD">
    <col class="cE"><col class="cF"><col class="cG"><col class="cH">
  </colgroup>
  <tbody>
    <tr><td class="title" colspan="8">${esc(CHURCH_STATUS_TITLE)}</td></tr>
    <tr><td class="brand" colspan="8">${esc(CHURCH_STATUS_BRAND)}</td></tr>
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr>
      <td class="label">Reporting Week</td>
      <td colspan="7">${esc(report.weekLabel)}</td>
    </tr>
    <tr>
      <td class="label">Overall Status</td>
      <td colspan="7">${esc(report.overallLabel)}</td>
    </tr>
    <tr>
      <td class="label">Prepared By</td>
      <td colspan="7">${esc(report.preparedBy || "[Name]")}</td>
    </tr>
    <tr>
      <td class="label">Management Focus</td>
      <td colspan="7">${esc(CHURCH_STATUS_FOCUS)}</td>
    </tr>
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr><td class="section" colspan="8">1. EXECUTIVE KPI SUMMARY</td></tr>
    <tr>
      <th class="colh">KPI</th>
      <th class="colh">Current Week</th>
      <th class="colh">Previous Week</th>
      <th class="colh">Trend</th>
      <th class="colh">Status</th>
      <th></th><th></th><th></th>
    </tr>
    ${kpiRows}
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr><td class="section" colspan="8">2. CHURCH-LEVEL STATUS</td></tr>
    <tr>
      <th class="colh">Church</th>
      <th class="colh">Status</th>
      <th class="colh">Units Distributed</th>
      <th class="colh">Sales Value (EGP)</th>
      <th class="colh">Payment</th>
      <th class="colh">Delivery</th>
      <th class="colh">Key Issue / Risk</th>
      <th class="colh">Next Action</th>
    </tr>
    ${churchRows}
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr><td class="section" colspan="8">3. KEY RISKS &amp; MANAGEMENT ACTIONS</td></tr>
    <tr>
      <th class="colh">Priority</th>
      <th class="colh">Risk / Issue</th>
      <th class="colh">Business Impact</th>
      <th class="colh">Action</th>
      <th class="colh">Owner</th>
      <th class="colh">Due Date</th>
      <th class="colh">Status</th>
      <th class="colh"></th>
    </tr>
    ${riskRows}
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr><td class="section" colspan="8">4. EXECUTIVE PROJECT UPDATE</td></tr>
    <tr>
      <td class="label">Achievements</td>
      <td colspan="7">${bullets(report.achievements)}</td>
    </tr>
    <tr>
      <td class="label">Challenges / Risks</td>
      <td colspan="7">${bullets(report.challenges)}</td>
    </tr>
    <tr>
      <td class="label">Next Week Priorities</td>
      <td colspan="7">${bullets(report.nextPriorities)}</td>
    </tr>
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr><td class="section" colspan="8">PROJECT MANAGEMENT VIEW</td></tr>
    <tr><td class="wrap" colspan="8">${esc(PM_FOOTNOTE)}</td></tr>
  </tbody>
</table>
<table style="margin-top:28px">
  <colgroup>
    <col class="cA"><col class="cB"><col class="cC"><col class="cD">
    <col class="cE"><col class="cF"><col class="cG"><col class="cH">
  </colgroup>
  <tbody>
    <tr>
      <td class="legend-h">Status</td>
      <td class="legend-h" colspan="7">Definition</td>
    </tr>
    ${legendRows}
  </tbody>
</table>
</div>`;
}

export function churchReportDocumentHtml(report: ChurchReport) {
  return `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(CHURCH_STATUS_BRAND)}</title>
<style>
@page { size: A4 landscape; margin: 16mm 12mm; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; }
${SHEET_CSS}
</style>
</head><body>${churchReportTableHtml(report)}
<script>window.onload=function(){window.print();};<\/script>
</body></html>`;
}
