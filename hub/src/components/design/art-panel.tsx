"use client";

import { useMemo, useState } from "react";
import { Accordion, ActionBtn, Field, TextInput } from "@/components/invoices/ui";
import { useToast } from "@/components/toast";
import {
  BG_MORE,
  BG_SLOTS,
  ICON_SIZES,
  placedArtItems,
  readImageFile,
  usableImage,
} from "@/lib/design/art";
import { ICON_CATEGORIES, categoryCount, filterIcons, iconSvg } from "@/lib/design/icons";
import { useDesignApp } from "./design-context";

function str(state: Record<string, unknown>, key: string) {
  return String(state[key] ?? "");
}

function ImageSlot({
  label,
  hint,
  field,
  opaKey,
  zoomKey,
}: {
  label: string;
  hint?: string;
  field: string;
  opaKey: string;
  zoomKey: string;
}) {
  const app = useDesignApp();
  const toast = useToast();
  const t = app.current;
  if (!t) return null;
  const raw = str(t.state, field);
  const preview = usableImage(raw);
  const pending = raw.startsWith("__asset__:");

  return (
    <div className="rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-3">
      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)]">
          {preview ? (
            // Native img so data URLs and hydrated R2 blobs preview without a Next image host.
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-[var(--bb-muted)]">
              {pending ? "On R2 — save to hydrate" : "No image"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--bb-text)]">{label}</p>
          {hint ? <p className="mt-0.5 text-xs text-[var(--bb-muted)]">{hint}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="bb-btn inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-3 text-sm text-[var(--bb-text)]">
              Upload
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const data = await readImageFile(file);
                    const patch: Record<string, string> = { [field]: data };
                    if (opaKey && !str(t.state, opaKey)) patch[opaKey] = "1";
                    if (zoomKey && !str(t.state, zoomKey)) patch[zoomKey] = "100";
                    app.setFields(patch);
                  } catch (err) {
                    toast.push(err instanceof Error ? err.message : "Could not read that image.", "bad");
                  }
                }}
              />
            </label>
            <ActionBtn tone="ghost" disabled={!raw} onClick={() => app.setFields({ [field]: "" })}>
              Clear
            </ActionBtn>
          </div>
        </div>
      </div>
      {opaKey || zoomKey ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {opaKey ? (
            <Field label={`Opacity ${Math.round(Number(str(t.state, opaKey) || 1) * 100)}%`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={str(t.state, opaKey) || "1"}
                onChange={(e) => app.setField(opaKey, e.target.value)}
                className="w-full accent-[var(--bb-gold)]"
              />
            </Field>
          ) : null}
          {zoomKey ? (
            <Field label={`Zoom ${str(t.state, zoomKey) || "100"}%`}>
              <input
                type="range"
                min={50}
                max={250}
                step={5}
                value={str(t.state, zoomKey) || "100"}
                onChange={(e) => app.setField(zoomKey, e.target.value)}
                className="w-full accent-[var(--bb-gold)]"
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ArtPanel() {
  const app = useDesignApp();
  const t = app.current;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sizeId, setSizeId] = useState("m");
  const [moreBg, setMoreBg] = useState(false);
  const icons = useMemo(() => filterIcons(cat, q), [cat, q]);
  if (!t) return null;

  const fill = str(t.state, "cLabel") || "#2e7d32";
  const ink = str(t.state, "cTxtMain") || "#ffffff";
  const placed = placedArtItems(t.state);
  const composite = Boolean(t.state._composite);

  return (
    <>
      <Accordion title="Background images">
        <p className="mb-3 text-sm text-[var(--bb-muted)]">
          Upload once and use on any family. Files stay on the template; save sends fat images to R2.
        </p>
        <div className="flex flex-col gap-3">
          {BG_SLOTS.map((slot) => (
            <ImageSlot
              key={slot.key}
              label={slot.label}
              hint={slot.hint}
              field={slot.key}
              opaKey={slot.opa}
              zoomKey={slot.zoom}
            />
          ))}
        </div>
        {composite ? (
          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--bb-text)]">
            <input
              type="checkbox"
              checked={Boolean(t.state._fillCutWithPaper)}
              onChange={(e) => app.setFillCut(e.target.checked)}
            />
            Fill the cut shape with paper
          </label>
        ) : null}
        <button
          type="button"
          className="mt-3 text-xs text-[var(--bb-gold)] underline-offset-2 hover:underline"
          onClick={() => setMoreBg((v) => !v)}
        >
          {moreBg ? "Hide extra layers" : "More layers (3–5 + QR)"}
        </button>
        {moreBg ? (
          <div className="mt-3 flex flex-col gap-3">
            {BG_MORE.map((slot) => (
              <ImageSlot
                key={slot.key}
                label={slot.label}
                field={slot.key}
                opaKey={slot.opa}
                zoomKey={slot.zoom}
              />
            ))}
          </div>
        ) : null}
      </Accordion>

      <Accordion title="Icon library">
        <p className="mb-3 text-sm text-[var(--bb-muted)]">
          {categoryCount("all")} variants in the repo catalog, grouped by category. Click one to stamp it on this
          design.
        </p>
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search icons"
          aria-label="Search icons"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ICON_CATEGORIES.map((c) => {
            const on = cat === c.id;
            const n = categoryCount(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  on
                    ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                    : "border-[var(--bb-line)] text-[var(--bb-text)]"
                }`}
              >
                {c.label} {n}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--bb-muted)]">Size</span>
          {ICON_SIZES.map((s) => {
            const on = sizeId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSizeId(s.id)}
                className={`min-h-9 min-w-9 rounded-full border px-2 text-xs ${
                  on
                    ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                    : "border-[var(--bb-line)] text-[var(--bb-text)]"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--bb-muted)]">
          {icons.length} in {ICON_CATEGORIES.find((c) => c.id === cat)?.label ?? cat}
        </p>
        <div className="mt-2 grid max-h-[28rem] grid-cols-4 gap-1.5 overflow-auto sm:grid-cols-5 lg:grid-cols-6">
          {icons.map((ic) => (
            <button
              key={ic.id}
              type="button"
              title={ic.label}
              onClick={() => {
                app.applyIcon(ic.id, sizeId, ink);
              }}
              className="flex aspect-square flex-col items-center justify-center rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-1"
              style={{ background: fill }}
            >
              <span
                className="block h-8 w-8"
                dangerouslySetInnerHTML={{ __html: iconSvg(ic, ink, ic.thickCurve ? 2.8 : ic.fill ? 0.9 : 2) }}
              />
              <span className="mt-0.5 w-full truncate text-[9px] leading-tight" style={{ color: ink }}>
                {ic.label}
              </span>
            </button>
          ))}
        </div>
        {placed.length ? (
          <div className="mt-3 flex flex-col gap-1">
            <p className="text-xs text-[var(--bb-muted)]">On this design</p>
            {placed.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-sm text-[var(--bb-text)]">
                <span className="truncate">{item.label}</span>
                <ActionBtn tone="ghost" onClick={() => app.removeArt(item.id)}>
                  Remove
                </ActionBtn>
              </div>
            ))}
          </div>
        ) : null}
      </Accordion>
    </>
  );
}
