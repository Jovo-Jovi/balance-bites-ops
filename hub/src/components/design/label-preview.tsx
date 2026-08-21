"use client";

import { artboardCm, labelPreviewSvg } from "@/lib/design/preview";
import type { LabelTemplate } from "@/lib/design/types";

export function LabelPreview({
  template,
  className = "",
  showCut = false,
}: {
  template: LabelTemplate;
  className?: string;
  showCut?: boolean;
}) {
  const svg = labelPreviewSvg(template, template.state, { showCut });
  const { wCm, hCm } = artboardCm(template.state, template.designType);
  return (
    <div
      className={`${showCut ? "overflow-visible p-2" : "overflow-hidden"} rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)] ${className}`}
    >
      <div
        className="w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
        style={{ aspectRatio: `${wCm} / ${hCm}` }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
