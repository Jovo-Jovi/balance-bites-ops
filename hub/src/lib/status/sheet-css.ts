/** Matches BalanceBytes_Weekly_Church_Status_Report.xlsx fills, type, and column widths. */
export const SHEET_CSS = `
.bb-sr {
  --sr-green: #0B4F3B;
  --sr-mint: #E8F1ED;
  --sr-yellow: #FFF2CC;
  --sr-red: #F4CCCC;
  --sr-line: #D9E1E8;
  --sr-ink: #1F2937;
  --sr-label: #0B4F3B;
  color: #000;
  background: #fff;
  font-family: Calibri, Carlito, "Liberation Sans", Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.25;
}
.bb-sr table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.bb-sr col.cA { width: 12.94%; }
.bb-sr col.cB { width: 10.59%; }
.bb-sr col.cC { width: 11.18%; }
.bb-sr col.cD { width: 11.18%; }
.bb-sr col.cE { width: 9.41%; }
.bb-sr col.cF { width: 9.41%; }
.bb-sr col.cG { width: 16.47%; }
.bb-sr col.cH { width: 18.82%; }
.bb-sr th, .bb-sr td {
  border-bottom: 0.75pt solid var(--sr-line);
  padding: 4px 6px;
  vertical-align: top;
  word-wrap: break-word;
}
.bb-sr .title {
  background: var(--sr-green);
  color: #fff;
  font-size: 18pt;
  font-weight: 700;
  text-align: center;
  vertical-align: middle;
  height: 32pt;
}
.bb-sr .brand {
  font-style: italic;
  color: var(--sr-ink);
  text-align: center;
}
.bb-sr .label {
  font-weight: 700;
  color: var(--sr-label);
  white-space: nowrap;
}
.bb-sr .section {
  background: var(--sr-green);
  color: #fff;
  font-size: 13pt;
  font-weight: 700;
}
.bb-sr .colh {
  background: var(--sr-green);
  color: #fff;
  font-weight: 700;
  text-align: center;
  vertical-align: middle;
}
.bb-sr .rag-green { background: var(--sr-mint); }
.bb-sr .rag-yellow { background: var(--sr-yellow); }
.bb-sr .rag-red { background: var(--sr-red); }
.bb-sr .legend-h {
  background: var(--sr-green);
  color: #fff;
  font-weight: 700;
}
.bb-sr .wrap { vertical-align: middle; }
.bb-sr .spacer td { height: 10px; border-bottom-color: var(--sr-line); }
.bb-sr .num { text-align: right; font-variant-numeric: tabular-nums; }
.bb-sr .center { text-align: center; }
.bb-sr .top { vertical-align: top; }
@media print {
  .bb-sr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
