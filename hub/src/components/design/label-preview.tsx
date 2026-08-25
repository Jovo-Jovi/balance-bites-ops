"use client";

import { useRef, type PointerEvent } from "react";
import { artboardCm, labelPreviewSvg } from "@/lib/design/preview";
import { canvasEditText, listCanvasItems } from "@/lib/design/layers";
import type { LabelTemplate } from "@/lib/design/types";

export function LabelPreview({
  template,
  className = "",
  showCut = false,
  interactive = false,
  selectedId = null,
  selectedIds = [],
  onSelect,
  onMove,
  onResize,
  onRotate,
  onDragEnd,
  onEdit,
}: {
  template: LabelTemplate;
  className?: string;
  showCut?: boolean;
  interactive?: boolean;
  selectedId?: string | null;
  selectedIds?: string[];
  onSelect?: (id: string | null, opts?: { shift?: boolean }) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
  onRotate?: (id: string, rot: number) => void;
  onDragEnd?: (id?: string) => void;
  onEdit?: (id: string, text: string) => void;
}) {
  const svg = labelPreviewSvg(template, template.state, { showCut });
  const { wCm, hCm } = artboardCm(template);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    mode: "move" | "resize" | "rotate";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origRot: number;
    startAngle: number;
    armed: boolean;
  } | null>(null);
  const items = interactive ? listCanvasItems(template) : [];

  function applyPointer(e: PointerEvent) {
    const d = drag.current;
    const el = boardRef.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    if (d.mode === "rotate") {
      const item = items.find((it) => it.id === d.id);
      if (!item) return;
      const cx = r.left + (item.x / 100) * r.width;
      const cy = r.top + (item.y / 100) * r.height;
      const ang = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
      onRotate?.(d.id, d.origRot + ang - d.startAngle);
      return;
    }
    const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (!d.armed) {
      if (dist < 5) return;
      d.armed = true;
    }
    const dx = ((e.clientX - d.startX) / r.width) * 100;
    const dy = ((e.clientY - d.startY) / r.height) * 100;
    if (d.mode === "resize") onResize?.(d.id, d.origW + dx, d.origH + dy);
    else onMove?.(d.id, d.origX + dx, d.origY + dy);
  }

  return (
    <div
      className={`overflow-hidden ${interactive ? "p-3" : showCut ? "p-2" : ""} rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)] ${className}`}
    >
      <div
        ref={boardRef}
        data-bb-preview={template.id}
        className="relative w-full touch-none [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
        style={{ aspectRatio: `${wCm} / ${hCm}` }}
        onPointerMove={interactive ? applyPointer : undefined}
        onPointerUp={
          interactive
            ? () => {
                const d = drag.current;
                drag.current = null;
                if (d?.armed) onDragEnd?.(d.id);
              }
            : undefined
        }
        onPointerCancel={
          interactive
            ? () => {
                drag.current = null;
              }
            : undefined
        }
        onPointerDown={
          interactive
            ? (e) => {
                if (e.target === e.currentTarget) onSelect?.(null);
              }
            : undefined
        }
      >
        {!interactive ? (
          <div className="h-full w-full" dir="ltr" style={{ direction: "ltr" }} dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0" dir="ltr" style={{ direction: "ltr" }} dangerouslySetInnerHTML={{ __html: svg }} />
            {items.map((item) => {
              const on = selectedId === item.id;
              const multi = selectedIds.includes(item.id);
              const draft = on && onEdit ? canvasEditText(template, item.id) : null;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  className={`absolute box-border touch-none ${
                    on
                      ? "border-2 border-[var(--bb-gold)]"
                      : multi
                        ? "cursor-grab border-2 border-dashed border-[var(--bb-gold)]"
                        : "cursor-grab border border-transparent hover:border-[var(--bb-line)]"
                  }`}
                  style={{
                    left: `${item.x - item.w / 2}%`,
                    top: `${item.y - item.h / 2}%`,
                    width: `${item.w}%`,
                    height: `${item.h}%`,
                    transform: item.rot ? `rotate(${item.rot}deg)` : undefined,
                    transformOrigin: "center center",
                    zIndex: (on ? 1000 : 10) + Math.round((item.z || 0) * 10),
                  }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest("[data-inline-edit]")) return;
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onSelect?.(item.id, { shift: e.shiftKey });
                    drag.current = {
                      id: item.id,
                      mode: "move",
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: item.x,
                      origY: item.y,
                      origW: item.w,
                      origH: item.h,
                      origRot: item.rot || 0,
                      startAngle: 0,
                      armed: false,
                    };
                  }}
                  onPointerMove={applyPointer}
                  onPointerUp={() => {
                    const d = drag.current;
                    drag.current = null;
                    if (d?.armed) onDragEnd?.(d.id);
                  }}
                >
                  {draft ? (
                    draft.multiline ? (
                      <textarea
                        data-inline-edit=""
                        autoFocus
                        value={draft.value}
                        onChange={(e) => onEdit?.(item.id, e.target.value)}
                        className="absolute inset-1 z-30 resize-none rounded border border-[var(--bb-gold)] bg-[var(--bb-panel)]/95 px-1 py-0.5 text-[11px] leading-tight text-[var(--bb-text)] outline-none"
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <input
                        data-inline-edit=""
                        autoFocus
                        value={draft.value}
                        onChange={(e) => onEdit?.(item.id, e.target.value)}
                        className="absolute inset-x-1 top-1/2 z-30 -translate-y-1/2 rounded border border-[var(--bb-gold)] bg-[var(--bb-panel)]/95 px-1 py-0.5 text-[11px] text-[var(--bb-text)] outline-none"
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    )
                  ) : null}
                  {on ? (
                    <>
                      <span
                        className="absolute -top-3 left-1/2 h-3.5 w-3.5 -translate-x-1/2 cursor-grab rounded-full border border-[var(--bb-gold)] bg-[var(--bb-panel)]"
                        title="Rotate"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          const board = boardRef.current?.getBoundingClientRect();
                          const cx = (board?.left || 0) + (item.x / 100) * (board?.width || 1);
                          const cy = (board?.top || 0) + (item.y / 100) * (board?.height || 1);
                          drag.current = {
                            id: item.id,
                            mode: "rotate",
                            startX: e.clientX,
                            startY: e.clientY,
                            origX: item.x,
                            origY: item.y,
                            origW: item.w,
                            origH: item.h,
                            origRot: item.rot || 0,
                            startAngle: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
                            armed: true,
                          };
                        }}
                      />
                      <span
                        className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border border-[var(--bb-gold)] bg-[var(--bb-panel)]"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          drag.current = {
                            id: item.id,
                            mode: "resize",
                            startX: e.clientX,
                            startY: e.clientY,
                            origX: item.x,
                            origY: item.y,
                            origW: item.w,
                            origH: item.h,
                            origRot: item.rot || 0,
                            startAngle: 0,
                            armed: false,
                          };
                        }}
                      />
                    </>
                  ) : null}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
