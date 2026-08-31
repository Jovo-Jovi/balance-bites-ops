import { openPrintHtml } from "@/lib/open-print";
import { churchReportDocumentHtml } from "./html";
import { churchReportFileName, churchReportXlsx } from "./xlsx";
import type { ChurchReport } from "./types";

export function printChurchReport(report: ChurchReport) {
  return openPrintHtml(churchReportDocumentHtml(report), {
    dir: "ltr",
    label: "Weekly church status",
  });
}

export function downloadChurchReportXlsx(report: ChurchReport) {
  const bytes = churchReportXlsx(report);
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = churchReportFileName(report.weekStart, report.weekEnd);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
