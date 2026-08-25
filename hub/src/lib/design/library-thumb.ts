import { isStorageEnabled } from "@/lib/firebase-config";
import { uploadLabelAsset } from "@/lib/storage";
import { hydrateAssetValue } from "./assets";
import { familyDieView } from "./family-preview";
import { rasterizeLabelCanvas } from "./png-pack";
import { artboardCm } from "./preview";
import { presetThumbFill } from "./art-presets";
import { getDesignSpec } from "./specs";
import { asLibraryThumb, isAssetRef, toR2Ref } from "./templates";
import type { LabelTemplate } from "./types";

export const LIBRARY_THUMB_WEBP = "library_thumb.webp";
export const LIBRARY_THUMB_PNG = "library_thumb.png";
export const LIBRARY_THUMB_MAX_PX = 256;
const LIBRARY_WORK_MAX_PX = 720;

const viewCache = new Map<string, string>();
const viewPending = new Map<string, Promise<string>>();

export function isRasterImageSrc(src: string) {
  if (!src || /^data:image\/svg/i.test(src)) return false;
  return /^(data:image\/(png|jpe?g|webp|gif|avif)|https?:|blob:)/i.test(src);
}

function thumbKind(template: LabelTemplate): "cut" | "exact" {
  const spec = getDesignSpec(template.designType);
  if (spec.composite || spec.outline || template.designType === "circular") return "cut";
  return "exact";
}

function scaledBoard(template: LabelTemplate, maxPx: number, minPx: number) {
  const { wCm, hCm } = artboardCm(template);
  const w = Math.max(0.8, wCm);
  const h = Math.max(0.8, hCm);
  const scale = maxPx / Math.max(w, h);
  return {
    wPx: Math.max(minPx, Math.round(w * scale)),
    hPx: Math.max(minPx, Math.round(h * scale)),
  };
}

export function libraryThumbSize(template: LabelTemplate) {
  return scaledBoard(template, LIBRARY_THUMB_MAX_PX, 32);
}

function libraryWorkSize(template: LabelTemplate) {
  return scaledBoard(template, LIBRARY_WORK_MAX_PX, 64);
}

function scaleCanvas(src: HTMLCanvasElement, wPx: number, hPx: number) {
  if (src.width === wPx && src.height === hPx) return src;
  const out = document.createElement("canvas");
  out.width = wPx;
  out.height = hPx;
  const ctx = out.getContext("2d", { alpha: true });
  if (!ctx) return src;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, wPx, hPx);
  return out;
}

function canvasToThumbBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((webp) => {
      if (webp && webp.size > 0) {
        resolve(webp);
        return;
      }
      canvas.toBlob((png) => {
        if (png && png.size > 0) resolve(png);
        else reject(new Error("Could not snapshot the label."));
      }, "image/png");
    }, "image/webp", 0.84);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error || new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

function fillForDie(template: LabelTemplate) {
  const artKey = (template.state._composite?.parts || []).find((p) => p.artKey)?.artKey;
  const preset = presetThumbFill(artKey);
  if (preset) return preset;
  const raw = String(template.state.cLabel || template.state._composite?.bg || "#2e7d32");
  return /^#fff(fff)?$/i.test(raw.trim()) || raw.trim().toLowerCase() === "white" ? "#FECE00" : raw;
}

function fallbackDieCanvas(template: LabelTemplate, wPx: number, hPx: number) {
  const canvas = document.createElement("canvas");
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.clearRect(0, 0, wPx, hPx);
  ctx.fillStyle = fillForDie(template);
  const spec = getDesignSpec(template.designType);
  try {
    if (spec.composite && template.state._composite) {
      ctx.save();
      ctx.scale(wPx / 100, hPx / 100);
      const parts = template.state._composite.parts || [];
      const part = parts[0];
      const union = String(template.state._composite.unionPath || "").trim();
      if (parts.length === 1 && part?.pathLocal) {
        ctx.translate(part.x - part.w / 2, part.y - part.h / 2);
        ctx.scale(part.w / 100, part.h / 100);
        ctx.fill(new Path2D(part.pathLocal));
      } else if (union) {
        ctx.fill(new Path2D(union));
      } else if (part?.pathLocal) {
        ctx.translate(part.x - part.w / 2, part.y - part.h / 2);
        ctx.scale(part.w / 100, part.h / 100);
        ctx.fill(new Path2D(part.pathLocal));
      } else {
        ctx.fillRect(0, 0, 100, 100);
      }
      ctx.restore();
      return canvas;
    }
    const die = familyDieView(template, template.state);
    if (die.d && die.vbW > 0 && die.vbH > 0) {
      const sx = wPx / die.vbW;
      const sy = hPx / die.vbH;
      ctx.save();
      ctx.translate(-die.minX * sx, -die.minY * sy);
      ctx.scale(sx, sy);
      ctx.fill(new Path2D(die.d));
      ctx.restore();
    } else {
      ctx.fillRect(0, 0, wPx, hPx);
    }
  } catch {
    ctx.fillRect(2, 2, wPx - 4, hPx - 4);
  }
  return canvas;
}

export async function renderLibraryThumbBlob(template: LabelTemplate): Promise<Blob> {
  const { wPx, hPx } = libraryThumbSize(template);
  try {
    const work = libraryWorkSize(template);
    const canvas = await rasterizeLabelCanvas(template, template.state, work.wPx, work.hPx, thumbKind(template));
    return await canvasToThumbBlob(scaleCanvas(canvas, wPx, hPx));
  } catch {
    return await canvasToThumbBlob(fallbackDieCanvas(template, wPx, hPx));
  }
}

function forgetTemplateThumbs(id: string) {
  for (const k of [...viewCache.keys()]) {
    if (!k.includes(id)) continue;
    const prev = viewCache.get(k);
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    viewCache.delete(k);
  }
  for (const k of [...viewPending.keys()]) {
    if (k.includes(id)) viewPending.delete(k);
  }
}

function thumbFileName(blob: Blob, stamp = "") {
  const ext = blob.type.includes("png") ? "png" : "webp";
  return stamp ? `library_thumb_${stamp}.${ext}` : ext === "png" ? LIBRARY_THUMB_PNG : LIBRARY_THUMB_WEBP;
}

export async function attachLibraryThumb(template: LabelTemplate): Promise<LabelTemplate> {
  if (typeof document === "undefined") return template;
  forgetTemplateThumbs(template.id);
  const blob = await renderLibraryThumbBlob(template);
  const stamp = String(Date.now());
  if (isStorageEnabled()) {
    const key = await uploadLabelAsset(template.id, thumbFileName(blob, stamp), blob);
    return { ...template, libraryThumb: toR2Ref(key) };
  }
  return { ...template, libraryThumb: await blobToDataUrl(blob) };
}

export async function stripLibraryThumb(templateId: string, value: string | undefined): Promise<string | undefined> {
  const thumb = asLibraryThumb(value);
  if (!thumb) return undefined;
  if (isAssetRef(thumb)) return thumb;
  if (thumb.startsWith("data:image/") && isStorageEnabled() && thumb.length > 400) {
    try {
      const res = await fetch(thumb);
      const blob = await res.blob();
      const key = await uploadLabelAsset(templateId, thumbFileName(blob, String(Date.now())), blob);
      return toR2Ref(key);
    } catch {
      return undefined;
    }
  }
  if (thumb.startsWith("data:image/") && thumb.length <= 120_000) return thumb;
  return undefined;
}

function remember(key: string, url: string) {
  if (viewCache.size >= 48) {
    const oldest = viewCache.keys().next().value;
    if (oldest) {
      const prev = viewCache.get(oldest);
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      viewCache.delete(oldest);
    }
  }
  viewCache.set(key, url);
}

async function snapThumbSrc(template: LabelTemplate) {
  const cacheKey = `die:${template.id}:${template.updatedAt}`;
  const hit = viewCache.get(cacheKey);
  if (hit) return hit;
  const pending = viewPending.get(cacheKey);
  if (pending) return pending;
  const job = (async () => {
    const { wPx, hPx } = libraryThumbSize(template);
    const blob = await canvasToThumbBlob(fallbackDieCanvas(template, wPx, hPx));
    const url = URL.createObjectURL(blob);
    remember(cacheKey, url);
    viewPending.delete(cacheKey);
    return url;
  })().catch(() => {
    viewPending.delete(cacheKey);
    return "";
  });
  viewPending.set(cacheKey, job);
  return job;
}

/** Signed HTTPS / data / blob URL for a Library <img>. Never SVG. */
export async function resolveLibraryThumbSrc(template: LabelTemplate): Promise<string> {
  const stored = asLibraryThumb(template.libraryThumb);
  if (stored && isRasterImageSrc(stored)) return stored;
  if (stored && isAssetRef(stored)) {
    const cacheKey = `ref:${template.id}:${stored}`;
    const hit = viewCache.get(cacheKey);
    if (hit) return hit;
    const pending = viewPending.get(cacheKey);
    if (pending) return pending;
    const job = hydrateAssetValue(template.id, stored)
      .then((url) => {
        viewPending.delete(cacheKey);
        if (url && isRasterImageSrc(url)) {
          remember(cacheKey, url);
          return url;
        }
        return snapThumbSrc(template);
      })
      .catch(() => {
        viewPending.delete(cacheKey);
        return snapThumbSrc(template);
      });
    viewPending.set(cacheKey, job);
    return job;
  }
  return snapThumbSrc(template);
}
