import { familyDieView } from "./family-preview";
import { previewFace } from "./layout";
import {
  BLEED_MM,
  BLEED_SAMPLE_INSET_MM,
  DPI,
  PRINT_FONTS,
  exportFileBase,
  pxFromMm,
} from "./prepress";
import { artboardCm, compositeDiePath, labelPreviewSvg } from "./preview";
import type { CompositeBlob, LabelState, LabelTemplate } from "./types";

export type PngKind = "cut" | "exact" | "bleed";

export type PngExportInfo = {
  kind: PngKind;
  filename: string;
  wCm: number;
  hCm: number;
  wPx: number;
  hPx: number;
  dpi: number;
};

const resourceCache = new Map<string, string>();
let fontCssCache: string | null = null;

export function printPx(wCm: number, hCm: number) {
  return {
    wPx: Math.max(1, Math.round((wCm / 2.54) * DPI)),
    hPx: Math.max(1, Math.round((hCm / 2.54) * DPI)),
  };
}

const PNG_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function pngCrc32(buf: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = PNG_CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function b64ToUint8(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function uint8ToB64(u8: Uint8Array) {
  const chunk = 0x8000;
  let s = "";
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode(...u8.subarray(i, Math.min(i + chunk, u8.length)));
  }
  return btoa(s);
}

/** Embed PNG pHYs so Width×Height cm print at exact physical size. Live `pngSetPhysSize`. */
export function pngSetPhysSize(dataUrl: string, wCm: number, hCm: number, pxW: number, pxH: number) {
  try {
    if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) return dataUrl;
    if (!(wCm > 0 && hCm > 0 && pxW > 0 && pxH > 0)) return dataUrl;
    const bytes = b64ToUint8(dataUrl.slice("data:image/png;base64,".length));
    if (bytes.length < 33 || bytes[0] !== 0x89) return dataUrl;
    const ppmX = Math.max(1, Math.round((pxW * 100) / wCm));
    const ppmY = Math.max(1, Math.round((pxH * 100) / hCm));
    const phys = new Uint8Array(9);
    phys[0] = (ppmX >>> 24) & 255;
    phys[1] = (ppmX >>> 16) & 255;
    phys[2] = (ppmX >>> 8) & 255;
    phys[3] = ppmX & 255;
    phys[4] = (ppmY >>> 24) & 255;
    phys[5] = (ppmY >>> 16) & 255;
    phys[6] = (ppmY >>> 8) & 255;
    phys[7] = ppmY & 255;
    phys[8] = 1;
    const type = new Uint8Array([112, 72, 89, 115]);
    const len = new Uint8Array([0, 0, 0, 9]);
    const crcBuf = new Uint8Array(13);
    crcBuf.set(type, 0);
    crcBuf.set(phys, 4);
    const crc = pngCrc32(crcBuf);
    const crcBytes = new Uint8Array([(crc >>> 24) & 255, (crc >>> 16) & 255, (crc >>> 8) & 255, crc & 255]);
    const chunk = new Uint8Array(21);
    chunk.set(len, 0);
    chunk.set(type, 4);
    chunk.set(phys, 8);
    chunk.set(crcBytes, 17);

    const parts: Uint8Array[] = [];
    let pos = 8;
    while (pos + 8 <= bytes.length) {
      const clen = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
      const ctype = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
      const next = pos + 12 + clen;
      if (next > bytes.length) break;
      if (ctype !== "pHYs") parts.push(bytes.subarray(pos, next));
      pos = next;
      if (ctype === "IEND") break;
    }
    let outLen = 8 + chunk.length;
    for (const p of parts) outLen += p.length;
    const out = new Uint8Array(outLen);
    out.set(bytes.subarray(0, 8), 0);
    let o = 8;
    if (!parts.length) return dataUrl;
    out.set(parts[0], o);
    o += parts[0].length;
    out.set(chunk, o);
    o += chunk.length;
    for (let pj = 1; pj < parts.length; pj++) {
      out.set(parts[pj], o);
      o += parts[pj].length;
    }
    return `data:image/png;base64,${uint8ToB64(out)}`;
  } catch {
    return dataUrl;
  }
}

/** Nearest-neighbour bleed from live `BBPrepress.extendBleedNN`. */
export function extendBleedNN(
  imageData: ImageData,
  width: number,
  height: number,
  bleedPx: number,
  sampleInsetPx: number,
) {
  const data = imageData.data;
  function copyPix(tx: number, ty: number, sx: number, sy: number) {
    const ti = (ty * width + tx) * 4;
    const si = (sy * width + sx) * 4;
    data[ti] = data[si];
    data[ti + 1] = data[si + 1];
    data[ti + 2] = data[si + 2];
    data[ti + 3] = 255;
  }
  const art = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) art[i] = data[i * 4 + 3] > 8 ? 1 : 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (art[y * width + x]) continue;
      let bestD = bleedPx + 1;
      let bx = -1;
      let by = -1;
      for (let r = 1; r <= bleedPx; r++) {
        let found = false;
        for (let dy = -r; dy <= r; dy++) {
          const dxs = [-r, r];
          for (const dx of dxs) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
            if (!art[yy * width + xx]) continue;
            const dd = Math.sqrt((xx - x) * (xx - x) + (yy - y) * (yy - y));
            if (dd < bestD) {
              bestD = dd;
              bx = xx;
              by = yy;
              found = true;
            }
          }
        }
        for (let dx = -r + 1; dx <= r - 1; dx++) {
          const dys = [-r, r];
          for (const dy of dys) {
            const xx2 = x + dx;
            const yy2 = y + dy;
            if (xx2 < 0 || yy2 < 0 || xx2 >= width || yy2 >= height) continue;
            if (!art[yy2 * width + xx2]) continue;
            const dd2 = Math.sqrt((xx2 - x) * (xx2 - x) + (yy2 - y) * (yy2 - y));
            if (dd2 < bestD) {
              bestD = dd2;
              bx = xx2;
              by = yy2;
              found = true;
            }
          }
        }
        if (found && bestD <= bleedPx) break;
      }
      if (bx < 0) continue;
      const vx = bx - x;
      const vy = by - y;
      const vl = Math.sqrt(vx * vx + vy * vy) || 1;
      let sx = Math.round(bx + (vx / vl) * sampleInsetPx);
      let sy = Math.round(by + (vy / vl) * sampleInsetPx);
      sx = Math.max(0, Math.min(width - 1, sx));
      sy = Math.max(0, Math.min(height - 1, sy));
      if (!art[sy * width + sx]) {
        sx = bx;
        sy = by;
      }
      copyPix(x, y, sx, sy);
    }
  }
  return imageData;
}

function absUrl(url: string) {
  const u = url.trim();
  if (!u || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("#")) return u;
  try {
    return new URL(u, window.location.href).href;
  } catch {
    return u;
  }
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error || new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

async function urlToDataUrl(url: string) {
  const abs = absUrl(url);
  if (!abs || abs.startsWith("#")) return url;
  if (abs.startsWith("data:")) return abs;
  const hit = resourceCache.get(abs);
  if (hit) return hit;
  const res = await fetch(abs, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`Could not load image (${res.status})`);
  const data = await blobToDataUrl(await res.blob());
  resourceCache.set(abs, data);
  return data;
}

async function inlineCssUrls(css: string) {
  const re = /url\((['"]?)([^'")]+)\1\)/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const u = m[2].trim();
    if (u.startsWith("data:")) continue;
    found.add(u);
  }
  let out = css;
  for (const u of found) {
    try {
      const data = await urlToDataUrl(u);
      out = out.split(u).join(data);
    } catch {
      /* keep remote url */
    }
  }
  return out;
}

async function printFontCss() {
  if (fontCssCache) return fontCssCache;
  try {
    const res = await fetch(PRINT_FONTS, { mode: "cors", credentials: "omit" });
    if (!res.ok) return "";
    fontCssCache = await inlineCssUrls(await res.text());
    return fontCssCache;
  } catch {
    return "";
  }
}

function stripRemoteRefs(svg: string) {
  return svg
    .replace(/\s(?:href|xlink:href|src)=["']https?:[^"']+["']/gi, "")
    .replace(/url\(["']?https?:[^"')]+["']?\)/gi, "none")
    .replace(/@import\s+url\([^)]+\);?/g, "");
}

function canvasIsClean(ctx: CanvasRenderingContext2D) {
  try {
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

async function inlineSvgAssets(svg: string) {
  const fonts = await printFontCss();
  let out = svg;
  if (fonts) {
    out = out.replace(/@import\s+url\(["'][^"']+["']\);?/g, () => fonts);
  }
  const re = /(?:href|xlink:href|src)=["']([^"']+)["']/gi;
  const urls = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(out))) {
    const u = m[1].trim();
    if (!u || u.startsWith("data:") || u.startsWith("#") || u.startsWith("blob:")) continue;
    urls.add(u);
  }
  for (const u of urls) {
    try {
      const data = await urlToDataUrl(u);
      out = out.split(u).join(data);
    } catch {
      out = out.split(u).join("");
    }
  }
  return stripRemoteRefs(out);
}

function setSvgPixelSize(svg: string, wPx: number, hPx: number) {
  let out = svg.trim();
  if (!out.startsWith("<?xml")) out = `<?xml version="1.0" encoding="UTF-8"?>${out}`;
  out = out.replace(/\swidth="[\d.]+cm"/, ` width="${wPx}"`);
  out = out.replace(/\sheight="[\d.]+cm"/, ` height="${hPx}"`);
  return out;
}

async function loadSvgImage(svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "sync";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function rasterizeSvg(svg: string, wPx: number, hPx: number) {
  const img = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.clearRect(0, 0, wPx, hPx);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, wPx, hPx);
  return canvas;
}

function hasForeignObject(svg: string) {
  return /<foreignObject[\s>]/i.test(svg);
}

function emptyCanvas(wPx: number, hPx: number) {
  const canvas = document.createElement("canvas");
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (ctx) ctx.clearRect(0, 0, wPx, hPx);
  return canvas;
}

/** html-to-image sees 0×0 inside SVG FO; clone the XHTML into a real HTML box first. */
async function snapshotFoHtml(
  node: HTMLElement,
  fw: number,
  fh: number,
  pixelRatio: number,
  fonts: string,
  toCanvas: (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>,
) {
  const host = document.createElement("div");
  host.setAttribute("dir", "ltr");
  host.style.cssText = `position:fixed;left:-12000px;top:0;width:${fw}px;height:${fh}px;overflow:hidden;background:transparent;pointer-events:none;z-index:-1;`;
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = `${fw}px`;
  clone.style.height = `${fh}px`;
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    return await toCanvas(host, {
      width: fw,
      height: fh,
      pixelRatio,
      cacheBust: false,
      skipFonts: true,
      fontEmbedCSS: fonts || " ",
    });
  } finally {
    host.remove();
  }
}

async function paintForeignObjects(canvas: HTMLCanvasElement, svgMarkup: string, wPx: number, hPx: number) {
  if (!hasForeignObject(svgMarkup)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvasIsClean(ctx)) return;
  const { toCanvas } = await import("html-to-image");
  const fonts = await printFontCss();
  const markup = svgMarkup.replace(/^<\?xml[^>]*>/, "").replace(/@import\s+url\([^)]+\);?/g, "");
  const html = `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="utf-8"/>
<style>${fonts}
html,body{margin:0;padding:0;width:${wPx}px;height:${hPx}px;overflow:hidden;background:transparent;direction:ltr}
svg{display:block;width:${wPx}px;height:${hPx}px}
</style>
</head><body>${markup}</body></html>`;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("dir", "ltr");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${wPx}px;height:${hPx}px;border:0;opacity:1;pointer-events:none;`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("PNG preview frame failed"));
      iframe.src = url;
      document.body.appendChild(iframe);
    });
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return;
    try {
      await doc.fonts.ready;
    } catch {
      /* ignore */
    }
    await Promise.all(
      [...doc.images].map((im) => {
        if (/^https?:/i.test(im.getAttribute("src") || "")) im.removeAttribute("src");
        return im.decode().catch(() => {
          /* ignore */
        });
      }),
    );
    const svg = doc.querySelector("svg");
    if (!svg) return;
    const iframeRect = iframe.getBoundingClientRect();
    const fos = [...svg.querySelectorAll("foreignObject")];
    for (const fo of fos) {
      if (!canvasIsClean(ctx)) return;
      const node = fo.firstElementChild as HTMLElement | null;
      if (!node) continue;
      const fw = Math.max(1, fo.width.baseVal.value);
      const fh = Math.max(1, fo.height.baseVal.value);
      const ctm = fo.getScreenCTM();
      if (!ctm) continue;
      let overlay: HTMLCanvasElement;
      try {
        overlay = await snapshotFoHtml(
          node,
          fw,
          fh,
          Math.max(1, Math.min(3, canvas.width / Math.max(fw, 1))),
          fonts,
          toCanvas as (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>,
        );
      } catch {
        continue;
      }
      const overlayCtx = overlay.getContext("2d");
      if (!overlayCtx || !canvasIsClean(overlayCtx)) continue;
      ctx.save();
      ctx.setTransform(ctm.a, ctm.b, ctm.c, ctm.d, ctm.e - iframeRect.left, ctm.f - iframeRect.top);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(overlay, 0, 0, fw, fh);
      ctx.restore();
    }
  } finally {
    iframe.remove();
    URL.revokeObjectURL(url);
  }
}

function fillPath(ctx: CanvasRenderingContext2D, d: string) {
  ctx.fillStyle = "#ffffff";
  ctx.fill(new Path2D(d));
}

function applyFamilyCut(ctx: CanvasRenderingContext2D, template: LabelTemplate, state: LabelState, wPx: number, hPx: number) {
  const die = familyDieView(template, state);
  if (!die.d || !(die.vbW > 0) || !(die.vbH > 0)) return;
  const sx = wPx / die.vbW;
  const sy = hPx / die.vbH;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.translate(-die.minX * sx, -die.minY * sy);
  ctx.scale(sx, sy);
  fillPath(ctx, die.d);
  ctx.restore();
}

function applyCompositeCut(ctx: CanvasRenderingContext2D, comp: CompositeBlob, wPx: number, hPx: number) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.scale(wPx / 100, hPx / 100);
  const d = compositeDiePath(comp);
  if (d) {
    fillPath(ctx, d);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 100, 100);
  }
  ctx.restore();
}

function applyCutMask(canvas: HTMLCanvasElement, template: LabelTemplate, state: LabelState) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const face = previewFace(template);
  if (face === "composite" && state._composite) {
    applyCompositeCut(ctx, state._composite, canvas.width, canvas.height);
    return;
  }
  applyFamilyCut(ctx, template, state, canvas.width, canvas.height);
}

function applyBleed(src: HTMLCanvasElement) {
  const bleedPx = pxFromMm(BLEED_MM);
  const insetPx = pxFromMm(BLEED_SAMPLE_INSET_MM);
  const out = document.createElement("canvas");
  out.width = src.width + bleedPx * 2;
  out.height = src.height + bleedPx * 2;
  const ctx = out.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.clearRect(0, 0, out.width, out.height);
  ctx.drawImage(src, bleedPx, bleedPx);
  try {
    const imageData = ctx.getImageData(0, 0, out.width, out.height);
    extendBleedNN(imageData, out.width, out.height, bleedPx, insetPx);
    ctx.putImageData(imageData, 0, 0);
  } catch {
    return src;
  }
  return out;
}

function canvasToPngDataUrl(canvas: HTMLCanvasElement) {
  try {
    return canvas.toDataURL("image/png");
  } catch {
    throw new Error("PNG export was blocked (tainted canvas). Save, then export again.");
  }
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function rasterizeLabelCanvas(
  template: LabelTemplate,
  state: LabelState,
  wPx: number,
  hPx: number,
  kind: "exact" | "cut" = "exact",
): Promise<HTMLCanvasElement> {
  if (typeof document === "undefined") throw new Error("PNG export runs in the browser.");
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
  const raw = labelPreviewSvg(template, state, { showCut: false, physical: true });
  const sized = setSvgPixelSize(raw, wPx, hPx);
  const svg = await inlineSvgAssets(sized);
  let canvas: HTMLCanvasElement;
  try {
    canvas = await rasterizeSvg(svg, wPx, hPx);
  } catch {
    if (!hasForeignObject(svg)) throw new Error("Could not snapshot the label.");
    canvas = emptyCanvas(wPx, hPx);
  }
  try {
    await paintForeignObjects(canvas, svg, wPx, hPx);
  } catch {
    /* SVG raster still has fills / composite art */
  }
  if (kind === "cut") applyCutMask(canvas, template, state);
  return canvas;
}

export async function downloadLabelPng(
  template: LabelTemplate,
  state: LabelState,
  kind: PngKind,
): Promise<PngExportInfo> {
  const { wCm, hCm } = artboardCm({ ...template, state });
  const { wPx, hPx } = printPx(wCm, hCm);
  const canvas = await rasterizeLabelCanvas(template, state, wPx, hPx, kind === "exact" ? "exact" : "cut");
  const out = kind === "bleed" ? applyBleed(canvas) : canvas;
  const physW = kind === "bleed" ? wCm + (2 * BLEED_MM) / 10 : wCm;
  const physH = kind === "bleed" ? hCm + (2 * BLEED_MM) / 10 : hCm;
  const dataUrl = pngSetPhysSize(canvasToPngDataUrl(out), physW, physH, out.width, out.height);
  const base = exportFileBase({ ...template, state });
  const filename = kind === "cut" ? `${base}_cut.png` : kind === "bleed" ? `${base}_bleed.png` : `${base}.png`;
  triggerDownload(dataUrl, filename);
  return {
    kind,
    filename,
    wCm: physW,
    hCm: physH,
    wPx: out.width,
    hPx: out.height,
    dpi: DPI,
  };
}
