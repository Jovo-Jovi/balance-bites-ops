"use client";

import { useEffect, useState } from "react";
import { ActionBtn, Empty, Field, TextInput } from "@/components/invoices/ui";
import { useToast } from "@/components/toast";
import { CUT_LAYER } from "@/lib/design/layers";
import { familyTextField, n, previewFace } from "@/lib/design/layout";
import { downloadLabelPng } from "@/lib/design/png-pack";
import { printExcludeNote } from "@/lib/design/prepress";
import { productForTemplate } from "@/lib/design/product-match";
import { DESIGN_SPECS } from "@/lib/design/specs";
import { productOptions, specOf, useDesignApp } from "./design-context";
import { FaceInspector } from "./inspector-panel";
import { LabelPreview } from "./label-preview";
import { StudioCutBar } from "./studio-cut-bar";

export function StudioTool() {
  const app = useDesignApp();
  const toast = useToast();
  const [pngBusy, setPngBusy] = useState(false);
  const t = app.current;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      app.undoStudio();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [app]);
  if (!t) {
    return <Empty>Open a template from the library, or create a new one.</Empty>;
  }
  const spec = specOf(t);
  const face = previewFace(t);
  const linked = productForTemplate(t, app.products);
  const productId = t.productId || linked?.id || "";
  const products = productOptions(app.products, productId);
  const sku = app.linkedStickers[0]?.name;
  const zoom = Math.max(0.2, Math.min(4, n(t.state, "sScale", 100) / 100));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <ActionBtn disabled={app.busy} onClick={() => void app.save()}>
          {app.busy ? app.busyMessage || "Saving…" : "Save"}
        </ActionBtn>
        <ActionBtn tone="ghost" disabled={app.busy} onClick={() => void app.saveAsNew()}>
          Save as new
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={app.exportCurrent}>
          Export JSON
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={app.openPrint}>
          Print house
        </ActionBtn>
        <ActionBtn
          tone="ghost"
          disabled={pngBusy}
          onClick={() => {
            const note = printExcludeNote(t, t.state);
            if (note) toast.push(note, "warn");
            setPngBusy(true);
            void downloadLabelPng(t, t.state, "cut")
              .then((info) => {
                toast.push(`Cut PNG · ${info.wCm} × ${info.hCm} cm · ${info.dpi} DPI · ${info.wPx}×${info.hPx}px`, "ok");
              })
              .catch((err) => {
                toast.push(err instanceof Error ? err.message : "PNG export failed.", "bad");
              })
              .finally(() => setPngBusy(false));
          }}
        >
          {pngBusy ? "Cut PNG…" : "Cut PNG"}
        </ActionBtn>
      </div>

      <div className="bb-sheet grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name">
          <TextInput value={t.name} onChange={(e) => app.setName(e.target.value)} />
        </Field>
        <Field label="Family">
          <select
            value={t.designType}
            disabled={t.designLocked}
            onChange={(e) => app.setFamily(e.target.value as typeof t.designType)}
            className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)] disabled:opacity-60"
          >
            {DESIGN_SPECS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Product">
          <select
            value={productId}
            onChange={(e) => app.applyProduct(e.target.value)}
            className="bb-glass-input min-h-11 w-full px-3 text-[var(--bb-text)]"
          >
            <option value="">None</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.weight ? ` · ${p.weight}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--bb-text)]">
          <input type="checkbox" checked={t.designLocked} onChange={(e) => app.setLocked(e.target.checked)} />
          Lock family
        </label>
        {spec.modes.length > 1 ? (
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-1.5">
            {spec.modes.map((mode) => {
              const on = t.labelMode === mode;
              const label =
                mode === "back" ? (spec.isTapered ? "Taper wrap" : "Back wrap") : mode === "top" ? "Top lid" : "Front";
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => app.setLabelMode(mode)}
                  className={`rounded-[var(--bb-radius)] border px-3 py-2 text-xs uppercase tracking-wide ${
                    on
                      ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                      : "border-[var(--bb-line)] text-[var(--bb-text)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
        <p className="sm:col-span-2 lg:col-span-4 text-xs text-[var(--bb-muted)]">
          {spec.hint}
          {sku ? ` · Linked SKU ${sku}` : ""}
        </p>
      </div>

      <StudioCutBar />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs text-[var(--bb-muted)]">
            Tap a section to type in it. Drag the gold border to move; round handle rotates; corner resizes. Taper QR and
            weight are separate from the dates block. Shift-click to multi-select shapes.
          </p>
          <div className="overflow-auto">
            <div
              style={
                zoom === 1
                  ? undefined
                  : { transform: `scale(${zoom})`, transformOrigin: "top center" }
              }
            >
              <LabelPreview
                template={t}
                interactive
                showCut={app.selectedId === CUT_LAYER || Boolean(app.cutPreview)}
                selectedId={app.selectedId}
                selectedIds={app.selectedIds}
                onSelect={app.selectLayer}
                onMove={app.moveItem}
                onResize={app.resizeItem}
                onRotate={app.rotateItem}
                onDragEnd={app.syncCutPath}
                onEdit={(id, text) => {
                  const fam = familyTextField(id);
                  if (fam) app.setField(fam.field, text);
                  else app.patchLayer(id, { text });
                }}
                className="max-w-full"
              />
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[26rem]">
          <FaceInspector face={face} />
        </aside>
      </div>
    </div>
  );
}

export const AtelierTool = StudioTool;
