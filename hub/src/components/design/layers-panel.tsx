"use client";

import { Accordion, ActionBtn, Field, TextInput } from "@/components/invoices/ui";
import { listLayers } from "@/lib/design/layers";
import { iconSvg } from "@/lib/design/icons";
import { useDesignApp } from "./design-context";

export function LayersPanel() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const layers = listLayers(t.state);
  const fill = String(t.state.cLabel || "#2e7d32");

  return (
    <Accordion title="Layers">
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        Front of the sticker is at the top. Tap a row to select it on the preview, then drag.
      </p>
      {layers.length === 0 ? (
        <p className="text-sm text-[var(--bb-muted)]">No extra layers yet. Icons you add show up here.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {layers.map((layer, i) => (
            <li
              key={layer.id}
              className={`flex flex-wrap items-center gap-2 rounded-[var(--bb-radius)] border px-2 py-2 ${
                app.selectedId === layer.id
                  ? "border-[var(--bb-gold)] bg-[var(--bb-gold)]/10"
                  : "border-[var(--bb-line)]"
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => app.selectLayer(app.selectedId === layer.id ? null : layer.id)}
              >
              {layer.iconId ? (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded"
                  style={{ background: fill }}
                  dangerouslySetInnerHTML={{ __html: iconSvg(layer.iconId, layer.color || "#fff", 2) }}
                />
              ) : (
                <span className="h-8 w-8 rounded border border-[var(--bb-line)]" style={{ background: layer.color || fill }} />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--bb-text)]">{layer.label}</span>
              </button>
              {layer.color ? (
                <label className="flex items-center gap-1 text-xs text-[var(--bb-muted)]">
                  Color
                  <input
                    type="color"
                    value={toHex(layer.color)}
                    onChange={(e) => app.patchLayer(layer.id, { color: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
                    aria-label={`${layer.label} color`}
                  />
                </label>
              ) : null}
              <div className="flex gap-1">
                <ActionBtn tone="ghost" disabled={i === 0} onClick={() => app.moveLayer(layer.id, 1)}>
                  Up
                </ActionBtn>
                <ActionBtn tone="ghost" disabled={i === layers.length - 1} onClick={() => app.moveLayer(layer.id, -1)}>
                  Down
                </ActionBtn>
                {layer.removable ? (
                  <ActionBtn tone="ghost" onClick={() => app.removeArt(layer.id)}>
                    Remove
                  </ActionBtn>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Accordion>
  );
}

function toHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return "#ffffff";
}
