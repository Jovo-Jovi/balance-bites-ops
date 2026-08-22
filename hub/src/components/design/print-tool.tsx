"use client";

import { ActionBtn, Empty, Field, TextInput } from "@/components/invoices/ui";
import { useToast } from "@/components/toast";
import { artboardCm, CUT_STROKE_COLOR, CUT_STROKE_MM, cutStrokeOf } from "@/lib/design/preview";
import { BLEED_MM, DPI, downloadSvg, exportFileBase, printExcludeNote, printPreview, pxFromMm } from "@/lib/design/prepress";
import { specOf, useDesignApp } from "./design-context";
import { LabelPreview } from "./label-preview";

function toHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return CUT_STROKE_COLOR;
}

export function PrintTool() {
  const app = useDesignApp();
  const toast = useToast();
  const t = app.current;
  if (!t) {
    return (
      <Empty>
        Open a template first.
      </Empty>
    );
  }
  const spec = specOf(t);
  const size = artboardCm(t);
  const exclude = printExcludeNote(t, t.state);
  const bleedPx = pxFromMm(BLEED_MM);
  const cut = cutStrokeOf(t.state);
  const fileBase = exportFileBase(t);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs text-[var(--bb-muted)]">
          Print and SVG use the artboard {size.wCm} × {size.hCm} cm. Saved name: {fileBase}
        </p>
        <LabelPreview template={t} showCut className="max-w-full" />
      </div>
      <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-24 lg:w-[26rem]">
        <p className="text-sm text-[var(--bb-muted)]">
          {BLEED_MM} mm bleed · {cut.mm} mm cut border · {DPI} DPI.
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
            <dd>
              {cut.mm} mm · {cut.color}
            </dd>
          </div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Cut stroke (mm)">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="4"
                step="0.05"
                value={cut.mm}
                onChange={(e) => app.setField("sCutStrokeMm", e.target.value)}
                className="h-11 w-full accent-[var(--bb-gold)]"
                aria-label="Cut stroke size in millimetres"
              />
              <TextInput
                inputMode="decimal"
                className="w-20"
                value={String(t.state.sCutStrokeMm ?? CUT_STROKE_MM)}
                onChange={(e) => app.setField("sCutStrokeMm", e.target.value)}
                aria-label="Cut stroke millimetres"
              />
            </div>
          </Field>
          <label className="flex items-center gap-2 pb-1 text-xs text-[var(--bb-muted)]">
            Color
            <input
              type="color"
              value={toHex(cut.color)}
              onChange={(e) => app.setField("cCutStroke", e.target.value)}
              className="h-11 w-11 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
              aria-label="Cut stroke color"
            />
          </label>
        </div>
        <p className="text-xs text-[var(--bb-muted)]">
          Drawn as a border on the die-cut. Magenta is the usual cut-contour colour. Size is in millimetres on the artboard.
        </p>
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
            Back to studio
          </ActionBtn>
        </div>
      </aside>
    </div>
  );
}
