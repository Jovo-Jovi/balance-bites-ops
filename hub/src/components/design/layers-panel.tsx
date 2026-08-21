"use client";

import { ActionBtn, Field } from "@/components/invoices/ui";
import { listCanvasItems, listLayers } from "@/lib/design/layers";
import { iconSvg } from "@/lib/design/icons";
import { CUT_STROKE_COLOR, CUT_STROKE_MM } from "@/lib/design/preview";
import { useDesignApp } from "./design-context";

export function LayersPanel() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const layers = listLayers(t);
  const selectedItem = listCanvasItems(t).find((item) => item.id === app.selectedId);
  const strokeMm = String(t.state.sCutStrokeMm ?? CUT_STROKE_MM);
  const strokeColor = String(t.state.cCutStroke || CUT_STROKE_COLOR);

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        Print cut is the die-cut stroke. Tap a row, then drag to move or use the round handle to rotate.
      </p>
      <ul className="flex flex-col gap-2">
        {layers.map((layer, i) => {
          const selected = app.selectedId === layer.id;
          const cut = layer.kind === "cut";
          return (
            <li
              key={layer.id}
              className={`flex flex-col gap-2 rounded-[var(--bb-radius)] border px-2 py-2 ${
                selected
                  ? "border-[var(--bb-gold)] bg-[var(--bb-gold)]/10"
                  : "border-[var(--bb-line)]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => app.selectLayer(selected ? null : layer.id)}
                >
                  {layer.iconId ? (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded border border-[var(--bb-line)] bg-[var(--bb-panel)]"
                      dangerouslySetInnerHTML={{
                        __html: iconSvg(layer.iconId, layer.color || "#c9a84c", 2, layer.letterStyle),
                      }}
                    />
                  ) : (
                    <span
                      className="h-8 w-8 rounded border border-[var(--bb-line)]"
                      style={{ background: layer.color || "var(--bb-panel)" }}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--bb-text)]">{layer.label}</span>
                </button>
                {layer.color && !cut ? (
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
                  <ActionBtn tone="ghost" disabled={cut || i === 0} onClick={() => app.moveLayer(layer.id, 1)}>
                    Up
                  </ActionBtn>
                  <ActionBtn
                    tone="ghost"
                    disabled={cut || i === layers.length - 1}
                    onClick={() => app.moveLayer(layer.id, -1)}
                  >
                    Down
                  </ActionBtn>
                  {layer.removable ? (
                    <ActionBtn tone="ghost" onClick={() => app.removeArt(layer.id)}>
                      Remove
                    </ActionBtn>
                  ) : null}
                </div>
              </div>
              {selected && selectedItem && !cut ? (
                <Field label={`Rotate ${Math.round(selectedItem.rot || 0)}°`}>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={Math.round(selectedItem.rot || 0)}
                    onChange={(e) => app.rotateItem(layer.id, Number(e.target.value))}
                    className="w-full accent-[var(--bb-gold)]"
                  />
                </Field>
              ) : null}
              {cut && selected ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label={`Stroke ${strokeMm} mm`}>
                    <input
                      type="range"
                      min={0.1}
                      max={2}
                      step={0.05}
                      value={strokeMm}
                      onChange={(e) => app.setField("sCutStrokeMm", e.target.value)}
                      className="w-full accent-[var(--bb-gold)]"
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-xs text-[var(--bb-muted)]">
                    Color
                    <input
                      type="color"
                      value={toHex(strokeColor)}
                      onChange={(e) => app.setField("cCutStroke", e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
                      aria-label="Print cut color"
                    />
                  </label>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function toHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return "#c9a84c";
}
