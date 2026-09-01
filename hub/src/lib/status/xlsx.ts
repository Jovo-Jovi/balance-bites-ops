import { zipStore } from "@/lib/zip-store";
import { churchStatusCell } from "./report";
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

const COLS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

type XCell = { s: number; v?: string | number; f?: string };

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF0B4F3B"/><name val="Calibri"/></font>
<font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0B4F3B"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE8F1ED"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF4CCCC"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFD9E1E8"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const MAIN_COLS =
  `<col min="1" max="1" width="24" customWidth="1"/>` +
  `<col min="2" max="2" width="20" customWidth="1"/>` +
  `<col min="3" max="4" width="13" customWidth="1"/>` +
  `<col min="5" max="5" width="18" customWidth="1"/>` +
  `<col min="6" max="6" width="13" customWidth="1"/>` +
  `<col min="7" max="7" width="26" customWidth="1"/>` +
  `<col min="8" max="8" width="30" customWidth="1"/>`;

function xesc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ragStyle(rag: Rag) {
  if (rag === "yellow") return 5;
  if (rag === "red") return 6;
  return 4;
}

function blankRow(s = 1): XCell[] {
  return COLS.map(() => ({ s }));
}

function fillRow(base: XCell[]): XCell[] {
  const out = blankRow(base[0]?.s ?? 1);
  base.forEach((c, i) => {
    if (c) out[i] = c;
  });
  return out;
}

function emitSheet(
  rows: XCell[][],
  merges: string[],
  extra?: { heights?: Record<number, number>; filter?: string; cols?: string },
) {
  const strings: string[] = [];
  const index = new Map<string, number>();
  function sid(v: string) {
    const hit = index.get(v);
    if (hit != null) return hit;
    const i = strings.length;
    strings.push(v);
    index.set(v, i);
    return i;
  }

  const last = rows.length;
  const body: string[] = [];
  rows.forEach((cells, i) => {
    const r = i + 1;
    const ht = extra?.heights?.[r];
    const htAttr = ht ? ` ht="${ht}" customHeight="1"` : "";
    const inner = COLS.map((col, c) => {
      const cell = cells[c] || { s: 1 };
      const ref = `${col}${r}`;
      if (cell.f) {
        return `<c r="${ref}" s="${cell.s}"><f>${xesc(cell.f)}</f></c>`;
      }
      if (cell.v == null || cell.v === "") {
        return `<c r="${ref}" s="${cell.s}"/>`;
      }
      if (typeof cell.v === "number") {
        return `<c r="${ref}" s="${cell.s}"><v>${cell.v}</v></c>`;
      }
      return `<c r="${ref}" s="${cell.s}" t="s"><v>${sid(cell.v)}</v></c>`;
    }).join("");
    body.push(`<row r="${r}" spans="1:8"${htAttr}>${inner}</row>`);
  });

  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges
        .map((ref) => `<mergeCell ref="${ref}"/>`)
        .join("")}</mergeCells>`
    : "";
  const filterXml = extra?.filter
    ? `<autoFilter ref="${extra.filter}"/>`
    : "";

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:H${last}"/>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${extra?.cols || MAIN_COLS}</cols>` +
    `<sheetData>${body.join("")}</sheetData>` +
    mergeXml +
    filterXml +
    `<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.5" footer="0.5"/>` +
    `<pageSetup orientation="landscape" paperSize="1" fitToWidth="1" fitToHeight="0"/>` +
    `</worksheet>`;

  return { sheet, strings };
}

function sharedStringsXml(strings: string[]) {
  const sis = strings
    .map((s) => {
      const t = xesc(s);
      const space = /^\s|\s$|\n/.test(s) ? ` xml:space="preserve"` : "";
      return `<si><t${space}>${t}</t></si>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">` +
    sis +
    `</sst>`
  );
}

function mergeStringSheets(
  primary: { sheet: string; strings: string[] },
  extras: { sheet: string; strings: string[] }[],
) {
  const allStrings = [...primary.strings];
  const sheets = [primary.sheet];
  extras.forEach((extra) => {
    const remap = new Map<number, number>();
    extra.strings.forEach((s, i) => {
      const existing = allStrings.indexOf(s);
      remap.set(i, existing >= 0 ? existing : (allStrings.push(s), allStrings.length - 1));
    });
    let xml = extra.sheet;
    for (let i = extra.strings.length - 1; i >= 0; i--) {
      const next = remap.get(i);
      if (next == null || next === i) continue;
      xml = xml.replaceAll(`t="s"><v>${i}</v>`, `t="s"><v>${next}</v>`);
    }
    sheets.push(xml);
  });
  return { sheets, allStrings };
}

function kpiDot(status: Rag) {
  if (status === "yellow") return "🟡";
  if (status === "red") return "🔴";
  return "🟢";
}

export function churchReportXlsx(report: ChurchReport): Uint8Array {
  const rows: XCell[][] = [];
  const merges: string[] = [];
  const heights: Record<number, number> = { 1: 31.5 };
  const push = (cells: XCell[], ht?: number) => {
    rows.push(fillRow(cells));
    const r = rows.length;
    if (ht) heights[r] = ht;
    return r;
  };
  const mergeAH = (r: number) => merges.push(`A${r}:H${r}`);
  const mergeBH = (r: number) => merges.push(`B${r}:H${r}`);
  const section = (title: string) => mergeAH(push([{ s: 8, v: title }], 16.15));
  const headers = (labels: string[]) =>
    push(
      labels.map((v) => ({ s: 3, v })),
      30,
    );

  mergeAH(push([{ s: 13, v: STATUS_HEAD }], 31.5));
  mergeAH(push([{ s: 12, v: STATUS_SUB }]));
  push(blankRow(1));
  (
    [
      ["Reporting Week", report.weekLabel],
      ["Overall Status", report.overallLabel],
      ["Prepared By", report.preparedBy || "[Name]"],
      ["Management Focus", report.focus],
    ] as [string, string][]
  ).forEach(([label, value]) => {
    mergeBH(push([{ s: 2, v: label }, { s: 1, v: value }]));
  });
  push(blankRow(1));

  section("1. EXECUTIVE KPI SUMMARY");
  headers(["KPI", "Current Week", "Previous Week", "Trend", "Status"]);
  report.kpis.forEach((k) => {
    push([
      { s: 1, v: k.name },
      { s: 1, v: k.current },
      { s: 1, v: k.previous },
      { s: 1, v: k.trend },
      { s: 1, v: kpiDot(k.status) },
    ]);
  });
  push(blankRow(1));
  push(blankRow(1));

  section("2. CHURCH-LEVEL DISTRIBUTION PERFORMANCE");
  const churchHead = headers([
    "Church",
    "Status",
    "Units Distributed",
    "Sales Value (EGP)",
    "Payment",
    "Delivery",
    "Key Issue / Risk",
    "Next Action",
  ]);
  const churchList = report.churches.length
    ? report.churches
    : [{ name: "—", rag: "green" as Rag, units: 0, sales: 0, payment: "—", delivery: "—", issue: "—", nextAction: "—", servedThisWeek: false }];
  churchList.forEach((c) => {
    const s = ragStyle(c.rag);
    push([
      { s, v: c.name },
      { s, v: churchStatusCell(c.rag) },
      { s, v: c.servedThisWeek ? c.units : "" },
      { s, v: c.servedThisWeek ? Math.round(c.sales * 100) / 100 : "" },
      { s, v: c.payment },
      { s, v: c.delivery },
      { s, v: c.issue },
      { s, v: c.nextAction },
    ]);
  });
  const churchEnd = rows.length;
  push(blankRow(1));
  push(blankRow(1));

  section("3. INVENTORY & SUPPLY READINESS");
  headers([
    "Item / Product",
    "Opening Stock",
    "Received (Week)",
    "Distributed (Week)",
    "Closing Stock",
    "Reorder Level",
    "Status",
    "Notes",
  ]);
  const invList = report.inventory.length
    ? report.inventory
    : [{ name: "—", opening: 0, received: 0, distributed: 0, reorder: 0, statusLabel: "🟢 OK", notes: "—", rag: "green" as Rag }];
  invList.forEach((r) => {
    const s = ragStyle(r.rag);
    const row = push([
      { s, v: r.name },
      { s, v: r.opening },
      { s, v: r.received },
      { s, v: r.distributed },
      { s, f: `B${rows.length + 1}+C${rows.length + 1}-D${rows.length + 1}` },
      { s, v: r.reorder },
      { s, v: r.statusLabel },
      { s, v: r.notes },
    ]);
    rows[row - 1][4] = { s, f: `B${row}+C${row}-D${row}` };
  });
  push(blankRow(1));
  push(blankRow(1));

  section("4. PRODUCT SOURCING / PROCUREMENT & PARTNERS");
  headers([
    "Partner / Supplier",
    "Item / Product",
    "Order Placed",
    "Expected Delivery",
    "Qty Ordered",
    "Qty Received",
    "Payment Status",
    "Status",
  ]);
  const srcList = report.sourcing.length
    ? report.sourcing
    : [{ partner: "—", item: "—", orderPlaced: "—", expectedDelivery: "—", qtyOrdered: 0, qtyReceived: 0, payment: "—", statusLabel: "🟢 On Track", rag: "green" as Rag }];
  srcList.forEach((r) => {
    const s = ragStyle(r.rag);
    push([
      { s, v: r.partner },
      { s, v: r.item },
      { s, v: r.orderPlaced },
      { s, v: r.expectedDelivery },
      { s, v: r.qtyOrdered || "" },
      { s, v: r.qtyReceived || "" },
      { s, v: r.payment },
      { s, v: r.statusLabel },
    ]);
  });
  push(blankRow(1));
  push(blankRow(1));

  section("5. PACKING & LABELING READINESS");
  headers([
    "Product / Batch",
    "Units to Pack",
    "Units Packed",
    "Units Labeled",
    "Ready for Dispatch",
    "Status",
    "Owner",
    "Notes",
  ]);
  const packList = report.packing.length
    ? report.packing
    : [{ product: "—", toPack: 0, packed: 0, labeled: 0, ready: 0, statusLabel: "🟢 On Track", owner: "[Owner]", notes: "—", rag: "green" as Rag }];
  packList.forEach((r) => {
    const s = ragStyle(r.rag);
    push([
      { s, v: r.product },
      { s, v: r.toPack || "" },
      { s, v: r.packed || "" },
      { s, v: r.labeled || "" },
      { s, v: r.ready || "" },
      { s, v: r.statusLabel },
      { s, v: r.owner },
      { s, v: r.notes },
    ]);
  });
  push(blankRow(1));
  push(blankRow(1));

  section("6. DELIVERY & DISTRIBUTION EXECUTION");
  headers([
    "Church / Destination",
    "Scheduled Date",
    "Actual Delivery Date",
    "Units Delivered",
    "Delivery Method",
    "Status",
    "Delay Reason",
    "Next Action",
  ]);
  const delivList = report.deliveries.length
    ? report.deliveries
    : [{ church: "—", scheduled: "—", actual: "—", units: 0, method: "—", statusLabel: "🟢 Delivered", delay: "—", nextAction: "—", rag: "green" as Rag }];
  delivList.forEach((r) => {
    const s = ragStyle(r.rag);
    push([
      { s, v: r.church },
      { s, v: r.scheduled },
      { s, v: r.actual },
      { s, v: r.units || "" },
      { s, v: r.method },
      { s, v: r.statusLabel },
      { s, v: r.delay },
      { s, v: r.nextAction },
    ]);
  });
  push(blankRow(1));
  push(blankRow(1));

  section("7. RISKS, ISSUES & MANAGEMENT ACTIONS");
  headers([
    "Priority",
    "Area / Church",
    "Risk / Issue",
    "Business Impact",
    "Action",
    "Owner",
    "Due Date",
    "Status",
  ]);
  const risks = report.risks.length
    ? report.risks
    : [{ priority: "", area: "", risk: "—", impact: "", action: "", owner: "", due: "", status: "" }];
  risks.forEach((risk) => {
    const s = risk.status.includes("🔴") ? 6 : risk.status.includes("🟡") ? 5 : 4;
    push([
      { s, v: risk.priority },
      { s, v: risk.area },
      { s, v: risk.risk },
      { s, v: risk.impact },
      { s, v: risk.action },
      { s, v: risk.owner || "[Owner]" },
      { s, v: risk.due || "[DD/MM]" },
      { s, v: risk.status },
    ]);
  });
  push(blankRow(1));
  push(blankRow(1));

  section("8. ACHIEVEMENTS / CHALLENGES / NEXT-WEEK PRIORITIES");
  (
    [
      ["Achievements", report.achievements],
      ["Challenges / Risks", report.challenges],
      ["Next Week Priorities", report.nextPriorities],
    ] as [string, string][]
  ).forEach(([label, value]) => {
    mergeBH(push([{ s: 2, v: label }, { s: 11, v: value }], label === "Next Week Priorities" ? 69.75 : 39.75));
  });
  push(blankRow(1));
  push(blankRow(1));
  mergeAH(push([{ s: 8, v: "PROJECT MANAGEMENT VIEW" }], 16.15));
  const note = push([{ s: 10, v: PM_FOOTNOTE }]);
  merges.push(`A${note}:H${note + 1}`);
  push(blankRow(9));

  const main = emitSheet(rows, merges, {
    heights,
    filter: `A${churchHead}:H${churchEnd}`,
  });

  const legendRows: XCell[][] = [
    fillRow([{ s: 7, v: "RAG Legend" }]),
    ...RAG_LEGEND.map((row) =>
      fillRow([
        { s: 1, v: row.label },
        { s: 1, v: row.definition },
      ]),
    ),
    blankRow(1),
    fillRow([{ s: 7, v: "Trend Arrows" }]),
    ...TREND_LEGEND.map((row) =>
      fillRow([
        { s: 1, v: row.arrow },
        { s: 1, v: row.definition },
      ]),
    ),
  ];
  const legendMerges = ["A1:B1", "A6:B6"];
  const legend = emitSheet(legendRows, legendMerges, {
    cols: `<col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="95" customWidth="1"/><col min="3" max="8" width="8" customWidth="1"/>`,
    heights: { 1: 16.15, 3: 28.35, 6: 16.15 },
  });

  const guideRows: XCell[][] = [
    fillRow([{ s: 7, v: "HOW TO UPDATE THIS REPORT EACH WEEK" }]),
    blankRow(1),
    ...UPDATE_GUIDE.map((row) =>
      fillRow([
        { s: 2, v: row.step },
        { s: 11, v: row.detail },
      ]),
    ),
    blankRow(1),
    fillRow([{ s: 7, v: "REPORT FLOW" }]),
    fillRow([{ s: 1, v: REPORT_FLOW }]),
    blankRow(1),
    fillRow([{ s: 10, v: REPORT_FLOW_NOTE }]),
    blankRow(9),
  ];
  const guideMerges = [
    "A1:B1",
    ...UPDATE_GUIDE.map((_, i) => `B${i + 3}:H${i + 3}`),
    `A${UPDATE_GUIDE.length + 4}:B${UPDATE_GUIDE.length + 4}`,
    `A${UPDATE_GUIDE.length + 5}:H${UPDATE_GUIDE.length + 5}`,
    `A${UPDATE_GUIDE.length + 7}:H${UPDATE_GUIDE.length + 8}`,
  ];
  const guideHeights: Record<number, number> = { 1: 16.15 };
  UPDATE_GUIDE.forEach((_, i) => {
    guideHeights[i + 3] = 45;
  });
  const guide = emitSheet(guideRows, guideMerges, {
    cols: `<col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="95" customWidth="1"/><col min="3" max="8" width="8" customWidth="1"/>`,
    heights: guideHeights,
  });

  const { sheets, allStrings } = mergeStringSheets(main, [legend, guide]);

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Weekly Status Report" sheetId="1" r:id="rId1"/>
<sheet name="RAG Legend" sheetId="2" r:id="rId2"/>
<sheet name="Update Guide" sheetId="3" r:id="rId3"/>
</sheets>
</workbook>`;

  const enc = new TextEncoder();
  return zipStore([
    { name: "[Content_Types].xml", bytes: enc.encode(contentTypes) },
    { name: "_rels/.rels", bytes: enc.encode(rels) },
    { name: "xl/workbook.xml", bytes: enc.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", bytes: enc.encode(wbRels) },
    { name: "xl/styles.xml", bytes: enc.encode(STYLES_XML) },
    { name: "xl/sharedStrings.xml", bytes: enc.encode(sharedStringsXml(allStrings)) },
    { name: "xl/worksheets/sheet1.xml", bytes: enc.encode(sheets[0]) },
    { name: "xl/worksheets/sheet2.xml", bytes: enc.encode(sheets[1]) },
    { name: "xl/worksheets/sheet3.xml", bytes: enc.encode(sheets[2]) },
  ]);
}

export function churchReportFileName(weekStart: string, weekEnd: string) {
  return `BalanceBytes_PM_Operations_Weekly_Status_${weekStart}_${weekEnd}.xlsx`;
}
