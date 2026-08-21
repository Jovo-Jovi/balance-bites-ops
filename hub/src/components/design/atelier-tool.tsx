"use client";

import { Accordion, ActionBtn, Empty, Field, TextArea, TextInput } from "@/components/invoices/ui";
import { FLAVOR_PACKS } from "@/lib/design/colors";
import { DESIGN_SPECS } from "@/lib/design/specs";
import { ArtPanel } from "./art-panel";
import { productOptions, specOf, useDesignApp } from "./design-context";
import { LabelPreview } from "./label-preview";

function str(state: Record<string, unknown>, key: string) {
  return String(state[key] ?? "");
}

export function AtelierTool() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) {
    return (
      <Empty>
        Open a template from the library, or create a new one. Finance sticker links also land here.
      </Empty>
    );
  }
  const spec = specOf(t);
  const products = productOptions(app.products, t.productId);
  const packHint = FLAVOR_PACKS.find((p) => p.bg.toLowerCase() === str(t.state, "cLabel").toLowerCase());

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
                value={t.productId}
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
          </div>
          <p className="mt-2 text-xs text-[var(--bb-muted)]">{spec.hint}</p>
        </Accordion>

        <Accordion title="Flavor pack">
          <p className="mb-3 text-sm text-[var(--bb-muted)]">
            These packs live in code, not in Firestore. Shared invoice themes stay on Invoices → Look.
            {packHint ? ` Current fill matches ${packHint.name}.` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {FLAVOR_PACKS.map((p) => {
              const on = str(t.state, "cLabel").toLowerCase() === p.bg.toLowerCase();
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

        <ArtPanel />

        <Accordion title="Brand and flavor">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Brand mark">
              <TextInput value={str(t.state, "eBrand")} onChange={(e) => app.setField("eBrand", e.target.value)} />
            </Field>
            <Field label="Circle brand 1">
              <TextInput value={str(t.state, "eCBrand1")} onChange={(e) => app.setField("eCBrand1", e.target.value)} />
            </Field>
            <Field label="Circle brand 2">
              <TextInput value={str(t.state, "eCBrand2")} onChange={(e) => app.setField("eCBrand2", e.target.value)} />
            </Field>
            <Field label="Flavor">
              <TextInput value={str(t.state, "eCFlavorTxt")} onChange={(e) => app.setField("eCFlavorTxt", e.target.value)} />
            </Field>
            <Field label="Name line 1">
              <TextInput value={str(t.state, "eName1")} onChange={(e) => app.setField("eName1", e.target.value)} />
            </Field>
            <Field label="Name line 2">
              <TextInput value={str(t.state, "eName2")} onChange={(e) => app.setField("eName2", e.target.value)} />
            </Field>
            <Field label="Name line 1 (AR)">
              <TextInput dir="rtl" value={str(t.state, "eName1Ar")} onChange={(e) => app.setField("eName1Ar", e.target.value)} />
            </Field>
            <Field label="Name line 2 (AR)">
              <TextInput dir="rtl" value={str(t.state, "eName2Ar")} onChange={(e) => app.setField("eName2Ar", e.target.value)} />
            </Field>
          </div>
        </Accordion>

        <Accordion title="Weight and dates" defaultOpen={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Net weight">
              <TextInput value={str(t.state, "eWeight")} onChange={(e) => app.setField("eWeight", e.target.value)} />
            </Field>
            <Field label="Storage">
              <TextInput value={str(t.state, "eStore")} onChange={(e) => app.setField("eStore", e.target.value)} />
            </Field>
            <Field label="Best before label">
              <TextInput value={str(t.state, "eDateLabel1")} onChange={(e) => app.setField("eDateLabel1", e.target.value)} />
            </Field>
            <Field label="Best before">
              <TextInput value={str(t.state, "eDate1")} onChange={(e) => app.setField("eDate1", e.target.value)} />
            </Field>
            <Field label="Production label">
              <TextInput value={str(t.state, "eDateLabel2")} onChange={(e) => app.setField("eDateLabel2", e.target.value)} />
            </Field>
            <Field label="Production date">
              <TextInput value={str(t.state, "eDate2")} onChange={(e) => app.setField("eDate2", e.target.value)} />
            </Field>
          </div>
        </Accordion>

        <Accordion title="Ingredients" defaultOpen={false}>
          <div className="grid gap-3">
            <Field label="Ingredients title">
              <TextInput value={str(t.state, "eIngTitle")} onChange={(e) => app.setField("eIngTitle", e.target.value)} />
            </Field>
            <Field label="Ingredients">
              <TextArea rows={3} value={str(t.state, "eIngredients")} onChange={(e) => app.setField("eIngredients", e.target.value)} />
            </Field>
            <Field label="Ingredients title (AR)">
              <TextInput dir="rtl" value={str(t.state, "eIngTitleAr")} onChange={(e) => app.setField("eIngTitleAr", e.target.value)} />
            </Field>
            <Field label="Ingredients (AR)">
              <TextArea dir="rtl" rows={3} value={str(t.state, "eIngredientsAr")} onChange={(e) => app.setField("eIngredientsAr", e.target.value)} />
            </Field>
          </div>
        </Accordion>

        <Accordion title="Nutrition" defaultOpen={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Serving">
              <TextInput value={str(t.state, "nSrv")} onChange={(e) => app.setField("nSrv", e.target.value)} />
            </Field>
            <Field label="Calories">
              <TextInput inputMode="decimal" value={str(t.state, "nCal")} onChange={(e) => app.setField("nCal", e.target.value)} />
            </Field>
            <Field label="Fat (g)">
              <TextInput inputMode="decimal" value={str(t.state, "nFat")} onChange={(e) => app.setField("nFat", e.target.value)} />
            </Field>
            <Field label="Carb (g)">
              <TextInput inputMode="decimal" value={str(t.state, "nCarb")} onChange={(e) => app.setField("nCarb", e.target.value)} />
            </Field>
            <Field label="Protein (g)">
              <TextInput inputMode="decimal" value={str(t.state, "nProt")} onChange={(e) => app.setField("nProt", e.target.value)} />
            </Field>
            <Field label="Sugars (g)">
              <TextInput inputMode="decimal" value={str(t.state, "nSug")} onChange={(e) => app.setField("nSug", e.target.value)} />
            </Field>
          </div>
        </Accordion>

        <Accordion title="Artboard size" defaultOpen={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Width (cm)">
              <TextInput inputMode="decimal" value={str(t.state, "cW")} onChange={(e) => app.setField("cW", e.target.value)} />
            </Field>
            <Field label="Height (cm)">
              <TextInput inputMode="decimal" value={str(t.state, "cH")} onChange={(e) => app.setField("cH", e.target.value)} />
            </Field>
          </div>
        </Accordion>

        {app.linkedStickers.length ? (
          <p className="text-sm text-[var(--bb-muted)]">
            Linked sticker SKUs (read-only): {app.linkedStickers.map((s) => s.name).join(", ")}. Finance owns those records.
          </p>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24 lg:w-80">
        <LabelPreview template={t} />
        <p className="mt-2 text-center text-xs text-[var(--bb-muted)]">
          Preview of saved geometry. Freeform drawing stays a later pass — existing composite parts still round-trip.
        </p>
      </aside>
    </div>
  );
}
