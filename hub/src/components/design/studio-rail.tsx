"use client";

import { useState } from "react";
import { ActionBtn } from "@/components/invoices/ui";
import {
  CHARACTER_SEEDS,
  CHARACTER_STYLES,
  characterThumbUrl,
  type CharacterStyleId,
} from "@/lib/design/character-library";
import {
  PACK_AUDIENCES,
  presetSrcForKey,
  studioPackArtFor,
  studioPackArtLabel,
  studioPackGroupsFor,
  type PackAudience,
} from "@/lib/design/art-presets";
import { blockLayerId, listBlocks } from "@/lib/design/blocks";
import { previewFace } from "@/lib/design/layout";
import { PART_TYPES } from "@/lib/design/part-types";
import {
  ARC_PRESETS,
  COMPOSITE_BLOCKS,
  DECO_BLOCKS,
  WRAP_RECIPE_BLOCKS,
  isWrapFace,
  placedCharacters,
  placedCompositeBlocks,
  placedDecoStamps,
  wrapBlockOn,
} from "@/lib/design/studio-library";
import { ImagesPanel, IconsPanel } from "./art-panel";
import { useDesignApp } from "./design-context";
import { FlavorPacks } from "./flavor-packs";

type RailId = "shapes" | "pack" | "blocks" | "icons" | "uploads" | "brand" | "characters";

const RAILS: { id: RailId; label: string }[] = [
  { id: "shapes", label: "Shapes" },
  { id: "pack", label: "Pack art" },
  { id: "blocks", label: "Blocks" },
  { id: "icons", label: "Icons" },
  { id: "uploads", label: "Uploads" },
  { id: "brand", label: "Brand" },
  { id: "characters", label: "Characters" },
];

function DecoButtons({
  onZone,
}: {
  onZone: (kind: "text" | "curved" | "arc", sweep?: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-[11px] uppercase tracking-wide text-[var(--bb-muted)]">Type and arcs</p>
      {DECO_BLOCKS.map((b) => (
        <button
          key={b.id}
          type="button"
          className="min-h-11 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-3 py-2 text-left text-sm text-[var(--bb-text)] hover:border-[var(--bb-gold)]"
          onClick={() => onZone(b.id)}
        >
          <span className="block font-medium">{b.label}</span>
          <span className="block text-[11px] text-[var(--bb-muted)]">{b.hint}</span>
        </button>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {ARC_PRESETS.map((p) => (
          <button
            key={p.sweep}
            type="button"
            className="min-h-11 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-3 text-sm text-[var(--bb-text)] hover:border-[var(--bb-gold)]"
            onClick={() => onZone("arc", p.sweep)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [packAudience, setPackAudience] = useState<PackAudience>("kids");
  const [charStyle, setCharStyle] = useState<CharacterStyleId>("open-peeps");
  const [charName, setCharName] = useState("");
  const [charBusy, setCharBusy] = useState("");
  if (!t) return null;
  const face = previewFace(t);
  const composite = face === "composite";
  const wrap = isWrapFace(face);
  const placedBlocks = composite ? placedCompositeBlocks(t.state) : [];
  const namedWrap = wrap ? listBlocks(t.state) : [];
  const decoStamps = !composite ? placedDecoStamps(t.state, face) : [];
  const charsOnCanvas = placedCharacters(t.state, face);

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

        {rail === "pack" ? (
          composite ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--bb-muted)]">
                Kids line or adult pack. Tap to drop on the die, then drag. Not popcorn.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PACK_AUDIENCES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={chipClass(packAudience === item.id)}
                    onClick={() => setPackAudience(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {studioPackGroupsFor(packAudience).map((group) => {
                const items = studioPackArtFor(packAudience).filter((art) => art.group === group.id);
                return (
                  <div key={group.id} className="grid gap-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--bb-muted)]">{group.label}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map((art) => (
                        <button
                          key={art.key}
                          type="button"
                          className="grid min-h-11 gap-1 rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-2 text-left hover:border-[var(--bb-gold)]"
                          onClick={() => app.applyStudioPackArt(art.key)}
                        >
                          <span className="flex h-20 items-center justify-center bg-[color-mix(in_srgb,var(--bb-line)_22%,var(--bb-panel))]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={presetSrcForKey(art.key)}
                              alt=""
                              className="max-h-[4.5rem] max-w-full object-contain"
                            />
                          </span>
                          <span className="text-[11px] text-[var(--bb-text)]">{studioPackArtLabel(art.key)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--bb-muted)]">
              Pack art drops on Composite. Switch Family to Composite, then tap a piece.
            </p>
          )
        ) : null}

        {rail === "blocks" ? (
          wrap ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--bb-muted)]">
                Starter recipes on this wrap. Remove turns a column off. Named sections are yours — title plus EN/AR
                fields.
              </p>
              <ActionBtn onClick={() => app.addNamedSection()}>Named section</ActionBtn>
              {WRAP_RECIPE_BLOCKS.map((b) => {
                const on = wrapBlockOn(t.state, b.chk, b.fallbackOn);
                return (
                  <div key={b.k} className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!on) app.setField(b.chk, "true");
                        app.selectLayer(b.famId);
                      }}
                      className={`min-h-11 min-w-0 flex-1 rounded-[var(--bb-radius)] border px-3 py-2 text-left text-sm ${
                        on
                          ? "border-[var(--bb-title)] text-[var(--bb-text)]"
                          : "border-[var(--bb-line)] text-[var(--bb-text)]"
                      }`}
                    >
                      <span className="block font-medium">
                        {on ? "On · " : "Add · "}
                        {b.label}
                      </span>
                      <span className="block text-[11px] text-[var(--bb-muted)]">{b.hint}</span>
                    </button>
                    {on ? (
                      <ActionBtn tone="ghost" onClick={() => app.removeArt(b.famId)}>
                        Remove
                      </ActionBtn>
                    ) : null}
                  </div>
                );
              })}
              {namedWrap.length ? (
                <div className="grid gap-1.5 border-t border-[var(--bb-line)] pt-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--bb-muted)]">Named on this wrap</p>
                  {namedWrap.map((b) => (
                    <div
                      key={b.id}
                      className="flex min-h-11 items-center gap-1.5 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-2"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm text-[var(--bb-text)]"
                        onClick={() => app.selectLayer(blockLayerId(b.id))}
                      >
                        {b.title || "Section"}
                      </button>
                      <ActionBtn tone="ghost" onClick={() => app.removeArt(blockLayerId(b.id))}>
                        Remove
                      </ActionBtn>
                    </div>
                  ))}
                </div>
              ) : null}
              <DecoButtons onZone={(kind, sweep) => app.addStudioZone(kind, sweep != null ? { sweep } : undefined)} />
              {decoStamps.length ? (
                <div className="grid gap-1.5 border-t border-[var(--bb-line)] pt-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--bb-muted)]">On this wrap</p>
                  {decoStamps.map((s) => (
                    <div
                      key={s.id}
                      className="flex min-h-11 items-center gap-1.5 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-2"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm text-[var(--bb-text)]"
                        onClick={() => app.selectLayer(s.id)}
                      >
                        {s.label}
                      </button>
                      <ActionBtn tone="ghost" onClick={() => app.removeArt(s.id)}>
                        Remove
                      </ActionBtn>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : composite ? (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--bb-muted)]">
                Drop a content block onto the die. Select it and tap Remove, or press Delete.
              </p>
              <ActionBtn onClick={() => app.addNamedSection()}>Named section</ActionBtn>
              <DecoButtons onZone={(kind, sweep) => app.addStudioZone(kind, sweep != null ? { sweep } : undefined)} />
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
              {placedBlocks.length ? (
                <div className="grid gap-1.5 border-t border-[var(--bb-line)] pt-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--bb-muted)]">On this die</p>
                  {placedBlocks.map((z) => (
                    <div
                      key={z.id}
                      className="flex min-h-11 items-center gap-1.5 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-2"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm text-[var(--bb-text)]"
                        onClick={() => app.selectLayer(z.id)}
                      >
                        {z.label || z.kind}
                      </button>
                      <ActionBtn tone="ghost" onClick={() => app.removeArt(z.id)}>
                        Remove
                      </ActionBtn>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="text-xs text-[var(--bb-muted)]">
                Curved type and arc strokes drop on this face. Recipe columns stay on wrap. Switch Family to Composite
                for logo / expiry / photo layers.
              </p>
              <DecoButtons onZone={(kind, sweep) => app.addStudioZone(kind, sweep != null ? { sweep } : undefined)} />
              {decoStamps.length ? (
                <div className="grid gap-1.5 border-t border-[var(--bb-line)] pt-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--bb-muted)]">On this label</p>
                  {decoStamps.map((s) => (
                    <div
                      key={s.id}
                      className="flex min-h-11 items-center gap-1.5 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-2"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm text-[var(--bb-text)]"
                        onClick={() => app.selectLayer(s.id)}
                      >
                        {s.label}
                      </button>
                      <ActionBtn tone="ghost" onClick={() => app.removeArt(s.id)}>
                        Remove
                      </ActionBtn>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
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
          <div className="grid gap-2">
            <p className="text-xs text-[var(--bb-muted)]">
              General people from DiceBear (Open Peeps and friends, CC BY). Not popcorn / pretzels / china crackers —
              those stay on saved product templates.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CHARACTER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={chipClass(charStyle === s.id)}
                  onClick={() => setCharStyle(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <label className="grid gap-1 text-[11px] text-[var(--bb-muted)]">
              Type a name
              <span className="flex gap-1.5">
                <input
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="e.g. Marco"
                  className="bb-glass-input min-h-11 min-w-0 flex-1 px-3 text-sm text-[var(--bb-text)]"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || charBusy) return;
                    const seed = charName.trim() || "Felix";
                    setCharBusy(seed);
                    void app.applyStudioCharacter(charStyle, seed).finally(() => setCharBusy(""));
                  }}
                />
                <ActionBtn
                  tone="ghost"
                  disabled={Boolean(charBusy)}
                  onClick={() => {
                    const seed = charName.trim() || "Felix";
                    setCharBusy(seed);
                    void app.applyStudioCharacter(charStyle, seed).finally(() => setCharBusy(""));
                  }}
                >
                  Add
                </ActionBtn>
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CHARACTER_SEEDS.map((seed) => {
                const busy = charBusy === seed;
                return (
                  <button
                    key={seed}
                    type="button"
                    disabled={Boolean(charBusy)}
                    className="flex min-h-11 flex-col items-center gap-1 rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-1.5 text-[10px] text-[var(--bb-text)] hover:border-[var(--bb-gold)] disabled:opacity-60"
                    onClick={() => {
                      setCharBusy(seed);
                      void app.applyStudioCharacter(charStyle, seed).finally(() => setCharBusy(""));
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={characterThumbUrl(charStyle, seed)}
                      alt=""
                      width={64}
                      height={64}
                      className="h-12 w-12 rounded-sm bg-[var(--bb-panel)] object-contain"
                    />
                    <span className="truncate">{busy ? "…" : seed}</span>
                  </button>
                );
              })}
            </div>
            {charsOnCanvas.length ? (
              <div className="grid gap-1.5 border-t border-[var(--bb-line)] pt-2">
                <p className="text-[11px] uppercase tracking-wide text-[var(--bb-muted)]">On this label</p>
                {charsOnCanvas.map((c) => (
                  <div
                    key={c.id}
                    className="flex min-h-11 items-center gap-1.5 rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-2"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-sm text-[var(--bb-text)]"
                      onClick={() => app.selectLayer(c.id)}
                    >
                      {c.label}
                    </button>
                    <ActionBtn tone="ghost" onClick={() => app.removeArt(c.id)}>
                      Remove
                    </ActionBtn>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
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
