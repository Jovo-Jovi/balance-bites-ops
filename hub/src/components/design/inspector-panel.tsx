"use client";

import { useState } from "react";
import type { PreviewFace } from "@/lib/design/layout";
import { familyFocus } from "@/lib/design/layout";
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

type TabId = "copy" | "nutrition" | "layout" | "type" | "size" | "color" | "layers";

const STICKY_TABS: TabId[] = ["type", "size", "color", "layers", "layout"];

function tabsFor(face: PreviewFace): { id: TabId; label: string }[] {
  if (face === "composite") {
    return [
      { id: "copy", label: "Copy" },
      { id: "size", label: "Size" },
      { id: "color", label: "Color" },
      { id: "layers", label: "Layers" },
    ];
  }
  if (face === "circle") {
    return [
      { id: "copy", label: "Copy" },
      { id: "type", label: "Type" },
      { id: "size", label: "Size" },
      { id: "color", label: "Color" },
      { id: "layers", label: "Layers" },
    ];
  }
  if (face === "top") {
    return [
      { id: "copy", label: "Copy" },
      { id: "type", label: "Type" },
      { id: "size", label: "Size" },
      { id: "color", label: "Color" },
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
    { id: "layers", label: "Layers" },
  ];
}

export function FaceInspector({ face }: { face: PreviewFace }) {
  const app = useDesignApp();
  const tabs = tabsFor(face);
  const [panel, setPanel] = useState<TabId>(tabs[0].id);
  const [prevSelected, setPrevSelected] = useState(app.selectedId);
  const focusTab = familyFocus(app.selectedId)?.tab ?? null;

  if (app.selectedId !== prevSelected) {
    setPrevSelected(app.selectedId);
    if (focusTab && !STICKY_TABS.includes(panel)) {
      const next = focusTab === "nutrition" ? "nutrition" : "copy";
      if (next !== panel) setPanel(next);
    }
  }

  const shown = tabs.some((tab) => tab.id === panel) ? panel : tabs[0].id;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="This face">
        {tabs.map((tab) => {
          const on = shown === tab.id;
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
        {shown === "copy" ? <CopyPanel /> : null}
        {shown === "nutrition" ? <NutritionPanel /> : null}
        {shown === "layout" ? <LayoutPanel /> : null}
        {shown === "type" ? <TypePanel face={face} /> : null}
        {shown === "size" ? <SizePanel face={face} /> : null}
        {shown === "color" ? (
          <div className="grid gap-4">
            <p className="text-sm text-[var(--bb-muted)]">Flavor packs are in Libraries → Brand. Selected shape / type / arc: Solid, Half, or Gradient (two colors).</p>
            <ColorFields face={face} />
          </div>
        ) : null}
        {shown === "layers" ? <LayersPanel /> : null}
      </div>
    </div>
  );
}
