/**
 * Live BBComposite boolean / contour math from costs/bb-composite-label.js.
 * Raster union and intersect need a browser canvas (Studio is client-only).
 */
import { JELLY_BLOB_PATH } from "./part-types";
import type { CompositeBlob, CompositePart, CompositeZone } from "./types";

export type Pt = [number, number];
export type BBox = { L: number; T: number; R: number; B: number; w: number; h: number };

function partHasPathLocal(p: CompositePart | null | undefined) {
  return Boolean(p && p.pathLocal);
}

function rotatePtsAround(pts: Pt[], cx: number, cy: number, deg: number): Pt[] {
  if (!pts.length || !deg) return pts;
  const rad = (Number(deg) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pts.map((pt) => {
    const dx = pt[0] - cx;
    const dy = pt[1] - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  });
}

export function pathLocalToPts(part: CompositePart, W: number, H: number): Pt[] {
  const left = ((part.x - part.w / 2) / 100) * W;
  const top = ((part.y - part.h / 2) / 100) * H;
  const bw = (part.w / 100) * W;
  const bh = (part.h / 100) * H;
  const cx = (part.x / 100) * W;
  const cy = (part.y / 100) * H;
  const pts: Pt[] = [];
  String(part.pathLocal || "").replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/gi, (_, _cmd, x, y) => {
    pts.push([left + (parseFloat(x) / 100) * bw, top + (parseFloat(y) / 100) * bh]);
    return _;
  });
  const rot = Number(part.rot) || 0;
  if (rot) return rotatePtsAround(pts, cx, cy, rot);
  return pts;
}

export function polygonToPathPct(pts: Pt[]) {
  if (!pts || pts.length < 3) return "";
  return (
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${Number(p[0]).toFixed(2)} ${Number(p[1]).toFixed(2)}`).join(" ") + " Z"
  );
}

export function partToPolygon(part: CompositePart, W: number, H: number): Pt[] {
  const cx = (part.x / 100) * W;
  const cy = (part.y / 100) * H;
  const rw = ((part.w / 100) * W) / 2;
  const rh = ((part.h / 100) * H) / 2;
  const type = part.type || "circle";
  const n = 48;
  let pts: Pt[] = [];
  let i: number;
  let a: number;

  const pushPolar = (count: number, startDeg: number, radiiFn: (i: number, a: number) => { x: number; y: number }) => {
    for (i = 0; i < count; i++) {
      a = ((startDeg + (360 * i) / count) * Math.PI) / 180;
      const rr = radiiFn(i, a);
      pts.push([cx + rr.x * Math.cos(a), cy + rr.y * Math.sin(a)]);
    }
  };

  if (type === "rounded_sq" || type === "rounded_rect") {
    let rRad = Math.min(rw, rh) * 0.36;
    if (rRad < 0.5) rRad = Math.min(rw, rh) * 0.2;
    const arcSteps = 12;
    const pushCornerArc = (ox: number, oy: number, a0: number, a1: number) => {
      for (let s = 0; s <= arcSteps; s++) {
        const t = s / arcSteps;
        const ang = a0 + (a1 - a0) * t;
        pts.push([ox + rRad * Math.cos(ang), oy + rRad * Math.sin(ang)]);
      }
    };
    pushCornerArc(cx - rw + rRad, cy - rh + rRad, Math.PI, Math.PI * 1.5);
    pushCornerArc(cx + rw - rRad, cy - rh + rRad, Math.PI * 1.5, Math.PI * 2);
    pushCornerArc(cx + rw - rRad, cy + rh - rRad, 0, Math.PI * 0.5);
    pushCornerArc(cx - rw + rRad, cy + rh - rRad, Math.PI * 0.5, Math.PI);
  } else if (type === "square" || type === "rectangle") {
    pts = [
      [cx - rw, cy - rh],
      [cx + rw, cy - rh],
      [cx + rw, cy + rh],
      [cx - rw, cy + rh],
    ];
  } else if (type === "diamond") {
    pts = [
      [cx, cy - rh],
      [cx + rw, cy],
      [cx, cy + rh],
      [cx - rw, cy],
    ];
  } else if (type === "hexagon") {
    pushPolar(6, 0, () => ({ x: rw, y: rh }));
  } else if (type === "star") {
    for (i = 0; i < 10; i++) {
      a = ((-90 + i * 36) * Math.PI) / 180;
      const R = i % 2 === 0 ? 1 : 0.42;
      pts.push([cx + rw * R * Math.cos(a), cy + rh * R * Math.sin(a)]);
    }
  } else if (type === "jelly_blob") {
    return pathLocalToPts(
      {
        ...part,
        pathLocal: part.pathLocal || JELLY_BLOB_PATH,
      },
      W,
      H,
    );
  } else if (type === "cloud") {
    const lobes = [
      { ox: -0.38, oy: 0.12, r: 0.4 },
      { ox: -0.05, oy: -0.22, r: 0.48 },
      { ox: 0.36, oy: 0.02, r: 0.42 },
      { ox: 0.08, oy: 0.28, r: 0.5 },
    ];
    for (i = 0; i < 72; i++) {
      a = (i / 72) * Math.PI * 2;
      const cdx = Math.cos(a);
      const cdy = Math.sin(a);
      let tmax = 0;
      for (let t = 0; t <= 1.25; t += 0.025) {
        const pxu = t * cdx;
        const pyu = t * cdy;
        for (const C of lobes) {
          const ddx = pxu - C.ox;
          const ddy = pyu - C.oy;
          if (ddx * ddx + ddy * ddy <= C.r * C.r) tmax = t;
        }
      }
      pts.push([cx + tmax * rw * cdx, cy + tmax * rh * cdy]);
    }
  } else if (type === "heart") {
    for (i = 0; i <= 64; i++) {
      const ht = (i / 64) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(ht), 3);
      const hy = -(13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht));
      pts.push([cx + (hx / 17) * rw, cy + ((hy + 1) / 18) * rh]);
    }
  } else if (type === "scallop") {
    const petals = 10;
    for (i = 0; i < 96; i++) {
      a = (i / 96) * Math.PI * 2 - Math.PI / 2;
      const sR = 0.72 + 0.28 * Math.cos(petals * a);
      pts.push([cx + rw * sR * Math.cos(a), cy + rh * sR * Math.sin(a)]);
    }
  } else if (type === "teardrop") {
    for (i = 0; i < 64; i++) {
      a = -Math.PI / 2 + (i / 64) * Math.PI * 2;
      const td = 0.58 * (1.12 + Math.sin(a));
      pts.push([cx + rw * td * Math.cos(a), cy + rh * td * Math.sin(a)]);
    }
  } else if (type === "crescent") {
    const o0 = (-70 * Math.PI) / 180;
    const o1 = (250 * Math.PI) / 180;
    for (i = 0; i <= 40; i++) {
      a = o0 + ((o1 - o0) * i) / 40;
      pts.push([cx + rw * Math.cos(a), cy + rh * Math.sin(a)]);
    }
    const cox = rw * 0.3;
    for (i = 40; i >= 0; i--) {
      a = o0 + ((o1 - o0) * i) / 40;
      pts.push([cx + cox + rw * 0.7 * Math.cos(a), cy + rh * 0.7 * Math.sin(a)]);
    }
  } else if (type === "blob") {
    for (i = 0; i < 64; i++) {
      a = (i / 64) * Math.PI * 2;
      const bR = 0.84 + 0.12 * Math.sin(3 * a) + 0.08 * Math.cos(5 * a) + 0.05 * Math.sin(2 * a + 1.1);
      pts.push([cx + rw * bR * Math.cos(a), cy + rh * bR * Math.sin(a)]);
    }
  } else if (type === "oval") {
    pushPolar(n, 0, () => ({ x: rw, y: rh }));
  } else if (type === "half_circle" || type === "half_oval") {
    const baseY = cy + rh;
    const arcRh = rh * 2;
    const hn = type === "half_oval" ? 64 : n;
    for (i = 0; i <= hn; i++) {
      a = Math.PI + (Math.PI * i) / hn;
      pts.push([cx + rw * Math.cos(a), baseY + arcRh * Math.sin(a)]);
    }
  } else if (type === "pentagon") {
    pushPolar(5, -90, () => ({ x: rw, y: rh }));
  } else if (type === "octagon") {
    pushPolar(8, -22.5, () => ({ x: rw, y: rh }));
  } else {
    pushPolar(n, 0, () => ({ x: rw, y: rh }));
  }
  const rot = Number(part.rot) || 0;
  if (rot) pts = rotatePtsAround(pts, cx, cy, rot);
  return pts;
}

export function partPtsPct(p: CompositePart | null | undefined): Pt[] {
  if (!p) return [];
  if (partHasPathLocal(p)) return pathLocalToPts(p, 100, 100);
  return partToPolygon(p, 100, 100) || [];
}

export function partFillPath(part: CompositePart) {
  if (partHasPathLocal(part)) return polygonToPathPct(pathLocalToPts(part, 100, 100));
  return polygonToPathPct(partToPolygon(part, 100, 100));
}

/** Live `partFillPathLocal` — path in the part box (0–100). Rounded corners are the artboard cut polygon projected into that box so a non-square board does not squash them. */
export function partFillPathLocal(part: CompositePart) {
  if (partHasPathLocal(part)) return String(part.pathLocal || "");
  if (part.type === "rounded_sq" || part.type === "rounded_rect") {
    const pts = partToPolygon({ ...part, rot: 0 }, 100, 100);
    const pw = Math.max(0.01, Number(part.w) || 36);
    const ph = Math.max(0.01, Number(part.h) || 36);
    const L = (Number(part.x) || 50) - pw / 2;
    const T = (Number(part.y) || 50) - ph / 2;
    const localPts = (pts || []).map((pt): Pt => [((pt[0] - L) / pw) * 100, ((pt[1] - T) / ph) * 100]);
    return polygonToPathPct(localPts);
  }
  return polygonToPathPct(partToPolygon({ ...part, x: 50, y: 50, w: 100, h: 100, rot: 0 }, 100, 100));
}

export function pathPctBBox(dPct: string): BBox | null {
  let L = Infinity;
  let T = Infinity;
  let R = -Infinity;
  let B = -Infinity;
  let n = 0;
  String(dPct || "").replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/gi, (_, _c, xRaw, yRaw) => {
    const x = parseFloat(xRaw);
    const y = parseFloat(yRaw);
    if (x < L) L = x;
    if (y < T) T = y;
    if (x > R) R = x;
    if (y > B) B = y;
    n++;
    return _;
  });
  if (!n || !Number.isFinite(L)) return null;
  return { L, T, R, B, w: R - L, h: B - T };
}

export function artboardPathToLocal(dPct: string, box: BBox) {
  if (!dPct || !box || !(box.w > 0) || !(box.h > 0)) return "";
  return String(dPct).replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/gi, (_, cmd, x, y) => {
    const lx = ((parseFloat(x) - box.L) / box.w) * 100;
    const ly = ((parseFloat(y) - box.T) / box.h) * 100;
    return `${cmd}${lx.toFixed(2)} ${ly.toFixed(2)}`;
  });
}

export function partBBoxPct(p: CompositePart | null | undefined): BBox | null {
  if (!p) return null;
  let pts: Pt[] | null = null;
  if (partHasPathLocal(p)) pts = pathLocalToPts(p, 100, 100);
  else if (Number(p.rot) || p.type === "half_circle" || p.type === "half_oval") pts = partToPolygon(p, 100, 100);
  if (pts && pts.length >= 2) {
    let L = Infinity;
    let T = Infinity;
    let R = -Infinity;
    let B = -Infinity;
    for (const pt of pts) {
      if (pt[0] < L) L = pt[0];
      if (pt[1] < T) T = pt[1];
      if (pt[0] > R) R = pt[0];
      if (pt[1] > B) B = pt[1];
    }
    if (Number.isFinite(L) && R > L && B > T) return { L, T, R, B, w: R - L, h: B - T };
  }
  return {
    L: p.x - p.w / 2,
    T: p.y - p.h / 2,
    R: p.x + p.w / 2,
    B: p.y + p.h / 2,
    w: p.w,
    h: p.h,
  };
}

function fillPoly(ctx: CanvasRenderingContext2D, pts: Pt[], sealPx?: number) {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
  const seal = sealPx != null ? sealPx : 0;
  if (seal > 0) {
    ctx.save();
    ctx.lineWidth = seal;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }
}

function simplify(pts: Pt[], eps: number) {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
    if (area > eps) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function getCtx(W: number, H: number): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  try {
    return canvas.getContext("2d", { willReadFrequently: true }) || canvas.getContext("2d");
  } catch {
    try {
      return canvas.getContext("2d");
    } catch {
      return null;
    }
  }
}

function traceOuterContour(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const img = ctx.getImageData(0, 0, W, H).data;
  const solid = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    return img[(y * W + x) * 4 + 3] > 20;
  };
  let sx = -1;
  let sy = -1;
  outer: for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (solid(x, y)) {
        sx = x;
        sy = y;
        break outer;
      }
    }
  }
  if (sx < 0) return "";
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];
  const pts: Pt[] = [];
  let cx = sx;
  let cy = sy;
  let dir = 0;
  let guard = W * H * 2;
  do {
    pts.push([cx, cy]);
    const start = (dir + 6) % 8;
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (start + k) % 8;
      const nx = cx + dx[nd];
      const ny = cy + dy[nd];
      if (solid(nx, ny)) {
        cx = nx;
        cy = ny;
        dir = nd;
        found = true;
        break;
      }
    }
    if (!found) break;
    guard--;
  } while ((cx !== sx || cy !== sy) && guard > 0);
  const simple = simplify(pts, 1.2);
  if (simple.length < 3) return "";
  return (
    simple
      .map((p, i) => {
        const px = ((p[0] / W) * 100).toFixed(2);
        const py = ((p[1] / H) * 100).toFixed(2);
        return `${i === 0 ? "M" : "L"}${px} ${py}`;
      })
      .join(" ") + " Z"
  );
}

function countSolidPixels(ctx: CanvasRenderingContext2D, W: number, H: number) {
  try {
    const data = ctx.getImageData(0, 0, W, H).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 20) n++;
    }
    return n;
  } catch {
    return 0;
  }
}

function authoredUnionFromParts(parts: CompositePart[]) {
  if (parts.length !== 1) return "";
  const p = parts[0];
  if (!p || !partHasPathLocal(p)) return "";
  return polygonToPathPct(pathLocalToPts(p, 100, 100));
}

function boxesTouchOrOverlap(a: BBox, b: BBox, gap = 0.4) {
  return !(a.R < b.L - gap || b.R < a.L - gap || a.B < b.T - gap || b.B < a.T - gap);
}

function isAxisAlignedBoxPart(p: CompositePart) {
  if (Number(p.rot)) return false;
  const t = p.type || "";
  return t === "square" || t === "rectangle";
}

function geometricJoinPathPct(parts: CompositePart[]) {
  if (parts.length < 2) return "";
  if (!parts.every(isAxisAlignedBoxPart)) return "";
  const boxes = parts.map(partBBoxPct).filter((b): b is BBox => Boolean(b));
  if (boxes.length < 2) return "";
  const parent = boxes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const unite = (i: number, j: number) => {
    const a = find(i);
    const b = find(j);
    if (a !== b) parent[a] = b;
  };
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesTouchOrOverlap(boxes[i], boxes[j], 0.5)) unite(i, j);
    }
  }
  const groups: Record<number, { L: number; T: number; R: number; B: number }> = {};
  boxes.forEach((b, idx) => {
    const r = find(idx);
    if (!groups[r]) groups[r] = { L: b.L, T: b.T, R: b.R, B: b.B };
    else {
      const g = groups[r];
      if (b.L < g.L) g.L = b.L;
      if (b.T < g.T) g.T = b.T;
      if (b.R > g.R) g.R = b.R;
      if (b.B > g.B) g.B = b.B;
    }
  });
  const keys = Object.keys(groups);
  if (keys.length !== 1) return "";
  const u = groups[Number(keys[0])];
  return polygonToPathPct([
    [u.L, u.T],
    [u.R, u.T],
    [u.R, u.B],
    [u.L, u.B],
  ]);
}

function convexHullPts(pts: Pt[]) {
  if (!pts || pts.length < 3) return pts || [];
  const sorted = pts.slice().sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const uniq: Pt[] = [];
  sorted.forEach((p) => {
    const last = uniq[uniq.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) uniq.push(p);
  });
  if (uniq.length < 3) return uniq;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let j = uniq.length - 1; j >= 0; j--) {
    const p = uniq[j];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function convexHullJoinPathPct(parts: CompositePart[]) {
  const pts: Pt[] = [];
  for (const p of parts) {
    const poly = partHasPathLocal(p) ? pathLocalToPts(p, 100, 100) : partToPolygon(p, 100, 100);
    for (const pt of poly || []) pts.push([pt[0], pt[1]]);
  }
  return polygonToPathPct(convexHullPts(pts));
}

export function pathCoversParts(dPct: string, parts: CompositePart[], minRatio = 0.82) {
  const pb = pathPctBBox(dPct);
  if (!pb || !parts.length) return false;
  let L = Infinity;
  let T = Infinity;
  let R = -Infinity;
  let B = -Infinity;
  for (const p of parts) {
    const b = partBBoxPct(p);
    if (!b) continue;
    if (b.L < L) L = b.L;
    if (b.T < T) T = b.T;
    if (b.R > R) R = b.R;
    if (b.B > B) B = b.B;
  }
  if (!Number.isFinite(L)) return false;
  const wantW = Math.max(0.01, R - L);
  const wantH = Math.max(0.01, B - T);
  const ratio = Math.min(pb.w / wantW, pb.h / wantH);
  return ratio >= minRatio;
}

export function unionPathFromPartsList(parts: CompositePart[], opts?: { res?: number; seal?: number }) {
  if (!parts.length) return "";
  const authored = authoredUnionFromParts(parts);
  if (authored) return authored;
  if (parts.length === 1) {
    const one = polygonToPathPct(partToPolygon(parts[0], 100, 100));
    if (one) return one;
  }
  const geo = geometricJoinPathPct(parts);
  if (geo) return geo;
  const W = opts?.res || 1000;
  const H = opts?.res || 1000;
  const seal = opts?.seal != null ? opts.seal : Math.max(4, Math.round(W * 0.006));
  const ctx = getCtx(W, H);
  if (!ctx) return convexHullJoinPathPct(parts);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  for (const p of parts) {
    const pts = partHasPathLocal(p) ? pathLocalToPts(p, W, H) : partToPolygon(p, W, H);
    fillPoly(ctx, pts, seal);
  }
  const traced = traceOuterContour(ctx, W, H);
  if (!pathCoversParts(traced, parts, 0.82)) {
    const hull = convexHullJoinPathPct(parts);
    if (hull) return hull;
  }
  return traced;
}

function zoneOutlinePtsPct(z: CompositeZone, opts?: { pad?: number; forceCircle?: boolean }): Pt[] {
  if (!z) return [];
  const cx = Number(z.x) || 50;
  const cy = Number(z.y) || 50;
  let hw = (Number(z.w) || 20) / 2;
  let hh = (Number(z.h) || 20) / 2;
  const pad = opts?.pad != null ? Number(opts.pad) : 0;
  if (Number.isFinite(pad) && pad > 0) {
    hw += pad;
    hh += pad;
  }
  const useCirc =
    opts?.forceCircle ||
    z.kind === "logo" ||
    z.shape === "circle" ||
    (z.kind !== "icon" && z.kind !== "image" && z.kind !== "text" && z.lockAspect && Math.abs(hw - hh) < 0.8);
  let pts: Pt[] = [];
  if (useCirc) {
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      pts.push([cx + hw * Math.cos(a), cy + hh * Math.sin(a)]);
    }
  } else {
    pts = [
      [cx - hw, cy - hh],
      [cx + hw, cy - hh],
      [cx + hw, cy + hh],
      [cx - hw, cy + hh],
    ];
  }
  const rot = Number(z.rot) || 0;
  if (rot) pts = rotatePtsAround(pts, cx, cy, rot);
  return pts;
}

export function zoneOutlinePathPct(z: CompositeZone) {
  return polygonToPathPct(zoneOutlinePtsPct(z));
}

function closestPointOnPoly(px: number, py: number, pts: Pt[]): Pt | null {
  if (!pts.length) return null;
  let best: Pt = pts[0];
  let bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - a[0]) * dx + (py - a[1]) * dy) / len2 : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const qx = a[0] + t * dx;
    const qy = a[1] + t * dy;
    const d = (qx - px) * (qx - px) + (qy - py) * (qy - py);
    if (d < bestD) {
      bestD = d;
      best = [qx, qy];
    }
  }
  return best;
}

function strokeTightBridges(ctx: CanvasRenderingContext2D, polys: Pt[][], bridgePx: number) {
  if (polys.length < 2) return;
  const n = polys.length;
  const linked = polys.map((_, i) => i);
  const find = (i: number): number => {
    while (linked[i] !== i) i = linked[i];
    return i;
  };
  const unite = (a0: number, b0: number) => {
    const a = find(a0);
    const b = find(b0);
    if (a !== b) linked[b] = a;
  };
  const edges: { a: number; b: number; d: number; p0: Pt; p1: Pt }[] = [];
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const pa = polys[a];
      const pb = polys[b];
      if (!pa?.length || !pb?.length) continue;
      let bestD = Infinity;
      let p0: Pt | null = null;
      let p1: Pt | null = null;
      const stepA = Math.max(1, Math.floor(pa.length / 16));
      const stepB = Math.max(1, Math.floor(pb.length / 16));
      for (let ia = 0; ia < pa.length; ia += stepA) {
        const qa = pa[ia];
        const qb = closestPointOnPoly(qa[0], qa[1], pb);
        if (!qb) continue;
        const d = (qa[0] - qb[0]) * (qa[0] - qb[0]) + (qa[1] - qb[1]) * (qa[1] - qb[1]);
        if (d < bestD) {
          bestD = d;
          p0 = qa;
          p1 = qb;
        }
      }
      for (let ib = 0; ib < pb.length; ib += stepB) {
        const qb2 = pb[ib];
        const qa2 = closestPointOnPoly(qb2[0], qb2[1], pa);
        if (!qa2) continue;
        const d2 = (qa2[0] - qb2[0]) * (qa2[0] - qb2[0]) + (qa2[1] - qb2[1]) * (qa2[1] - qb2[1]);
        if (d2 < bestD) {
          bestD = d2;
          p0 = qa2;
          p1 = qb2;
        }
      }
      if (p0 && p1) edges.push({ a, b, d: bestD, p0, p1 });
    }
  }
  edges.sort((u, v) => u.d - v.d);
  ctx.save();
  ctx.strokeStyle = String(ctx.fillStyle || "#fff");
  ctx.lineWidth = Math.max(2, bridgePx || 4);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  let need = n - 1;
  for (let e = 0; e < edges.length && need > 0; e++) {
    const ed = edges[e];
    if (find(ed.a) === find(ed.b)) continue;
    unite(ed.a, ed.b);
    need--;
    ctx.beginPath();
    ctx.moveTo(ed.p0[0], ed.p0[1]);
    ctx.lineTo(ed.p1[0], ed.p1[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function pathPctContainsZones(dPct: string, zones: CompositeZone[]) {
  if (!dPct || !zones.length) return true;
  try {
    if (typeof document === "undefined" || typeof Path2D === "undefined") return false;
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const p = new Path2D(dPct);
    for (const z of zones) {
      const x = Number(z.x) || 50;
      const y = Number(z.y) || 50;
      if (!ctx.isPointInPath(p, x, y)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function unionPathFromPartsAndZones(
  parts: CompositePart[],
  zones: CompositeZone[],
  opts?: { res?: number; seal?: number; bridge?: number },
) {
  if (!parts.length && !zones.length) return "";
  if (parts.length && !zones.length) return unionPathFromPartsList(parts, opts);
  if (!parts.length && zones.length === 1) return zoneOutlinePathPct(zones[0]);
  const W = opts?.res || 1400;
  const H = opts?.res || 1400;
  const seal = opts?.seal != null ? opts.seal : Math.max(1, Math.round(W * 0.0015));
  const bridge = opts?.bridge != null ? opts.bridge : Math.max(4, Math.round(W * 0.005));
  const ctx = getCtx(W, H);
  if (!ctx) {
    return unionPathFromPartsList(parts, opts) || (zones[0] ? zoneOutlinePathPct(zones[0]) : "");
  }
  ctx.fillStyle = "#fff";
  const pctToPx = (pts: Pt[]) => (pts || []).map((pt): Pt => [(pt[0] / 100) * W, (pt[1] / 100) * H]);
  const collectPolys = () => {
    const polys: Pt[][] = [];
    for (const p of parts) {
      const pts = partHasPathLocal(p) ? pathLocalToPts(p, W, H) : partToPolygon(p, W, H);
      if (pts.length) polys.push(pts);
    }
    for (const z of zones) {
      const zp = pctToPx(zoneOutlinePtsPct(z));
      if (zp.length) polys.push(zp);
    }
    return polys;
  };
  const paintTight = (sealPx: number, doBridge: boolean) => {
    ctx.clearRect(0, 0, W, H);
    const polys = collectPolys();
    for (const pts of polys) fillPoly(ctx, pts, sealPx);
    if (doBridge && polys.length > 1) strokeTightBridges(ctx, polys, bridge);
  };
  paintTight(seal, true);
  let traced = traceOuterContour(ctx, W, H);
  if (traced && pathPctContainsZones(traced, zones)) return traced;
  paintTight(seal, true);
  strokeTightBridges(ctx, collectPolys(), Math.max(bridge * 2, Math.round(W * 0.01)));
  traced = traceOuterContour(ctx, W, H);
  if (traced && pathPctContainsZones(traced, zones)) return traced;
  const seal2 = Math.max(seal * 3, Math.round(W * 0.006));
  paintTight(seal2, true);
  traced = traceOuterContour(ctx, W, H);
  return traced || "";
}

function pointInPolyPct(pt: Pt, poly: Pt[]) {
  if (!pt || poly.length < 3) return false;
  const x = pt[0];
  const y = pt[1];
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const hit = yi > y !== yj > y && Math.abs(yj - yi) > 1e-12 && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function segmentIntersectionPct(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt | null {
  const d = (a2[0] - a1[0]) * (b2[1] - b1[1]) - (a2[1] - a1[1]) * (b2[0] - b1[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((b1[0] - a1[0]) * (b2[1] - b1[1]) - (b1[1] - a1[1]) * (b2[0] - b1[0])) / d;
  const u = ((b1[0] - a1[0]) * (a2[1] - a1[1]) - (b1[1] - a1[1]) * (a2[0] - a1[0])) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a1[0] + t * (a2[0] - a1[0]), a1[1] + t * (a2[1] - a1[1])];
}

function boxContainsPct(outer: BBox, inner: BBox, pad = 0) {
  return inner.L >= outer.L - pad && inner.R <= outer.R + pad && inner.T >= outer.T - pad && inner.B <= outer.B + pad;
}

function geometricIntersectPathPct(clipPts: Pt[], subPts: Pt[]) {
  const pts: Pt[] = [];
  for (const p of subPts) if (pointInPolyPct(p, clipPts)) pts.push(p);
  for (const p of clipPts) if (pointInPolyPct(p, subPts)) pts.push(p);
  for (let i = 0; i < subPts.length; i++) {
    const a1 = subPts[i];
    const a2 = subPts[(i + 1) % subPts.length];
    for (let j = 0; j < clipPts.length; j++) {
      const b1 = clipPts[j];
      const b2 = clipPts[(j + 1) % clipPts.length];
      const hit = segmentIntersectionPct(a1, a2, b1, b2);
      if (hit) pts.push(hit);
    }
  }
  if (pts.length < 3) return "";
  const hull = convexHullPts(pts);
  if (!hull || hull.length < 3) return "";
  return polygonToPathPct(hull);
}

function rasterIntersectPathPct(clipPts: Pt[], subPts: Pt[], res = 1200) {
  const W = res;
  const H = res;
  const ctx = getCtx(W, H);
  if (!ctx) return "";
  const toPx = (pts: Pt[]) => pts.map((pt): Pt => [(pt[0] / 100) * W, (pt[1] / 100) * H]);
  const drawOnce = (seal: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    fillPoly(ctx, toPx(subPts), seal);
    ctx.globalCompositeOperation = "destination-in";
    fillPoly(ctx, toPx(clipPts), seal);
    ctx.globalCompositeOperation = "source-over";
  };
  drawOnce(3);
  let solidN = countSolidPixels(ctx, W, H);
  if (solidN < 40) {
    drawOnce(10);
    solidN = countSolidPixels(ctx, W, H);
  }
  if (solidN < 20) return "";
  const traced = traceOuterContour(ctx, W, H);
  if (traced && pathPctBBox(traced)) return traced;
  return "";
}

export function intersectPartsPathPct(clipper: CompositePart, subject: CompositePart) {
  const a = partBBoxPct(clipper);
  const b = partBBoxPct(subject);
  if (!a || !b) return "";
  if (!boxesTouchOrOverlap(a, b, 1.2)) return "";
  const clipPts = partPtsPct(clipper);
  const subPts = partPtsPct(subject);
  if (clipPts.length < 3 || subPts.length < 3) return "";
  const raster = rasterIntersectPathPct(clipPts, subPts, 1200);
  if (raster) return raster;
  const geo = geometricIntersectPathPct(clipPts, subPts);
  if (geo) return geo;
  if (boxContainsPct(a, b, 1.5)) {
    const kept = subPts.filter((pt) => pointInPolyPct(pt, clipPts));
    if (kept.length >= 3) return polygonToPathPct(kept);
    if (pointInPolyPct([(b.L + b.R) / 2, (b.T + b.B) / 2], clipPts)) return polygonToPathPct(subPts);
  }
  return "";
}

export function isCutOutlineZone(z: CompositeZone | null | undefined) {
  if (!z) return false;
  if (z.kind === "icon" || z.kind === "logo" || z.kind === "image") return true;
  if (z.iconId) return true;
  return false;
}

export function layersInLayerGroup(blob: CompositeBlob, gid: string) {
  if (!gid) return { parts: [] as CompositePart[], zones: [] as CompositeZone[] };
  return {
    parts: (blob.parts || []).filter((p) => p && p.layerGroup === gid),
    zones: (blob.zones || []).filter((z) => z && z.layerGroup === gid),
  };
}

function cutPartsForUnion(blob: CompositeBlob) {
  const all = blob.parts || [];
  if (!blob.cutSourceIds?.length) return all;
  const filtered = blob.cutSourceIds
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is CompositePart => Boolean(p));
  if (!filtered.length) {
    blob.cutSourceIds = null;
    return all;
  }
  return filtered;
}

export function recomputeUnion(blob: CompositeBlob) {
  if (blob.cutGroupId) {
    const g = layersInLayerGroup(blob, blob.cutGroupId);
    if (g.parts.length || g.zones.length) {
      blob.unionPath = unionPathFromPartsAndZones(g.parts, g.zones);
      return blob.unionPath;
    }
    blob.cutGroupId = null;
  }
  if (blob.cutZoneId) {
    const z = (blob.zones || []).find((item) => item.id === blob.cutZoneId);
    if (z) {
      blob.unionPath = zoneOutlinePathPct(z);
      return blob.unionPath;
    }
    blob.cutZoneId = null;
  }
  blob.unionPath = unionPathFromPartsList(cutPartsForUnion(blob));
  return blob.unionPath || "";
}

export function padPathBox(box: BBox, pad: number): BBox {
  const L = box.L - pad;
  const T = box.T - pad;
  const R = box.R + pad;
  const B = box.B + pad;
  return { L, T, R, B, w: R - L, h: B - T };
}
