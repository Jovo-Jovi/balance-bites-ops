"use client";

import { useRef, type PointerEvent } from "react";
import { artboardCm, labelPreviewSvg } from "@/lib/design/preview";
import { listCanvasItems } from "@/lib/design/layers";
import type { LabelTemplate } from "@/lib/design/types";

export function LabelPreview({
  template,
  className = "",
  showCut = false,
  interactive = false,
  selectedId = null,
  onSelect,
  onMove,
  onResize,
}: {
  template: LabelTemplate;
  className?: string;
  showCut?: boolean;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
}) {
  const svg = labelPreviewSvg(template, template.state, { showCut });
  const { wCm, hCm } = artboardCm(template.state, template.designType);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const items = interactive ? listCanvasItems(template.state, template.designType) : [];

  function applyPointer(e: PointerEvent) {
    const d = drag.current;
    const el = boardRef.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const dx = ((e.clientX - d.startX) / r.width) * 100;
    const dy = ((e.clientY - d.startY) / r.height) * 100;
    if (d.mode === "resize") onResize?.(d.id, d.origW + dx, d.origH + dy);
    else onMove?.(d.id, d.origX + dx, d.origY + dy);
  }

  return (
    <div
      className={`${showCut || interactive ? "overflow-visible" : "overflow-hidden"} ${interactive ? "p-3" : showCut ? "p-2" : ""} rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)] ${className}`}
    >
      <div
        ref={boardRef}
        className="relative w-full touch-none [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
        style={{ aspectRatio: `${wCm} / ${hCm}` }}
        onPointerMove={interactive ? applyPointer : undefined}
        onPointerUp={interactive ? () => { drag.current = null; } : undefined}
        onPointerCancel={interactive ? () => { drag.current = null; } : undefined}
        onPointerDown={
          interactive
            ? (e) => {
                if (e.target === e.currentTarget) onSelect?.(null);
              }
            : undefined
        }
      >
        {!interactive ? (
          <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0" dangerouslySetInnerHTML={{ __html: svg }} />
            {items.map((item) => {
              const on = selectedId === item.id;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  className={`absolute box-border cursor-grab touch-none ${
                    on
                      ? "z-20 border-2 border-[var(--bb-gold)]"
                      : "z-10 border border-transparent hover:border-[var(--bb-line)]"
                  }`}
                  style={{
                    left: `${item.x - item.w / 2}%`,
                    top: `${item.y - item.h / 2}%`,
                    width: `${item.w}%`,
                    height: `${item.h}%`,
                    transform: item.rot ? `rotate(${item.rot}deg)` : undefined,
                    transformOrigin: "center center",
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onSelect?.(item.id);
                    drag.current = {
                      id: item.id,
                      mode: "move",
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: item.x,
                      origY: item.y,
                      origW: item.w,
                      origH: item.h,
                    };
                  }}
                  onPointerMove={applyPointer}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                >
                  {on ? (
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
                        };
                      }}
                    />
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
