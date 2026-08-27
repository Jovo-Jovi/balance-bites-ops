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
import { artboardCm, compositeDiePath, labelPreviewSvg, liveComposite } from "./preview";
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

function isSvgHref(href: string) {
  const s = href.trim();
  if (/^data:image\/svg/i.test(s)) return true;
  return /\.svg(?:\?|#|$)/i.test(s);
}

async function flattenSvgHrefToPng(href: string) {
  const src = href.startsWith("data:") ? href : absUrl(href);
  const cacheKey = href.startsWith("data:") ? `png:data:${href.length}:${href.slice(18, 42)}` : `png:${src}`;
  const hit = resourceCache.get(cacheKey);
  if (hit) return hit;
  const img = new Image();
  img.decoding = "sync";
  img.src = src;
  if (typeof img.decode === "function") await img.decode();
  else {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not flatten SVG art"));
      if (img.complete && img.naturalWidth) resolve();
    });
  }
  const iw = Math.max(1, img.naturalWidth || 512);
  const ih = Math.max(1, img.naturalHeight || 512);
  const scale = Math.min(1, 1024 / Math.max(iw, ih));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(iw * scale));
  canvas.height = Math.max(1, Math.round(ih * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return href;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  try {
    const png = canvas.toDataURL("image/png");
    resourceCache.set(cacheKey, png);
    return png;
  } catch {
    return href;
  }
}

async function flattenNestedSvgImages(svg: string) {
  const re = /(?:href|xlink:href|src)=["']([^"']+)["']/gi;
  const map = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const href = m[1].trim();
    if (!href || map.has(href) || !isSvgHref(href)) continue;
    try {
      map.set(href, await flattenSvgHrefToPng(href));
    } catch {
      map.set(href, href);
    }
  }
  let out = svg;
  for (const [from, to] of map) {
    if (from && to && from !== to) out = out.split(from).join(to);
  }
  return out;
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
      const data = isSvgHref(u) ? await flattenSvgHrefToPng(u) : await urlToDataUrl(u);
      out = out.split(u).join(data);
    } catch {
      out = out.split(u).join("");
    }
  }
  out = await flattenNestedSvgImages(out);
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

function stripForeignObjects(svg: string) {
  return svg.replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, "");
}

function emptyCanvas(wPx: number, hPx: number) {
  const canvas = document.createElement("canvas");
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (ctx) ctx.clearRect(0, 0, wPx, hPx);
  return canvas;
}

function foSize(fo: SVGForeignObjectElement) {
  const w = Number(fo.width.baseVal?.value);
  const h = Number(fo.height.baseVal?.value);
  const x = Number(fo.x.baseVal?.value);
  const y = Number(fo.y.baseVal?.value);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    w: Number.isFinite(w) && w > 0 ? w : 1,
    h: Number.isFinite(h) && h > 0 ? h : 1,
  };
}

function svgViewSize(svg: SVGSVGElement, fallbackW: number, fallbackH: number) {
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  return { x: 0, y: 0, w: fallbackW, h: fallbackH };
}

function applySvgTransformAttr(m: DOMMatrix, attr: string) {
  const re = /(matrix|rotate|translate|scale)\s*\(([^)]*)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(attr))) {
    const kind = match[1].toLowerCase();
    const nums = match[2]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (kind === "rotate") {
      const ang = nums[0] || 0;
      if (nums.length >= 3) m.translateSelf(nums[1], nums[2]).rotateSelf(ang).translateSelf(-nums[1], -nums[2]);
      else m.rotateSelf(ang);
    } else if (kind === "translate") {
      m.translateSelf(nums[0] || 0, nums[1] || 0);
    } else if (kind === "scale") {
      m.scaleSelf(nums[0] ?? 1, nums[1] ?? nums[0] ?? 1);
    } else if (kind === "matrix" && nums.length >= 6) {
      m.multiplySelf(new DOMMatrix([nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]]));
    }
  }
}

/** FO local → canvas pixels from viewBox + ancestor transforms. Do not use getCTM / clientWidth (off-screen iframe is often 0). */
function foCanvasTransform(fo: SVGForeignObjectElement, svg: SVGSVGElement, wPx: number, hPx: number) {
  const box = foSize(fo);
  const vb = svgViewSize(svg, wPx, hPx);
  const sx = wPx / vb.w;
  const sy = hPx / vb.h;
  const user = new DOMMatrix();
  const chain: Element[] = [];
  let el: Element | null = fo.parentElement;
  while (el && el !== svg && el.tagName.toLowerCase() !== "svg") {
    chain.push(el);
    el = el.parentElement;
  }
  for (let i = chain.length - 1; i >= 0; i--) {
    applySvgTransformAttr(user, chain[i].getAttribute("transform") || "");
  }
  user.translateSelf(box.x, box.y);
  return new DOMMatrix([sx, 0, 0, sy, -vb.x * sx, -vb.y * sy]).multiply(user);
}

function openLtrFrame(w: number, h: number) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("dir", "ltr");
  const ww = Math.max(1, Math.round(w));
  const hh = Math.max(1, Math.round(h));
  iframe.style.cssText = `position:fixed;left:-${ww}px;top:0;width:${ww}px;height:${hh}px;border:0;opacity:1;pointer-events:none;background:transparent;`;
  document.body.appendChild(iframe);
  return iframe;
}

async function fillFrame(iframe: HTMLIFrameElement, bodyHtml: string, w: number, h: number, fonts: string) {
  const html = `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="utf-8"/>
<style>${fonts}
html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent;direction:ltr}
svg{display:block;width:${w}px;height:${h}px}
</style></head><body>${bodyHtml}</body></html>`;
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    iframe.onload = () => done();
    iframe.onerror = () => {
      if (settled) return;
      settled = true;
      reject(new Error("Preview frame failed"));
    };
    iframe.srcdoc = html;
    window.setTimeout(() => {
      if (iframe.contentDocument?.body?.childNodes.length) done();
    }, 120);
    window.setTimeout(done, 600);
  });
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("Preview frame is empty.");
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
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return doc;
}

/** html-to-image sees 0×0 inside SVG FO; rasterize the XHTML in a real LTR HTML document. */
async function snapshotFoHtml(
  node: Element,
  fw: number,
  fh: number,
  pixelRatio: number,
  fonts: string,
  toCanvas: (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>,
) {
  const inner = new XMLSerializer()
    .serializeToString(node)
    .replace(/\sxmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "");
  const iframe = openLtrFrame(fw, fh);
  try {
    const doc = await fillFrame(iframe, inner, fw, fh, fonts);
    const el = (doc.body.firstElementChild as HTMLElement | null) || doc.body;
    el.style.width = `${fw}px`;
    el.style.height = `${fh}px`;
    return await toCanvas(el, {
      width: fw,
      height: fh,
      pixelRatio,
      cacheBust: false,
      skipFonts: true,
      fontEmbedCSS: fonts || " ",
    });
  } finally {
    iframe.remove();
  }
}

async function paintForeignObjects(canvas: HTMLCanvasElement, svgMarkup: string, wPx: number, hPx: number) {
  if (!hasForeignObject(svgMarkup)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvasIsClean(ctx)) return;
  const { toCanvas } = await import("html-to-image");
  const fonts = await printFontCss();
  const markup = svgMarkup.replace(/^<\?xml[^>]*>/, "").replace(/@import\s+url\([^)]+\);?/g, "");
  const iframe = openLtrFrame(wPx, hPx);
  try {
    const svg = (await fillFrame(iframe, markup, wPx, hPx, fonts)).querySelector("svg");
    if (!svg) return;
    const shot = toCanvas as (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>;
    for (const fo of svg.querySelectorAll("foreignObject")) {
      if (!canvasIsClean(ctx)) return;
      const node = fo.firstElementChild;
      if (!node) continue;
      const box = foSize(fo);
      let overlay: HTMLCanvasElement;
      try {
        overlay = await snapshotFoHtml(
          node,
          Math.max(1, Math.round(box.w)),
          Math.max(1, Math.round(box.h)),
          Math.max(2, Math.min(3, canvas.width / Math.max(box.w, 1))),
          fonts,
          shot,
        );
      } catch {
        continue;
      }
      const overlayCtx = overlay.getContext("2d");
      if (!overlayCtx || !canvasIsClean(overlayCtx)) continue;
      const vb = svgViewSize(svg, wPx, hPx);
      const full = box.x <= 1 && box.y <= 1 && box.w >= vb.w * 0.92 && box.h >= vb.h * 0.92;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (full) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(overlay, 0, 0, wPx, hPx);
      } else {
        const m = foCanvasTransform(fo, svg, wPx, hPx);
        ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
        ctx.drawImage(overlay, 0, 0, box.w, box.h);
      }
      ctx.restore();
    }
  } finally {
    iframe.remove();
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
    applyCompositeCut(ctx, liveComposite(state) || state._composite, canvas.width, canvas.height);
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
    canvas = await rasterizeSvg(hasForeignObject(svg) ? stripForeignObjects(svg) : svg, wPx, hPx);
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
