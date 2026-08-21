"use client";

import { ActionBtn, Empty } from "@/components/invoices/ui";
import { useToast } from "@/components/toast";
import { artboardCm } from "@/lib/design/preview";
import { BLEED_MM, CUT_STROKE_MM, DPI, downloadSvg, printExcludeNote, printPreview, pxFromMm } from "@/lib/design/prepress";
import { specOf, useDesignApp } from "./design-context";
import { LabelPreview } from "./label-preview";

export function PrintTool() {
  const app = useDesignApp();
  const toast = useToast();
  const t = app.current;
  if (!t) {
    return (
      <Empty>
        Open a template first. Print house exports the label you have in the atelier.
      </Empty>
    );
  }
  const spec = specOf(t);
  const size = artboardCm(t.state);
  const exclude = printExcludeNote(t, t.state);
  const bleedPx = pxFromMm(BLEED_MM);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        <p className="text-sm text-[var(--bb-muted)]">
          Same print constants as the live prepress helper: {BLEED_MM} mm bleed, {CUT_STROKE_MM} mm cut stroke, {DPI} DPI.
          This downloads the hub SVG preview — not a PNG cut pack from the old composite editor.
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--bb-muted)]">Family</dt>
            <dd>{spec.label}</dd>
          </div>
          <div>
            <dt className="text-[var(--bb-muted)]">Artboard</dt>
            <dd>
              {size.wCm} × {size.hCm} cm
            </dd>
          </div>
          <div>
            <dt className="text-[var(--bb-muted)]">Bleed</dt>
            <dd>
              {BLEED_MM} mm ({bleedPx} px at {DPI} DPI)
            </dd>
          </div>
          <div>
            <dt className="text-[var(--bb-muted)]">Cut stroke</dt>
            <dd>{CUT_STROKE_MM} mm</dd>
          </div>
        </dl>
        {exclude ? (
          <p className="rounded-[var(--bb-radius)] border border-[var(--bb-warn)] px-3 py-2 text-sm text-[var(--bb-warn)]">
            {exclude}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <ActionBtn
            onClick={() => {
              if (!printPreview(t, t.state)) toast.push("Allow pop-ups to print.", "warn");
            }}
          >
            Print preview
          </ActionBtn>
          <ActionBtn tone="ghost" onClick={() => downloadSvg(t, t.state)}>
            Download SVG
          </ActionBtn>
          <ActionBtn tone="ghost" onClick={app.exportCurrent}>
            Export JSON
          </ActionBtn>
          <ActionBtn tone="ghost" onClick={() => app.openAtelier()}>
            Back to atelier
          </ActionBtn>
        </div>
      </div>
      <aside className="lg:w-80">
        <LabelPreview template={t} />
      </aside>
    </div>
  );
}
