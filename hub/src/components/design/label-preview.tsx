"use client";

import { artboardCm, labelPreviewSvg } from "@/lib/design/preview";
import type { LabelTemplate } from "@/lib/design/types";

export function LabelPreview({
  template,
  className = "",
}: {
  template: LabelTemplate;
  className?: string;
}) {
  const svg = labelPreviewSvg(template, template.state);
  const { wCm, hCm } = artboardCm(template.state);
  return (
    <div
      className={`overflow-hidden rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)] ${className}`}
    >
      <div
        className="w-full"
        style={{ aspectRatio: `${wCm} / ${hCm}` }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
