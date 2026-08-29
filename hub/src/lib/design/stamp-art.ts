import { usableImage } from "./art";
import { arcLineMarkup, curvedTextMarkup, hasArabic } from "./deco";
import { getIcon, iconPainted } from "./icons";
import { letterWordMarkup } from "./letter-word";
import type { LabelStamp } from "./types";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Icon / curved text / arc stamp in the given box (same units as x,y,w,h). */
export function stampArtMarkup(
  st: LabelStamp,
  fallback: string,
  box: { x: number; y: number; w: number; h: number },
  family: string,
): string {
  const href = usableImage(st.src);
  const side = Math.max(2, Math.min(box.w, box.h));
  const rot = st.rot ? ` transform="rotate(${st.rot} ${box.x} ${box.y})"` : "";
  if (href) {
    const left = box.x - side / 2;
    const top = box.y - side / 2;
    const bw = Number(st.strokeWidth);
    const ring =
      Number.isFinite(bw) && bw > 0
        ? `<circle cx="${box.x}" cy="${box.y}" r="${side / 2}" fill="none" stroke="${esc(st.borderColor || st.color || "#ffffff")}" stroke-width="${bw}" />`
        : "";
    const h = esc(href);
    const img = `<image href="${h}" xlink:href="${h}" x="${left}" y="${top}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet" />${ring}`;
    return rot ? `<g${rot}>${img}</g>` : img;
  }
  if (st.kind === "arc") {
    const mark = arcLineMarkup({
      id: st.id,
      cx: box.x,
      cy: box.y,
      w: box.w,
      h: box.h,
      sweep: st.sweep ?? 180,
      strokeWidth: st.strokeWidth,
      color: st.color,
      color2: st.color2,
      fillMode: st.fillMode || "gradient",
    });
    const body = `<g>${mark.defs}${mark.body}</g>`;
    return rot ? `<g${rot}>${body}</g>` : body;
  }
  if (st.kind === "letters") {
    const body = letterWordMarkup({
      id: st.id,
      cx: box.x,
      cy: box.y,
      w: box.w,
      h: box.h,
      text: st.text || "",
      curve: st.curve,
      color: st.color || fallback,
      color2: st.color2,
      fillMode: st.fillMode,
      letterStyle: st.letterStyle,
      letterPack: st.letterPack,
      strokeWidth: st.strokeWidth,
    });
    return rot ? `<g${rot}>${body}</g>` : body;
  }
  if (st.kind === "text" || (st.text && !st.iconId)) {
    const face = hasArabic(st.text || "") ? "Tajawal, Cairo, sans-serif" : family;
    const mark = curvedTextMarkup({
      id: st.id,
      cx: box.x,
      cy: box.y,
      w: box.w,
      h: box.h,
      text: st.text || "TEXT",
      curve: st.curve ?? 0,
      color: st.color || fallback,
      color2: st.color2,
      fillMode: st.fillMode,
      family: face,
      weight: "800",
    });
    const body = `<g>${mark.defs}${mark.body}</g>`;
    return rot ? `<g${rot}>${body}</g>` : body;
  }
  const painted = iconPainted(st.iconId, st.color || fallback, st.strokeWidth ?? 2, st.letterStyle, {
    color2: st.color2,
    fillMode: st.fillMode,
    paintId: st.id,
  });
  if (!painted.inner) return "";
  const vb = getIcon(st.iconId)?.viewBox || "0 0 24 24";
  const defs = painted.defs ? `<defs>${painted.defs}</defs>` : "";
  const body = `<svg x="${box.x - side / 2}" y="${box.y - side / 2}" width="${side}" height="${side}" viewBox="${esc(vb)}" preserveAspectRatio="xMidYMid meet" overflow="visible">${defs}${painted.inner}</svg>`;
  return rot ? `<g${rot}>${body}</g>` : body;
}
