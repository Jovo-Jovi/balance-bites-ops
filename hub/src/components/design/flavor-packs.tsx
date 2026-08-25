"use client";

import { FLAVOR_PACKS } from "@/lib/design/colors";
import { hasExactArt } from "@/lib/design/art";
import { useDesignApp } from "./design-context";

function str(state: Record<string, unknown>, key: string) {
  return String(state[key] ?? "");
}

export function FlavorPacks() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const packHint = FLAVOR_PACKS.find((p) => p.bg.toLowerCase() === str(t.state, "cLabel").toLowerCase());
  const loadedOn = app.loadedFlavorOn;
  const artNative = hasExactArt(t.state);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-[var(--bb-muted)]">
        {artNative
          ? "Artwork carries its own colors. Loaded restores the fills saved on this template."
          : loadedOn
            ? "Loaded — the colors already on this template."
            : packHint
              ? `Fill matches ${packHint.name}.`
              : "Custom fill — not a listed pack."}{" "}
        Packs tint the sticker, not this workspace.
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
    </div>
  );
}
