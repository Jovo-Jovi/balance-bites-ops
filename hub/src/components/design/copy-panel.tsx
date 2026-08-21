"use client";

import { Accordion, Field, TextInput } from "@/components/invoices/ui";
import { stickerCopyFields } from "@/lib/design/layers";
import { useDesignApp } from "./design-context";

export function CopyPanel() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const rows = stickerCopyFields(t.designType, t.state);
  const composite = t.designType === "composite";

  return (
    <Accordion title="On the sticker">
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        {composite
          ? "These are the text and logo blocks already on this die-cut."
          : "These lines are the ones drawn on this family."}
      </p>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label={row.label}>
              <TextInput
                value={row.text}
                onChange={(e) => {
                  if (composite) app.patchLayer(row.id, { text: e.target.value });
                  else app.setField(row.field, e.target.value);
                }}
              />
            </Field>
            {composite && row.color ? (
              <label className="flex items-center gap-2 pb-1 text-xs text-[var(--bb-muted)]">
                Color
                <input
                  type="color"
                  value={toHex(row.color)}
                  onChange={(e) => app.patchLayer(row.id, { color: e.target.value })}
                  className="h-11 w-11 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
                  aria-label={`${row.label} color`}
                />
              </label>
            ) : null}
          </div>
        ))}
      </div>
    </Accordion>
  );
}

function toHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return "#ffffff";
}
