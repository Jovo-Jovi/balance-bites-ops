import { esc } from "@/lib/invoices/helpers";
import { artboardCm, labelPreviewSvg } from "./preview";
import type { LabelState, LabelTemplate } from "./types";

export const BLEED_MM = 1.5;
export const DPI = 300;
export const CUT_STROKE_MM = 0.25;

export const PRINT_PACK_EXCLUDE: Record<string, string> = {
  "popcorn-blue": "Licensed likeness — not for commercial print pack",
  "popcorn-red": "Licensed likeness — not for commercial print pack",
};

export function pxFromMm(mm: number) {
  return Math.max(1, Math.round((mm / 25.4) * DPI));
}

export function printExcludeNote(template: LabelTemplate, state: LabelState) {
  const preset = String(state._composite?.presetId || "");
  return PRINT_PACK_EXCLUDE[preset] || null;
}

export function downloadSvg(template: LabelTemplate, state: LabelState) {
  const svg = labelPreviewSvg(template, state);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${template.name.replace(/[^\w\- ]+/g, "_") || "label"}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printPreview(template: LabelTemplate, state: LabelState) {
  const { wCm, hCm } = artboardCm(state);
  const svg = labelPreviewSvg(template, state);
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(template.name)}</title>
<style>
  @page { size: auto; margin: 10mm; }
  body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
  .sheet { width: ${wCm}cm; height: ${hCm}cm; }
  svg { width: 100%; height: 100%; display: block; }
</style></head><body><div class="sheet">${svg}</div>
<script>window.onload=function(){window.print();};<\/script></body></html>`;
  const w = window.open("", "_blank", "width=820,height=960");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
