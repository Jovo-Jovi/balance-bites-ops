"use client";

import { ActionBtn } from "@/components/invoices/ui";
import { PART_TYPES } from "@/lib/design/part-types";
import { previewFace } from "@/lib/design/layout";
import { useDesignApp } from "./design-context";

export function StudioCutBar() {
  const app = useDesignApp();
  const t = app.current;
  if (!t) return null;
  const composite = previewFace(t) === "composite";

  if (!composite) {
    return (
      <p className="text-xs text-[var(--bb-muted)]">
        Die-cut tools (add shape, merge, trim, cut) are on the Composite family. Wrap and taper stay starters — switch
        Family to Composite to draw a freeform cut.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-3">
      <p className="text-xs text-[var(--bb-muted)]">
        Shift-click two or more shapes. Merge joins them into one silhouette. Group moves them together. Trim clips an
        inner shape to the main. Preview cut, then Approve.
      </p>
      {app.clipPick ? (
        <p className="text-xs text-[var(--bb-gold)]">
          {app.clipPick.step === "main"
            ? "Trim: tap the MAIN shape (border)."
            : "Trim: tap the OTHER shape (cut to inside the main)."}
        </p>
      ) : null}
      {app.cutPreview ? (
        <p className="text-xs text-[var(--bb-gold)]">Previewing cut — Approve to keep it, or Cancel.</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {PART_TYPES.map((shape) => (
          <button
            key={shape.id}
            type="button"
            className="rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-2 py-1 text-[11px] text-[var(--bb-text)] hover:border-[var(--bb-gold)]"
            onClick={() => app.addStudioShape(shape.id)}
          >
            {shape.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionBtn tone="ghost" onClick={app.mergeStudioParts}>
          Merge
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={app.groupStudioLayers}>
          Group
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={app.ungroupStudioLayers}>
          Ungroup
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={app.startStudioTrim}>
          Trim
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={app.cutStudioSelection}>
          Cut = selected
        </ActionBtn>
        <ActionBtn tone="ghost" onClick={app.previewStudioCut}>
          Preview cut
        </ActionBtn>
        <ActionBtn disabled={!app.cutPreview} onClick={app.approveStudioCut}>
          Approve cut
        </ActionBtn>
        <ActionBtn tone="ghost" disabled={!app.cutPreview} onClick={app.cancelStudioCut}>
          Cancel
        </ActionBtn>
        <ActionBtn tone="ghost" disabled={!app.canUndo} onClick={app.undoStudio}>
          Undo
        </ActionBtn>
      </div>
    </div>
  );
}
