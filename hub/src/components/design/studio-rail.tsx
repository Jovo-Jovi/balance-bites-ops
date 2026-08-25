"use client";

import { useState } from "react";
import { ActionBtn } from "@/components/invoices/ui";
import {
  characterPresetKeys,
  characterPresetLabel,
  isPrintPackExcludedArt,
  presetThumbFill,
} from "@/lib/design/art-presets";
import { previewFace } from "@/lib/design/layout";
import { PART_TYPES } from "@/lib/design/part-types";
import { COMPOSITE_BLOCKS, WRAP_RECIPE_BLOCKS, isWrapFace, wrapBlockOn } from "@/lib/design/studio-library";
import { ImagesPanel, IconsPanel } from "./art-panel";
import { useDesignApp } from "./design-context";
import { FlavorPacks } from "./flavor-packs";

type RailId = "shapes" | "blocks" | "icons" | "uploads" | "brand" | "characters";

const RAILS: { id: RailId; label: string }[] = [
  { id: "shapes", label: "Shapes" },
  { id: "blocks", label: "Blocks" },
  { id: "icons", label: "Icons" },
  { id: "uploads", label: "Uploads" },
  { id: "brand", label: "Brand" },
  { id: "characters", label: "Characters" },
];

function chipClass(on: boolean) {
  return `rounded-[var(--bb-radius)] border px-3 py-2 text-xs tracking-wide uppercase min-h-11 ${
    on
      ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
      : "border-[var(--bb-line)] text-[var(--bb-text)]"
  }`;
}

export function StudioRail() {
  const app = useDesignApp();
  const t = app.current;
  const [rail, setRail] = useState<RailId>("shapes");
  if (!t) return null;
  const face = previewFace(t);
  const composite = face === "composite";
  const wrap = isWrapFace(face);

  return (
    <aside className="w-full shrink-0 xl:sticky xl:top-24 xl:w-[17.5rem]">
      <div className="bb-tabstrip mb-2 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Libraries">
        {RAILS.map((item) => {
          const on = rail === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setRail(item.id)}
              className={chipClass(on)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="bb-sheet max-h-[min(70vh,44rem)] overflow-y-auto p-3">
        {rail === "shapes" ? (
          composite ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--bb-muted)]">Tap a die piece, then Merge / Trim / Cut on the bar above.</p>
              <div className="flex flex-wrap gap-1.5">
                {PART_TYPES.map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    className="min-h-11 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-2.5 text-[11px] text-[var(--bb-text)] hover:border-[var(--bb-gold)]"
                    onClick={() => app.addStudioShape(shape.id)}
                  >
                    {shape.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--bb-muted)]">
              Shapes are for Composite. Wrap and taper keep their geometry recipes — switch Family to Composite to draw a
              freeform cut.
            </p>
          )
        ) : null}

        {rail === "blocks" ? (
          wrap ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--bb-muted)]">
                Starter recipes on this wrap. User-named sections come later.
              </p>
              {WRAP_RECIPE_BLOCKS.map((b) => {
                const on = wrapBlockOn(t.state, b.chk, b.fallbackOn);
                return (
                  <button
                    key={b.k}
                    type="button"
                    onClick={() => {
                      if (!on) app.setField(b.chk, "true");
                      app.selectLayer(b.famId);
                    }}
                    className={`min-h-11 rounded-[var(--bb-radius)] border px-3 py-2 text-left text-sm ${
                      on
                        ? "border-[var(--bb-title)] text-[var(--bb-text)]"
                        : "border-[var(--bb-line)] text-[var(--bb-text)]"
                    }`}
                  >
                    <span className="block font-medium">{on ? "On · " : "Add · "}{b.label}</span>
                    <span className="block text-[11px] text-[var(--bb-muted)]">{b.hint}</span>
                  </button>
                );
              })}
            </div>
          ) : composite ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--bb-muted)]">Drop a content block onto the die. Drag it after it lands.</p>
              {COMPOSITE_BLOCKS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="min-h-11 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-3 text-sm text-[var(--bb-text)] hover:border-[var(--bb-gold)]"
                  onClick={() => {
                    app.addStudioZone(b.id);
                    if (b.id === "image") setRail("uploads");
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--bb-muted)]">
              Recipe columns are for wrap and taper. On this face, type in Copy. Switch Family to Composite for text /
              logo / expiry / photo layers.
            </p>
          )
        ) : null}

        {rail === "icons" ? <IconsPanel /> : null}
        {rail === "uploads" ? <ImagesPanel /> : null}

        {rail === "brand" ? (
          <div className="grid gap-3">
            <FlavorPacks />
            <ActionBtn
              tone="ghost"
              onClick={() => {
                if (wrap) {
                  app.setField("chkS3", "true");
                  app.selectLayer(WRAP_RECIPE_BLOCKS.find((b) => b.k === "3")!.famId);
                  return;
                }
                app.addStudioZone("logo");
              }}
            >
              Drop BB disc
            </ActionBtn>
            <p className="text-xs text-[var(--bb-muted)]">
              Flavor packs stay in code. Logos you upload live on R2 — pick them in Uploads.
            </p>
          </div>
        ) : null}

        {rail === "characters" ? (
          composite ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--bb-muted)]">
                Applies repo art to the selected shape (or the first one). Stores artref only — not the SVG file. Blue /
                red popcorn warn for commercial packs.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {characterPresetKeys().map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="flex min-h-11 items-center gap-2 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-2 text-left text-[11px] text-[var(--bb-text)] hover:border-[var(--bb-gold)]"
                    onClick={() => app.applyStudioCharacter(key)}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-sm border border-[var(--bb-line)]"
                      style={{ background: presetThumbFill(key) || "#ccc" }}
                    />
                    <span>
                      {characterPresetLabel(key)}
                      {isPrintPackExcludedArt(key) ? " · licensed" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--bb-muted)]">
              Character art sits on a Composite silhouette. Switch Family, add a shape, then tap a character.
            </p>
          )
        ) : null}
      </div>
      <p className="mt-2 text-xs text-[var(--bb-muted)]">
        Saved templates stay in{" "}
        <button type="button" className="underline" onClick={app.openLibrary}>
          Library
        </button>
        . Not a fourth tool.
      </p>
    </aside>
  );
}
