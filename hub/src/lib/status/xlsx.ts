import { zipStore } from "@/lib/zip-store";
import { churchStatusCell } from "./report";
import {
  CHURCH_STATUS_BRAND,
  CHURCH_STATUS_FOCUS,
  CHURCH_STATUS_TITLE,
  PM_FOOTNOTE,
  RAG_LEGEND,
  type ChurchReport,
  type Rag,
} from "./types";

const COLS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

type XCell = { s: number; v?: string | number };

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
<font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><i/><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/></font>
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
  extra?: { heights?: Record<number, number>; filter?: string },
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
    `<sheetPr/><dimension ref="A1:H${last}"/>` +
    `<sheetFormatPr defaultRowHeight="14.4"/>` +
    `<cols>` +
    `<col min="1" max="1" width="22" customWidth="1"/>` +
    `<col min="2" max="2" width="18" customWidth="1"/>` +
    `<col min="3" max="4" width="19" customWidth="1"/>` +
    `<col min="5" max="6" width="16" customWidth="1"/>` +
    `<col min="7" max="7" width="28" customWidth="1"/>` +
    `<col min="8" max="8" width="32" customWidth="1"/>` +
    `</cols>` +
    `<sheetData>${body.join("")}</sheetData>` +
    mergeXml +
    filterXml +
    `<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>` +
    `<pageSetup orientation="landscape" paperSize="9"/>` +
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

export function churchReportXlsx(report: ChurchReport): Uint8Array {
  const rows: XCell[][] = [];
  const merges: string[] = [];
  const heights: Record<number, number> = { 1: 31.95 };
  const push = (cells: XCell[]) => {
    rows.push(fillRow(cells));
    return rows.length;
  };
  const mergeAH = (r: number) => merges.push(`A${r}:H${r}`);
  const mergeBH = (r: number) => merges.push(`B${r}:H${r}`);

  const r1 = push([{ s: 13, v: CHURCH_STATUS_TITLE }]);
  mergeAH(r1);
  const r2 = push([{ s: 12, v: CHURCH_STATUS_BRAND }]);
  mergeAH(r2);
  push(blankRow(1));
  const meta = [
    ["Reporting Week", report.weekLabel],
    ["Overall Status", report.overallLabel],
    ["Prepared By", report.preparedBy || "[Name]"],
    ["Management Focus", CHURCH_STATUS_FOCUS],
  ];
  meta.forEach(([label, value]) => {
    const r = push([{ s: 2, v: label }, { s: 1, v: value }]);
    mergeBH(r);
  });
  push(blankRow(1));

  const s1 = push([{ s: 8, v: "1. EXECUTIVE KPI SUMMARY" }]);
  mergeAH(s1);
  push([
    { s: 3, v: "KPI" },
    { s: 3, v: "Current Week" },
    { s: 3, v: "Previous Week" },
    { s: 3, v: "Trend" },
    { s: 3, v: "Status" },
  ]);
  report.kpis.forEach((k) => {
    push([
      { s: 1, v: k.name },
      { s: 1, v: k.current },
      { s: 1, v: k.previous },
      { s: 1, v: k.trend },
      { s: 1, v: k.status === "yellow" ? "🟡" : "🟢" },
    ]);
  });
  push(blankRow(1));
  push(blankRow(1));

  const s2 = push([{ s: 8, v: "2. CHURCH-LEVEL STATUS" }]);
  mergeAH(s2);
  const churchHead = push([
    { s: 3, v: "Church" },
    { s: 3, v: "Status" },
    { s: 3, v: "Units Distributed" },
    { s: 3, v: "Sales Value (EGP)" },
    { s: 3, v: "Payment" },
    { s: 3, v: "Delivery" },
    { s: 3, v: "Key Issue / Risk" },
    { s: 3, v: "Next Action" },
  ]);
  const churchList = report.churches.length
    ? report.churches
    : [
        {
          name: "—",
          rag: "green" as Rag,
          units: 0,
          sales: 0,
          payment: "—",
          delivery: "—",
          issue: "—",
          nextAction: "—",
          servedThisWeek: false,
        },
      ];
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

  const s3 = push([{ s: 8, v: "3. KEY RISKS & MANAGEMENT ACTIONS" }]);
  mergeAH(s3);
  push([
    { s: 3, v: "Priority" },
    { s: 3, v: "Risk / Issue" },
    { s: 3, v: "Business Impact" },
    { s: 3, v: "Action" },
    { s: 3, v: "Owner" },
    { s: 3, v: "Due Date" },
    { s: 3, v: "Status" },
    { s: 3, v: "" },
  ]);
  const risks = report.risks.length
    ? report.risks
    : [{ priority: "", risk: "—", impact: "", action: "", owner: "", due: "", status: "" }];
  risks.forEach((risk) => {
    const s = risk.status.includes("🔴") ? 6 : risk.status.includes("🟡") ? 5 : 4;
    push([
      { s, v: risk.priority },
      { s, v: risk.risk },
      { s, v: risk.impact },
      { s, v: risk.action },
      { s, v: risk.owner || "[Owner]" },
      { s, v: risk.due || "[DD/MM]" },
      { s, v: risk.status },
      { s, v: "" },
    ]);
  });
  push(blankRow(1));
  push(blankRow(1));

  const s4 = push([{ s: 8, v: "4. EXECUTIVE PROJECT UPDATE" }]);
  mergeAH(s4);
  const exec = [
    ["Achievements", report.achievements],
    ["Challenges / Risks", report.challenges],
    ["Next Week Priorities", report.nextPriorities],
  ];
  exec.forEach(([label, value]) => {
    const r = push([{ s: 2, v: label }, { s: 11, v: value }]);
    mergeBH(r);
  });
  push(blankRow(1));
  push(blankRow(1));
  const pm = push([{ s: 8, v: "PROJECT MANAGEMENT VIEW" }]);
  mergeAH(pm);
  const note = push([{ s: 10, v: PM_FOOTNOTE }]);
  merges.push(`A${note}:H${note + 1}`);
  push(blankRow(9));

  const { sheet, strings } = emitSheet(rows, merges, {
    heights,
    filter: `A${churchHead}:H${churchEnd}`,
  });

  const legendRows: XCell[][] = [
    fillRow([{ s: 7, v: "Status" }, { s: 7, v: "Definition" }]),
    ...RAG_LEGEND.map((row) =>
      fillRow([
        { s: 1, v: row.label },
        { s: 1, v: row.definition },
      ]),
    ),
  ];
  const legend = emitSheet(legendRows, []);
  const allStrings = [...strings];
  const remap = new Map<number, number>();
  legend.strings.forEach((s, i) => {
    const existing = strings.indexOf(s);
    remap.set(i, existing >= 0 ? existing : (allStrings.push(s), allStrings.length - 1));
  });
  let legendSheet = legend.sheet;
  for (let i = legend.strings.length - 1; i >= 0; i--) {
    const next = remap.get(i);
    if (next == null || next === i) continue;
    legendSheet = legendSheet.replaceAll(`t="s"><v>${i}</v>`, `t="s"><v>${next}</v>`);
  }

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
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
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Weekly Status Report" sheetId="1" r:id="rId1"/>
<sheet name="RAG Legend" sheetId="2" r:id="rId2"/>
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
    { name: "xl/worksheets/sheet1.xml", bytes: enc.encode(sheet) },
    { name: "xl/worksheets/sheet2.xml", bytes: enc.encode(legendSheet) },
  ]);
}

export function churchReportFileName(weekStart: string, weekEnd: string) {
  return `BalanceBytes_Weekly_Church_Status_Report_${weekStart}_${weekEnd}.xlsx`;
}
