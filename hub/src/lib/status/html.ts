import { esc } from "@/lib/invoices/helpers";
import { churchStatusCell } from "./report";
import { SHEET_CSS } from "./sheet-css";
import {
  PM_FOOTNOTE,
  RAG_LEGEND,
  REPORT_FLOW,
  REPORT_FLOW_NOTE,
  STATUS_HEAD,
  STATUS_SUB,
  TREND_LEGEND,
  UPDATE_GUIDE,
  type ChurchReport,
  type Rag,
} from "./types";

function ragClass(rag: Rag) {
  return `rag-${rag}`;
}

function bullets(text: string) {
  return esc(text).replace(/\n/g, "<br>");
}

function dash(n: number) {
  return n ? String(n) : "0";
}

function money(n: number) {
  return n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function heads(labels: string[]) {
  return labels.map((h) => `<th class="colh">${esc(h)}</th>`).join("");
}

function spacer() {
  return `<tr class="spacer"><td colspan="8"></td></tr>`;
}

function section(title: string) {
  return `<tr><td class="section" colspan="8">${esc(title)}</td></tr>`;
}

export function churchReportTableHtml(report: ChurchReport) {
  const kpiRows = report.kpis
    .map(
      (k) => `<tr>
        <td>${esc(k.name)}</td>
        <td class="num">${esc(k.current)}</td>
        <td class="num">${esc(k.previous)}</td>
        <td class="center">${esc(k.trend)}</td>
        <td class="center">${k.status === "yellow" ? "🟡" : k.status === "red" ? "🔴" : "🟢"}</td>
        <td></td><td></td><td></td>
      </tr>`,
    )
    .join("");

  const churchRows = (report.churches.length ? report.churches : [{
    name: "—", rag: "green" as const, units: 0, sales: 0, payment: "—" as const,
    delivery: "—" as const, issue: "—", nextAction: "—", servedThisWeek: false,
  }])
    .map(
      (c) => `<tr class="${ragClass(c.rag)}">
        <td>${esc(c.name)}</td>
        <td class="center">${esc(churchStatusCell(c.rag))}</td>
        <td class="num">${c.servedThisWeek ? esc(String(c.units)) : ""}</td>
        <td class="num">${c.servedThisWeek ? esc(money(c.sales)) : ""}</td>
        <td>${esc(c.payment)}</td>
        <td>${esc(c.delivery)}</td>
        <td>${esc(c.issue)}</td>
        <td>${esc(c.nextAction)}</td>
      </tr>`,
    )
    .join("");

  const inventoryRows = (report.inventory.length ? report.inventory : [{
    name: "—", opening: 0, received: 0, distributed: 0, closing: 0, reorder: 0,
    rag: "green" as const, statusLabel: "🟢 OK", notes: "—",
  }])
    .map(
      (r) => `<tr class="${ragClass(r.rag)}">
        <td>${esc(r.name)}</td>
        <td class="num">${esc(dash(r.opening))}</td>
        <td class="num">${esc(dash(r.received))}</td>
        <td class="num">${esc(dash(r.distributed))}</td>
        <td class="num">${esc(dash(r.closing))}</td>
        <td class="num">${esc(dash(r.reorder))}</td>
        <td>${esc(r.statusLabel)}</td>
        <td>${esc(r.notes)}</td>
      </tr>`,
    )
    .join("");

  const sourcingRows = (report.sourcing.length ? report.sourcing : [{
    partner: "—", item: "—", orderPlaced: "—", expectedDelivery: "—",
    qtyOrdered: 0, qtyReceived: 0, payment: "—", rag: "green" as const,
    statusLabel: "🟢 On Track",
  }])
    .map(
      (r) => `<tr class="${ragClass(r.rag)}">
        <td>${esc(r.partner)}</td>
        <td>${esc(r.item)}</td>
        <td>${esc(r.orderPlaced)}</td>
        <td>${esc(r.expectedDelivery)}</td>
        <td class="num">${r.qtyOrdered ? esc(dash(r.qtyOrdered)) : ""}</td>
        <td class="num">${r.qtyReceived ? esc(dash(r.qtyReceived)) : ""}</td>
        <td>${esc(r.payment)}</td>
        <td>${esc(r.statusLabel)}</td>
      </tr>`,
    )
    .join("");

  const packingRows = (report.packing.length ? report.packing : [{
    product: "—", toPack: 0, packed: 0, labeled: 0, ready: 0,
    rag: "green" as const, statusLabel: "🟢 On Track", owner: "[Owner]", notes: "—",
  }])
    .map(
      (r) => `<tr class="${ragClass(r.rag)}">
        <td>${esc(r.product)}</td>
        <td class="num">${r.toPack ? esc(dash(r.toPack)) : ""}</td>
        <td class="num">${r.packed ? esc(dash(r.packed)) : ""}</td>
        <td class="num">${r.labeled ? esc(dash(r.labeled)) : ""}</td>
        <td class="num">${r.ready ? esc(dash(r.ready)) : ""}</td>
        <td>${esc(r.statusLabel)}</td>
        <td>${esc(r.owner)}</td>
        <td>${esc(r.notes)}</td>
      </tr>`,
    )
    .join("");

  const deliveryRows = (report.deliveries.length ? report.deliveries : [{
    church: "—", scheduled: "—", actual: "—", units: 0, method: "—",
    rag: "green" as const, statusLabel: "🟢 Delivered", delay: "—", nextAction: "—",
  }])
    .map(
      (r) => `<tr class="${ragClass(r.rag)}">
        <td>${esc(r.church)}</td>
        <td>${esc(r.scheduled)}</td>
        <td>${esc(r.actual)}</td>
        <td class="num">${r.units ? esc(dash(r.units)) : ""}</td>
        <td>${esc(r.method)}</td>
        <td>${esc(r.statusLabel)}</td>
        <td>${esc(r.delay)}</td>
        <td>${esc(r.nextAction)}</td>
      </tr>`,
    )
    .join("");

  const riskRows = (report.risks.length ? report.risks : [{
    priority: "", area: "", risk: "—", impact: "", action: "", owner: "", due: "", status: "",
  }])
    .map((r) => {
      const tone =
        r.status.includes("🔴") ? "rag-red" : r.status.includes("🟡") ? "rag-yellow" : "rag-green";
      return `<tr class="${tone}">
        <td>${esc(r.priority)}</td>
        <td>${esc(r.area)}</td>
        <td>${esc(r.risk)}</td>
        <td>${esc(r.impact)}</td>
        <td>${esc(r.action)}</td>
        <td>${esc(r.owner || "[Owner]")}</td>
        <td>${esc(r.due || "[DD/MM]")}</td>
        <td>${esc(r.status)}</td>
      </tr>`;
    })
    .join("");

  const legendRows = RAG_LEGEND.map(
    (row) => `<tr>
      <td>${esc(row.label)}</td>
      <td colspan="7">${esc(row.definition)}</td>
    </tr>`,
  ).join("");

  const trendRows = TREND_LEGEND.map(
    (row) => `<tr>
      <td class="center">${esc(row.arrow)}</td>
      <td colspan="7">${esc(row.definition)}</td>
    </tr>`,
  ).join("");

  const guideRows = UPDATE_GUIDE.map(
    (row) => `<tr>
      <td class="label">${esc(row.step)}</td>
      <td colspan="7">${esc(row.detail)}</td>
    </tr>`,
  ).join("");

  return `<div class="bb-sr">
<table>
  <colgroup>
    <col class="cA"><col class="cB"><col class="cC"><col class="cD">
    <col class="cE"><col class="cF"><col class="cG"><col class="cH">
  </colgroup>
  <tbody>
    <tr><td class="title" colspan="8">${esc(STATUS_HEAD)}</td></tr>
    <tr><td class="brand" colspan="8">${esc(STATUS_SUB)}</td></tr>
    ${spacer()}
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
      <td colspan="7">${esc(report.focus)}</td>
    </tr>
    ${spacer()}
    ${section("1. EXECUTIVE KPI SUMMARY")}
    <tr>
      ${heads(["KPI", "Current Week", "Previous Week", "Trend", "Status"])}
      <th></th><th></th><th></th>
    </tr>
    ${kpiRows}
    ${spacer()}${spacer()}
    ${section("2. CHURCH-LEVEL DISTRIBUTION PERFORMANCE")}
    <tr>
      ${heads(["Church", "Status", "Units Distributed", "Sales Value (EGP)", "Payment", "Delivery", "Key Issue / Risk", "Next Action"])}
    </tr>
    ${churchRows}
    ${spacer()}${spacer()}
    ${section("3. INVENTORY & SUPPLY READINESS")}
    <tr>
      ${heads(["Item / Product", "Opening Stock", "Received (Week)", "Distributed (Week)", "Closing Stock", "Reorder Level", "Status", "Notes"])}
    </tr>
    ${inventoryRows}
    ${spacer()}${spacer()}
    ${section("4. PRODUCT SOURCING / PROCUREMENT & PARTNERS")}
    <tr>
      ${heads(["Partner / Supplier", "Item / Product", "Order Placed", "Expected Delivery", "Qty Ordered", "Qty Received", "Payment Status", "Status"])}
    </tr>
    ${sourcingRows}
    ${spacer()}${spacer()}
    ${section("5. PACKING & LABELING READINESS")}
    <tr>
      ${heads(["Product / Batch", "Units to Pack", "Units Packed", "Units Labeled", "Ready for Dispatch", "Status", "Owner", "Notes"])}
    </tr>
    ${packingRows}
    ${spacer()}${spacer()}
    ${section("6. DELIVERY & DISTRIBUTION EXECUTION")}
    <tr>
      ${heads(["Church / Destination", "Scheduled Date", "Actual Delivery Date", "Units Delivered", "Delivery Method", "Status", "Delay Reason", "Next Action"])}
    </tr>
    ${deliveryRows}
    ${spacer()}${spacer()}
    ${section("7. RISKS, ISSUES & MANAGEMENT ACTIONS")}
    <tr>
      ${heads(["Priority", "Area / Church", "Risk / Issue", "Business Impact", "Action", "Owner", "Due Date", "Status"])}
    </tr>
    ${riskRows}
    ${spacer()}${spacer()}
    ${section("8. ACHIEVEMENTS / CHALLENGES / NEXT-WEEK PRIORITIES")}
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
    ${spacer()}${spacer()}
    ${section("PROJECT MANAGEMENT VIEW")}
    <tr><td class="wrap" colspan="8">${esc(PM_FOOTNOTE)}</td></tr>
  </tbody>
</table>
<table class="guide">
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
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr><td class="legend-h" colspan="8">Trend Arrows</td></tr>
    ${trendRows}
  </tbody>
</table>
<table class="guide">
  <colgroup>
    <col class="cA"><col class="cB"><col class="cC"><col class="cD">
    <col class="cE"><col class="cF"><col class="cG"><col class="cH">
  </colgroup>
  <tbody>
    <tr><td class="legend-h" colspan="8">HOW TO UPDATE THIS REPORT EACH WEEK</td></tr>
    ${guideRows}
    <tr class="spacer"><td colspan="8"></td></tr>
    <tr><td class="legend-h" colspan="8">REPORT FLOW</td></tr>
    <tr><td colspan="8">${esc(REPORT_FLOW)}</td></tr>
    <tr><td class="wrap" colspan="8">${esc(REPORT_FLOW_NOTE)}</td></tr>
  </tbody>
</table>
</div>`;
}

export function churchReportDocumentHtml(report: ChurchReport) {
  return `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(STATUS_HEAD)}</title>
<style>
@page { size: A4 landscape; margin: 12mm 8mm; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; }
${SHEET_CSS}
</style>
</head><body>${churchReportTableHtml(report)}
<script>window.onload=function(){window.print();};<\/script>
</body></html>`;
}
