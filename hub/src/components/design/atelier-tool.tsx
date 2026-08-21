"use client";

import { useState } from "react";
import { Accordion, ActionBtn, Empty, Field, TextInput } from "@/components/invoices/ui";
import { FLAVOR_PACKS } from "@/lib/design/colors";
import { hasExactArt } from "@/lib/design/art";
import { CUT_LAYER } from "@/lib/design/layers";
import { previewFace } from "@/lib/design/layout";
import { productForTemplate } from "@/lib/design/product-match";
import { DESIGN_SPECS } from "@/lib/design/specs";
import { ImagesPanel, IconsPanel } from "./art-panel";
import { CopyPanel } from "./copy-panel";
import { productOptions, specOf, useDesignApp } from "./design-context";
import { LabelPreview } from "./label-preview";
import { LayersPanel } from "./layers-panel";

function str(state: Record<string, unknown>, key: string) {
  return String(state[key] ?? "");
}

const ATELIER_TABS = [
  { id: "copy", label: "Copy" },
  { id: "images", label: "Images" },
  { id: "icons", label: "Icons" },
  { id: "layers", label: "Layers" },
] as const;

type AtelierTab = (typeof ATELIER_TABS)[number]["id"];

export function AtelierTool() {
  const app = useDesignApp();
  const t = app.current;
  const [panel, setPanel] = useState<AtelierTab>("copy");
  if (!t) {
    return <Empty>Open a template from the library, or create a new one.</Empty>;
  }
  const spec = specOf(t);
  const face = previewFace(t);
  const linked = productForTemplate(t, app.products);
  const productId = t.productId || linked?.id || "";
  const products = productOptions(app.products, productId);
  const packHint = FLAVOR_PACKS.find((p) => p.bg.toLowerCase() === str(t.state, "cLabel").toLowerCase());
  const sku = app.linkedStickers[0]?.name;
  const loadedOn = app.loadedFlavorOn;
  const artNative = hasExactArt(t.state);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
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

        <Accordion title="Template">
          <div className="grid gap-3 sm:grid-cols-2">
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
                {DESIGN_SPECS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
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
              <input
                type="checkbox"
                checked={t.designLocked}
                onChange={(e) => app.setLocked(e.target.checked)}
              />
              Lock family
            </label>
            {spec.modes.length > 1 ? (
              <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                {spec.modes.map((mode) => {
                  const on = t.labelMode === mode;
                  const label = mode === "back" ? (spec.isTapered ? "Taper wrap" : "Back wrap") : mode === "top" ? "Top lid" : "Front";
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
            {face === "top" ? (
              <Field label="Lid size (cm)">
                <TextInput inputMode="decimal" value={str(t.state, "tSz") || "4"} onChange={(e) => app.setField("tSz", e.target.value)} />
              </Field>
            ) : face === "back" ? (
              <>
                <Field label="Width (cm)">
                  <TextInput inputMode="decimal" value={str(t.state, "sW") || "17"} onChange={(e) => app.setField("sW", e.target.value)} />
                </Field>
                <Field label="Height (cm)">
                  <TextInput inputMode="decimal" value={str(t.state, "sH") || "4.5"} onChange={(e) => app.setField("sH", e.target.value)} />
                </Field>
              </>
            ) : face === "taper" ? (
              <>
                <Field label="Top Ø (cm)">
                  <TextInput inputMode="decimal" value={str(t.state, "tpDTop") || "9"} onChange={(e) => app.setField("tpDTop", e.target.value)} />
                </Field>
                <Field label="Bottom Ø (cm)">
                  <TextInput inputMode="decimal" value={str(t.state, "tpDBot") || "7"} onChange={(e) => app.setField("tpDBot", e.target.value)} />
                </Field>
                <Field label="Label height (cm)">
                  <TextInput inputMode="decimal" value={str(t.state, "tpLblH") || "7"} onChange={(e) => app.setField("tpLblH", e.target.value)} />
                </Field>
                <Field label="Wrap %">
                  <TextInput inputMode="decimal" value={str(t.state, "tpWrap") || "85"} onChange={(e) => app.setField("tpWrap", e.target.value)} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Width (cm)">
                  <TextInput inputMode="decimal" value={str(t.state, "cW") || "6"} onChange={(e) => app.setField("cW", e.target.value)} />
                </Field>
                <Field label="Height (cm)">
                  <TextInput inputMode="decimal" value={str(t.state, "cH") || "6"} onChange={(e) => app.setField("cH", e.target.value)} />
                </Field>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--bb-muted)]">
            {spec.hint}
            {sku ? ` · Linked SKU ${sku}` : ""}
          </p>
        </Accordion>

        <Accordion title="Flavor pack">
          <p className="mb-3 text-sm text-[var(--bb-muted)]">
            {artNative
              ? "Artwork carries its own colors. Loaded restores the fills saved on this template."
              : loadedOn
                ? "Loaded — the colors already on this template."
                : packHint
                  ? `Fill matches ${packHint.name}.`
                  : "Custom fill — not a listed pack."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => app.restoreLoadedFlavor()}
              className={`bb-btn inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs ${
                loadedOn
                  ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                  : "border-[var(--bb-line)] text-[var(--bb-text)]"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full border border-[var(--bb-line)]"
                style={{ background: app.loadedFlavor?.cLabel || str(t.state, "cLabel") }}
              />
              Loaded
            </button>
            {FLAVOR_PACKS.map((p) => {
              const on = !loadedOn && str(t.state, "cLabel").toLowerCase() === p.bg.toLowerCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => app.applyPack(p.id)}
                  className={`bb-btn inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs ${
                    on
                      ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                      : "border-[var(--bb-line)] text-[var(--bb-text)]"
                  }`}
                  data-tone={on ? undefined : "ghost"}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: p.bg }} />
                  {p.name}
                </button>
              );
            })}
          </div>
        </Accordion>

        <div>
          <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Atelier sections">
            {ATELIER_TABS.map((tab) => {
              const on = panel === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setPanel(tab.id)}
                  className={`rounded-[var(--bb-radius)] border px-3 py-2 text-xs tracking-wide uppercase ${
                    on
                      ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                      : "border-[var(--bb-line)] text-[var(--bb-text)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="bb-glass p-4">
            {panel === "copy" ? <CopyPanel /> : null}
            {panel === "images" ? <ImagesPanel /> : null}
            {panel === "icons" ? <IconsPanel /> : null}
            {panel === "layers" ? <LayersPanel /> : null}
          </div>
        </div>
      </div>

      <aside className="w-full lg:sticky lg:top-24 lg:w-[28rem]">
        <p className="mb-2 text-xs text-[var(--bb-muted)]">
          Tap a layer to select it. Drag to move, round handle to rotate, corner to resize.
        </p>
        <LabelPreview
          template={t}
          interactive
          showCut={app.selectedId === CUT_LAYER}
          selectedId={app.selectedId}
          onSelect={app.selectLayer}
          onMove={app.moveItem}
          onResize={app.resizeItem}
          onRotate={app.rotateItem}
        />
      </aside>
    </div>
  );
}
