"use client";

import { memo, useEffect, useRef, useState } from "react";
import { artboardOf } from "@/lib/design/layout";
import { isRasterImageSrc, resolveLibraryThumbSrc } from "@/lib/design/library-thumb";
import type { LabelTemplate } from "@/lib/design/types";

export const LibraryThumb = memo(function LibraryThumb({
  template,
  compact = false,
}: {
  template: LabelTemplate;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [src, setSrc] = useState("");
  const board = artboardOf(template, template.state);
  const wCm = Math.max(0.8, board.wCm || 6);
  const hCm = Math.max(0.8, board.hCm || 6);
  const wide = wCm / hCm > 2;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "80px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!on) return;
    let live = true;
    void resolveLibraryThumbSrc(template).then((url) => {
      if (live && isRasterImageSrc(url)) setSrc(url);
    });
    return () => {
      live = false;
    };
  }, [on, template.id, template.updatedAt, template.libraryThumb]);
  const maxH = compact ? (wide ? 72 : 104) : wide ? 96 : 140;
  return (
    <div
      ref={ref}
      className="mx-auto overflow-hidden rounded-[var(--bb-radius)] bg-[var(--bb-panel)]"
      style={{
        aspectRatio: `${wCm} / ${hCm}`,
        width: "100%",
        height: "auto",
        maxHeight: maxH,
        maxWidth: `min(100%, calc(${maxH}px * ${wCm} / ${hCm}))`,
      }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-contain p-1" decoding="async" draggable={false} />
      ) : (
        <span className="block h-full w-full bg-[var(--bb-panel)]" />
      )}
    </div>
  );
});
