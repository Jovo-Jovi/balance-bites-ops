import { esc } from "@/lib/invoices/helpers";
import { openPrintHtml } from "@/lib/open-print";
import { artboardCm, CUT_STROKE_COLOR, CUT_STROKE_MM, cutStrokeOf, labelPreviewSvg } from "./preview";
import type { LabelState, LabelTemplate } from "./types";

export { CUT_STROKE_COLOR, CUT_STROKE_MM, cutStrokeOf };

export const BLEED_MM = 1.5;
export const BLEED_SAMPLE_INSET_MM = 0.5;
export const DPI = 300;

export const PRINT_PACK_EXCLUDE: Record<string, string> = {
  "popcorn-blue": "Licensed likeness — not for commercial print pack",
  "popcorn-red": "Licensed likeness — not for commercial print pack",
  art_popcorn_blue: "Licensed likeness — not for commercial print pack",
  art_popcorn_red: "Licensed likeness — not for commercial print pack",
};

export const PRINT_FONTS =
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=DM+Sans:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@400;700&family=Fredoka:wght@500;600;700&family=Baloo+2:wght@600;700;800&family=Nunito:wght@700;800;900&family=Bubblegum+Sans&family=Sniglet:wght@400;800&family=Bitter:ital,wght@0,400;0,700&family=Cairo:wght@700;800;900&family=Baloo+Bhaijaan+2:wght@600;700;800&display=swap";

export function pxFromMm(mm: number) {
  return Math.max(1, Math.round((mm / 25.4) * DPI));
}

export function printExcludeNote(template: LabelTemplate, state: LabelState) {
  const preset = String(state._composite?.presetId || "");
  const name = String(template.name || "").toLowerCase();
  return (
    PRINT_PACK_EXCLUDE[preset] ||
    PRINT_PACK_EXCLUDE[name] ||
    (name.includes("popcorn-blue") || name.includes("popcorn-red")
      ? PRINT_PACK_EXCLUDE["popcorn-blue"]
      : null)
  );
}

function cmLabel(n: number) {
  const v = Math.round(n * 100) / 100;
  return String(v);
}

export function exportFileBase(template: LabelTemplate) {
  const { wCm, hCm } = artboardCm(template);
  const safe = template.name.replace(/[^\w\- ]+/g, "_").trim() || "label";
  return `${safe}_${cmLabel(wCm)}x${cmLabel(hCm)}cm`;
}

function exportSvgMarkup(template: LabelTemplate, state: LabelState) {
  return labelPreviewSvg(template, state, { showCut: true, physical: true });
}

export function downloadSvg(template: LabelTemplate, state: LabelState) {
  const svg = exportSvgMarkup(template, state);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${exportFileBase(template)}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printPreview(template: LabelTemplate, state: LabelState) {
  const { wCm, hCm } = artboardCm(template);
  const padCm = cutStrokeOf(state).mm / 10;
  const pageW = wCm + 2 * padCm;
  const pageH = hCm + 2 * padCm;
  const svg = exportSvgMarkup(template, state);
  const title = exportFileBase(template);
  const html = `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="${PRINT_FONTS}">
<style>
  @page { size: ${pageW}cm ${pageH}cm; margin: 0; }
  html, body { margin: 0; padding: 0; width: ${pageW}cm; height: ${pageH}cm; background: #fff; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; forced-color-adjust: none !important; }
  .sheet { width: ${pageW}cm; height: ${pageH}cm; overflow: visible; }
  svg { width: ${pageW}cm; height: ${pageH}cm; display: block; overflow: visible; }
</style></head><body><div class="sheet">${svg}</div>
<script>window.onload=function(){window.print();};<\/script></body></html>`;
  return openPrintHtml(html);
}
