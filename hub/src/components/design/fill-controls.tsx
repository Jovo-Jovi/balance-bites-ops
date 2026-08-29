"use client";

import { Field } from "@/components/invoices/ui";
import { ARC_SWEEP_HALF, ARC_SWEEP_THIRD } from "@/lib/design/deco";
import { FILL_MODES, cssFill, fillModeOf, pairColor, toHexColor, type FillMode } from "@/lib/design/fills";

function chipClass(on: boolean) {
  return `rounded-[var(--bb-radius)] border px-2.5 py-1.5 text-[11px] tracking-wide uppercase min-h-11 ${
    on
      ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
      : "border-[var(--bb-line)] text-[var(--bb-text)]"
  }`;
}

export function FillControls({
  color,
  color2,
  fillMode,
  onChange,
  curve,
  onCurve,
  sweep,
  onSweep,
}: {
  color?: string;
  color2?: string;
  fillMode?: string;
  onChange: (patch: { color?: string; color2?: string; fillMode?: FillMode }) => void;
  curve?: number;
  onCurve?: (value: number) => void;
  sweep?: number;
  onSweep?: (value: number) => void;
}) {
  const mode = fillModeOf(fillMode);
  const c1 = color || "#c9a84c";
  const c2 = color2 || pairColor(c1);
  const dual = mode !== "solid";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILL_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={chipClass(mode === item.id)}
            onClick={() =>
              onChange({
                fillMode: item.id,
                color2: item.id === "solid" ? color2 : color2 || pairColor(c1),
              })
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-xs text-[var(--bb-muted)]">
          {dual ? "Color 1" : "Color"}
          <input
            type="color"
            value={toHexColor(c1)}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-8 w-8 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
            aria-label={dual ? "Color 1" : "Color"}
          />
        </label>
        {dual ? (
          <label className="flex items-center gap-1 text-xs text-[var(--bb-muted)]">
            Color 2
            <input
              type="color"
              value={toHexColor(c2)}
              onChange={(e) => onChange({ color2: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded border border-[var(--bb-line)] bg-transparent"
              aria-label="Color 2"
            />
          </label>
        ) : null}
        <span
          className="h-8 w-14 rounded border border-[var(--bb-line)]"
          style={{ background: cssFill(c1, c2, mode) }}
          aria-hidden
        />
      </div>
      {onCurve ? (
        <Field label={`Curvature ${Math.round(curve ?? 0)}`}>
          <input
            type="range"
            min={-100}
            max={100}
            step={1}
            value={curve ?? 0}
            onChange={(e) => onCurve(Number(e.target.value))}
            className="w-full accent-[var(--bb-gold)]"
          />
        </Field>
      ) : null}
      {onSweep ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chipClass(Math.abs((sweep ?? 0) - ARC_SWEEP_THIRD) < 1)} onClick={() => onSweep(ARC_SWEEP_THIRD)}>
              ⅓ circle
            </button>
            <button type="button" className={chipClass(Math.abs((sweep ?? 0) - ARC_SWEEP_HALF) < 1)} onClick={() => onSweep(ARC_SWEEP_HALF)}>
              ½ circle
            </button>
          </div>
          <Field label={`Sweep ${Math.round(sweep ?? ARC_SWEEP_HALF)}°`}>
            <input
              type="range"
              min={30}
              max={330}
              step={1}
              value={sweep ?? ARC_SWEEP_HALF}
              onChange={(e) => onSweep(Number(e.target.value))}
              className="w-full accent-[var(--bb-gold)]"
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
