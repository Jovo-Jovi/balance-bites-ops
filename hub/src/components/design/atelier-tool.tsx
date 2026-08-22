"use client";

import { ActionBtn, Empty, Field, TextInput } from "@/components/invoices/ui";
import { CUT_LAYER } from "@/lib/design/layers";
import { n, previewFace } from "@/lib/design/layout";
import { productForTemplate } from "@/lib/design/product-match";
import { DESIGN_SPECS } from "@/lib/design/specs";
import { productOptions, specOf, useDesignApp } from "./design-context";
import { FaceInspector } from "./inspector-panel";
import { LabelPreview } from "./label-preview";

export function AtelierTool() {
  const app = useDesignApp();
  const t = app.current;
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
          Save
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
      </div>

      <div className="bb-glass grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs text-[var(--bb-muted)]">
            Tap a layer to select it. Drag to move, round handle to rotate, corner to resize.
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
                showCut={app.selectedId === CUT_LAYER}
                selectedId={app.selectedId}
                onSelect={app.selectLayer}
                onMove={app.moveItem}
                onResize={app.resizeItem}
                onRotate={app.rotateItem}
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
