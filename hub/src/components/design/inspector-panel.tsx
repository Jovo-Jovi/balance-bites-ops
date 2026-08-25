"use client";

import { useEffect, useState } from "react";
import { FLAVOR_PACKS } from "@/lib/design/colors";
import { hasExactArt } from "@/lib/design/art";
import type { PreviewFace } from "@/lib/design/layout";
import { familyFocus } from "@/lib/design/layout";
import { ImagesPanel, IconsPanel } from "./art-panel";
import {
  ColorFields,
  CopyPanel,
  LayoutPanel,
  NutritionPanel,
  SizePanel,
  TypePanel,
} from "./copy-panel";
import { useDesignApp } from "./design-context";
import { LayersPanel } from "./layers-panel";

function str(state: Record<string, unknown>, key: string) {
  return String(state[key] ?? "");
}

type TabId = "copy" | "nutrition" | "layout" | "type" | "size" | "color" | "images" | "icons" | "layers";

const STICKY_TABS: TabId[] = ["type", "size", "color", "images", "icons", "layers", "layout"];

function tabsFor(face: PreviewFace): { id: TabId; label: string }[] {
  if (face === "composite") {
    return [
      { id: "copy", label: "Copy" },
      { id: "size", label: "Size" },
      { id: "color", label: "Color" },
      { id: "images", label: "Images" },
      { id: "icons", label: "Icons" },
      { id: "layers", label: "Layers" },
    ];
  }
  if (face === "circle") {
    return [
      { id: "copy", label: "Copy" },
      { id: "type", label: "Type" },
      { id: "size", label: "Size" },
      { id: "color", label: "Color" },
      { id: "images", label: "Images" },
      { id: "icons", label: "Icons" },
      { id: "layers", label: "Layers" },
    ];
  }
  if (face === "top") {
    return [
      { id: "copy", label: "Copy" },
      { id: "type", label: "Type" },
      { id: "size", label: "Size" },
      { id: "color", label: "Color" },
      { id: "icons", label: "Icons" },
      { id: "layers", label: "Layers" },
    ];
  }
  return [
    { id: "copy", label: "Copy" },
    { id: "nutrition", label: "Nutrition" },
    { id: "layout", label: "Layout" },
    { id: "type", label: "Type" },
    { id: "size", label: "Size" },
    { id: "color", label: "Color" },
    { id: "images", label: "Images" },
    { id: "icons", label: "Icons" },
    { id: "layers", label: "Layers" },
  ];
}

function FlavorPacks() {
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

export function FaceInspector({ face }: { face: PreviewFace }) {
  const app = useDesignApp();
  const tabs = tabsFor(face);
  const [panel, setPanel] = useState<TabId>(tabs[0].id);
  const focusTab = familyFocus(app.selectedId)?.tab ?? null;

  useEffect(() => {
    const ids = tabsFor(face).map((tab) => tab.id);
    if (!ids.includes(panel)) setPanel(ids[0]);
  }, [face, panel]);

  useEffect(() => {
    if (!focusTab) return;
    setPanel((prev) => {
      if (STICKY_TABS.includes(prev)) return prev;
      return focusTab === "nutrition" ? "nutrition" : "copy";
    });
  }, [app.selectedId, focusTab]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="This face">
        {tabs.map((tab) => {
          const on = panel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setPanel(tab.id)}
              className={`rounded-[var(--bb-radius)] border px-3 py-2 text-xs tracking-wide uppercase ${
                on
                  ? "border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                  : "border-[var(--bb-line)] text-[var(--bb-text)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="bb-sheet max-h-[min(70vh,44rem)] overflow-y-auto p-4">
        {panel === "copy" ? <CopyPanel /> : null}
        {panel === "nutrition" ? <NutritionPanel /> : null}
        {panel === "layout" ? <LayoutPanel /> : null}
        {panel === "type" ? <TypePanel face={face} /> : null}
        {panel === "size" ? <SizePanel face={face} /> : null}
        {panel === "color" ? (
          <div className="grid gap-4">
            <FlavorPacks />
            <ColorFields face={face} />
          </div>
        ) : null}
        {panel === "images" ? <ImagesPanel /> : null}
        {panel === "icons" ? <IconsPanel /> : null}
        {panel === "layers" ? <LayersPanel /> : null}
      </div>
    </div>
  );
}
