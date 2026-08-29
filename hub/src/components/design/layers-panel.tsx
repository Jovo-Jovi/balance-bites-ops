"use client";

import { useState } from "react";
import { ActionBtn, Field } from "@/components/invoices/ui";
import { familySectionKey, layerBorder, layerDeco, layerSize, listCanvasItems, listLayers } from "@/lib/design/layers";
import { cssFill } from "@/lib/design/fills";
import { iconSvg } from "@/lib/design/icons";
import { CUT_STROKE_COLOR, CUT_STROKE_MM } from "@/lib/design/preview";
import { useDesignApp } from "./design-context";
import { FillControls } from "./fill-controls";

export function LayersPanel() {
  const app = useDesignApp();
  const t = app.current;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  if (!t) return null;
  const layers = listLayers(t);
  const selectedItem = listCanvasItems(t).find((item) => item.id === app.selectedId);
  const strokeMm = String(t.state.sCutStrokeMm ?? CUT_STROKE_MM);
  const strokeColor = String(t.state.cCutStroke || CUT_STROKE_COLOR);
  const secIds = [...new Set(layers.map((l) => familySectionKey(l.id)).filter(Boolean))];
  const zIds = layers
    .filter((l) => !familySectionKey(l.id) && (l.kind === "part" || l.kind === "zone" || l.kind === "stamp"))
    .map((l) => l.id);

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        Print cut is the die-cut stroke (the black rim on characters like popcorn). Drag a layer to restack it, or use
        Up / Down. Each layer has its own size and decorative border. On wrap, that reorders the columns.
      </p>
      <ul className="flex flex-col gap-2">
        {layers.map((layer) => {
          const selected = app.selectedIds.includes(layer.id) || app.selectedId === layer.id;
          const cut = layer.kind === "cut";
          const sec = familySectionKey(layer.id);
          const stackIds = sec ? secIds : zIds;
          const stackAt = stackIds.indexOf(sec || layer.id);
          const inStack = stackAt >= 0;
          const deco = layerDeco(t.state, layer.id);
          const border = selected && !cut ? layerBorder(t, layer.id) : null;
          const size = cut ? null : layerSize(t, layer.id);
          const dragging = dragId === layer.id;
          const dropTarget = Boolean(overId === layer.id && dragId && dragId !== layer.id && inStack);
          return (
            <li
              key={layer.id}
              onDragOver={(e) => {
                if (!inStack) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverId(layer.id);
              }}
              onDragLeave={() => {
                if (overId === layer.id) setOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                if (id && id !== layer.id && inStack) app.moveLayerTo(id, layer.id);
                setDragId(null);
                setOverId(null);
              }}
              className={`flex flex-col gap-2 rounded-[var(--bb-radius)] border px-2 py-2 ${
                selected
                  ? "border-[var(--bb-gold)] bg-[var(--bb-gold)]/10"
                  : dropTarget
                    ? "border-[var(--bb-gold)]"
                    : "border-[var(--bb-line)]"
              } ${dragging ? "opacity-50" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {inStack ? (
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", layer.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(layer.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    className="cursor-grab select-none px-0.5 text-base leading-none text-[var(--bb-muted)] active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-hidden
                  >
                    ⋮⋮
                  </span>
                ) : null}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  onClick={(e) => {
                    if (app.selectedId === layer.id && !e.shiftKey && !app.clipPick) app.selectLayer(null);
                    else app.selectLayer(layer.id, { shift: e.shiftKey });
                  }}
                >
                  {layer.iconId ? (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded border border-[var(--bb-line)] bg-[var(--bb-panel)]"
                      dangerouslySetInnerHTML={{
                        __html: iconSvg(layer.iconId, layer.color || "#c9a84c", 2, layer.letterStyle, {
                          color2: layer.color2,
                          fillMode: layer.fillMode,
                          paintId: layer.id,
                        }),
                      }}
                    />
                  ) : (
                    <span
                      className="h-8 w-8 rounded border border-[var(--bb-line)]"
                      style={{ background: deco?.fill ? cssFill(deco.color, deco.color2, deco.fillMode, layer.color) : layer.color || "var(--bb-panel)" }}
                    />
                  )}
                  <span
                    className="min-w-0 flex-1 whitespace-normal break-words text-sm leading-snug text-[var(--bb-text)]"
                    title={layer.label}
                  >
                    {layer.label}
                  </span>
                </button>
                {layer.color && !cut && !deco?.fill ? (
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
                  <ActionBtn tone="ghost" disabled={!inStack || stackAt === 0} onClick={() => app.moveLayer(layer.id, 1)}>
                    Up
                  </ActionBtn>
                  <ActionBtn
                    tone="ghost"
                    disabled={!inStack || stackAt === stackIds.length - 1}
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
              {deco?.fill && selected && !cut ? (
                <FillControls
                  color={deco.color}
                  color2={deco.color2}
                  fillMode={deco.fillMode}
                  onChange={(patch) => app.patchLayer(layer.id, patch)}
                  curve={deco.curve ? deco.curveValue : undefined}
                  onCurve={deco.curve ? (v) => app.patchLayer(layer.id, { curve: v }) : undefined}
                  sweep={deco.sweep ? deco.sweepValue : undefined}
                  onSweep={deco.sweep ? (v) => app.patchLayer(layer.id, { sweep: v }) : undefined}
                />
              ) : null}
              {size ? (
                <Field label={`Size ${sizeLabel(size)}`}>
                  <input
                    type="range"
                    min={size.min}
                    max={size.max}
                    step={size.step}
                    value={size.value}
                    onChange={(e) => app.patchLayer(layer.id, { size: Number(e.target.value) })}
                    onPointerUp={() => app.syncCutPath()}
                    onPointerCancel={() => app.syncCutPath()}
                    className="w-full accent-[var(--bb-gold)]"
                  />
                </Field>
              ) : null}
              {selected && selectedItem && !cut ? (
                <Field label={`Rotate ${Math.round((selectedItem.rot || 0) - (selectedItem.fan || 0))}°`}>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={Math.round((selectedItem.rot || 0) - (selectedItem.fan || 0))}
                    onChange={(e) =>
                      app.rotateItem(layer.id, Number(e.target.value) + (selectedItem.fan || 0))
                    }
                    className="w-full accent-[var(--bb-gold)]"
                  />
                </Field>
              ) : null}
              {border ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label={`${deco?.sweep ? "Thickness" : "Border"} ${border.width}`}>
                    <input
                      type="range"
                      min={0}
                      max={border.max}
                      step={0.1}
                      value={border.width}
                      onChange={(e) => app.patchLayer(layer.id, { borderWidth: Number(e.target.value) })}
                      className="w-full accent-[var(--bb-gold)]"
                    />
                  </Field>
                  {border.showColor ? (
                    <label className="flex items-center gap-2 text-xs text-[var(--bb-muted)]">
                      Border
                      <input
                        type="color"
                        value={toHex(border.color)}
                        onChange={(e) => app.patchLayer(layer.id, { borderColor: e.target.value })}
                        className="h-8 w-8 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
                        aria-label={`${layer.label} border color`}
                      />
                    </label>
                  ) : null}
                </div>
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

function sizeLabel(size: { value: number; step: number; suffix: string }) {
  if (size.suffix === "×") return `${Math.round(size.value * 100)}%`;
  const shown = size.step < 1 ? Number(size.value.toFixed(1)) : Math.round(size.value);
  return `${shown} ${size.suffix}`;
}

function toHex(value: string) {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return "#c9a84c";
}
