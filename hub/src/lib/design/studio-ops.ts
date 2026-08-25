import { genId } from "@/lib/invoices/helpers";
import {
  artboardPathToLocal,
  convexHullJoinPathPct,
  intersectPartsPathPct,
  isCutOutlineZone,
  layersInLayerGroup,
  padPathBox,
  partBBoxPct,
  pathCoversParts,
  pathPctBBox,
  recomputeUnion,
  unionPathFromPartsAndZones,
  unionPathFromPartsList,
  zoneOutlinePathPct,
} from "./boolean-cut";
import { MAX_OUTLINE_PARTS, makePart } from "./part-types";
import type { CompositeBlob, CompositePart, CompositeZone, LabelState } from "./types";

export type CutSnapshot = {
  cutSourceIds: string[] | null;
  cutZoneId: string | null;
  cutGroupId: string | null;
  unionPath: string;
};

export type CutPreview = {
  path: string;
  partIds: string[];
  zoneIds: string[];
  groupId?: string | null;
  prev: CutSnapshot;
};

export type StudioOp = {
  state: LabelState;
  selectIds: string[];
  message: string;
  ok: boolean;
  preview?: CutPreview | null;
};

function fail(state: LabelState, message: string, selectIds: string[] = []): StudioOp {
  return { state, selectIds, message, ok: false };
}

function cloneState(state: LabelState): LabelState {
  return JSON.parse(JSON.stringify(state)) as LabelState;
}

function blobOf(state: LabelState): CompositeBlob | null {
  return state._composite || null;
}

function findPart(blob: CompositeBlob, id: string) {
  return (blob.parts || []).find((p) => p.id === id);
}

function findZone(blob: CompositeBlob, id: string) {
  return (blob.zones || []).find((z) => z.id === id);
}

function splitSelection(blob: CompositeBlob, ids: string[]) {
  const partIds: string[] = [];
  const zoneIds: string[] = [];
  for (const id of ids) {
    if (findPart(blob, id)) partIds.push(id);
    else if (findZone(blob, id)) zoneIds.push(id);
  }
  return { partIds, zoneIds };
}

function selectedLayerGroupId(blob: CompositeBlob, ids: string[]) {
  const gids = new Set<string>();
  const { partIds, zoneIds } = splitSelection(blob, ids);
  for (const id of partIds) {
    const p = findPart(blob, id);
    if (p?.layerGroup) gids.add(p.layerGroup);
  }
  for (const id of zoneIds) {
    const z = findZone(blob, id);
    if (z?.layerGroup) gids.add(z.layerGroup);
  }
  return gids.size === 1 ? [...gids][0] : null;
}

function snapshotCut(blob: CompositeBlob): CutSnapshot {
  return {
    cutSourceIds: blob.cutSourceIds ? blob.cutSourceIds.slice() : null,
    cutZoneId: blob.cutZoneId || null,
    cutGroupId: blob.cutGroupId || null,
    unionPath: blob.unionPath || "",
  };
}

function restoreCut(blob: CompositeBlob, prev: CutSnapshot) {
  blob.cutSourceIds = prev.cutSourceIds ? prev.cutSourceIds.slice() : null;
  blob.cutZoneId = prev.cutZoneId || null;
  blob.cutGroupId = prev.cutGroupId || null;
  blob.unionPath = prev.unionPath || "";
  if (!blob.unionPath) recomputeUnion(blob);
}

function bumpZ(blob: CompositeBlob) {
  for (const p of blob.parts || []) p.z = (p.z || 0) + 1;
  for (const z of blob.zones || []) z.z = (z.z || 0) + 1;
}

function withBlob(state: LabelState): { next: LabelState; blob: CompositeBlob } | null {
  if (!state._composite) return null;
  const next = cloneState(state);
  const blob = next._composite;
  if (!blob) return null;
  if (!blob.parts) blob.parts = [];
  if (!blob.zones) blob.zones = [];
  return { next, blob };
}

export function addShape(state: LabelState, type: string): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Switch family to Composite to add shapes.");
  const { next, blob } = packed;
  if ((blob.parts || []).length >= MAX_OUTLINE_PARTS) {
    return fail(state, `Max ${MAX_OUTLINE_PARTS} outline parts.`);
  }
  bumpZ(blob);
  const part = makePart(type, blob.parts!.length, blob.bg || "#2e7d32");
  blob.parts!.push(part);
  recomputeUnion(blob);
  return {
    state: next,
    selectIds: [part.id],
    message: "Shape added — resize, then Cut = selected (or Merge).",
    ok: true,
  };
}

export function mergeSelectedParts(state: LabelState, ids: string[]): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Switch family to Composite first.");
  const { next, blob } = packed;
  const { partIds } = splitSelection(blob, ids);
  if (partIds.length < 2) return fail(state, "Shift-click 2+ shapes, then Merge.");
  const parts = partIds.map((id) => findPart(blob, id)).filter((p): p is CompositePart => Boolean(p));
  if (parts.length < 2) return fail(state, "Select at least 2 shape layers.");
  let dPct = unionPathFromPartsList(parts, { res: 1200, seal: 8 });
  if (!dPct || !pathCoversParts(dPct, parts, 0.75)) dPct = convexHullJoinPathPct(parts) || dPct;
  if (!dPct) return fail(state, "Could not merge shapes.");
  let box = pathPctBBox(dPct);
  if (!box || !(box.w > 0.4 && box.h > 0.4)) {
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
    if (!Number.isFinite(L) || !(R - L > 0.4) || !(B - T > 0.4)) return fail(state, "Could not merge shapes.");
    box = { L, T, R, B, w: R - L, h: B - T };
  }
  box = padPathBox(box, 0.15);
  const pathLocal = artboardPathToLocal(dPct, box);
  if (!pathLocal) return fail(state, "Could not build merged outline.");
  let zMax = 0;
  for (const p of parts) if ((p.z || 0) > zMax) zMax = p.z || 0;
  const base = parts[0];
  const merged: CompositePart = {
    id: genId("p"),
    type: "silhouette",
    name: `Merged (${parts.length})`,
    x: box.L + box.w / 2,
    y: box.T + box.h / 2,
    w: box.w,
    h: box.h,
    rot: 0,
    z: zMax,
    lock: false,
    color: base.color || blob.bg || "#2e7d32",
    texture: base.texture || "none",
    pathLocal,
    showImage: false,
  };
  const remove = new Set(partIds);
  let cutHad = false;
  if (blob.cutSourceIds?.length) {
    cutHad = blob.cutSourceIds.some((id) => remove.has(id));
    blob.cutSourceIds = blob.cutSourceIds.filter((id) => !remove.has(id));
  }
  blob.parts = blob.parts!.filter((p) => !remove.has(p.id));
  blob.parts.push(merged);
  if (cutHad) {
    if (!blob.cutSourceIds) blob.cutSourceIds = [];
    blob.cutSourceIds.push(merged.id);
  }
  recomputeUnion(blob);
  return {
    state: next,
    selectIds: [merged.id],
    message: `Merged ${parts.length} shapes → 1 layer.`,
    ok: true,
  };
}

export function groupSelectedLayers(state: LabelState, ids: string[], opts?: { silent?: boolean }): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Switch family to Composite first.");
  const { next, blob } = packed;
  const { partIds, zoneIds } = splitSelection(blob, ids);
  if (partIds.length + zoneIds.length < 2) return fail(state, "Shift-select 2+ layers, then Group.");
  const existing = selectedLayerGroupId(blob, ids);
  if (existing) {
    const g0 = layersInLayerGroup(blob, existing);
    const allIn =
      partIds.every((id) => findPart(blob, id)?.layerGroup === existing) &&
      zoneIds.every((id) => findZone(blob, id)?.layerGroup === existing) &&
      g0.parts.length + g0.zones.length === partIds.length + zoneIds.length;
    if (allIn) {
      return {
        state,
        selectIds: ids,
        message: "Already one group — Cut = selected for a custom die-cut.",
        ok: true,
      };
    }
  }
  const gid = genId("lg");
  for (const id of partIds) {
    const p = findPart(blob, id);
    if (p) p.layerGroup = gid;
  }
  for (const id of zoneIds) {
    const z = findZone(blob, id);
    if (z) z.layerGroup = gid;
  }
  return {
    state: next,
    selectIds: ids,
    message: opts?.silent ? "" : `Grouped ${partIds.length + zoneIds.length} layers — move as one.`,
    ok: true,
  };
}

export function ungroupSelected(state: LabelState, ids: string[]): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Switch family to Composite first.");
  const { next, blob } = packed;
  const { partIds, zoneIds } = splitSelection(blob, ids);
  if (!partIds.length && !zoneIds.length) return fail(state, "Select a grouped layer first.");
  const joinGids = new Set<string>();
  const layerGids = new Set<string>();
  for (const id of partIds) {
    const p = findPart(blob, id);
    if (!p) continue;
    if (p.joinGroup) joinGids.add(p.joinGroup);
    if (p.layerGroup) layerGids.add(p.layerGroup);
  }
  for (const id of zoneIds) {
    const z = findZone(blob, id);
    if (z?.layerGroup) layerGids.add(z.layerGroup);
  }
  if (!joinGids.size && !layerGids.size) return fail(state, "Selection is not in a group.");
  let n = 0;
  if (joinGids.size) {
    for (const p of blob.parts || []) {
      if (!p.joinGroup || !joinGids.has(p.joinGroup)) continue;
      delete p.joinGroup;
      delete p.joinRole;
      if (p.name) p.name = String(p.name).replace(/\s·\s(main|inner|clipped)\s*$/i, "");
      n++;
    }
  }
  if (layerGids.size) {
    for (const p of blob.parts || []) {
      if (p.layerGroup && layerGids.has(p.layerGroup)) {
        delete p.layerGroup;
        n++;
      }
    }
    for (const z of blob.zones || []) {
      if (z.layerGroup && layerGids.has(z.layerGroup)) {
        delete z.layerGroup;
        n++;
      }
    }
  }
  return { state: next, selectIds: ids, message: `Ungrouped ${n} layer(s).`, ok: true };
}

export function applyClipJoin(state: LabelState, mainId: string, innerId: string): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Switch family to Composite first.");
  const { next, blob } = packed;
  const main = findPart(blob, mainId);
  const sub = findPart(blob, innerId);
  if (!main || !sub || main.id === sub.id) return fail(state, "Pick two shape layers.");
  const dPct = intersectPartsPathPct(main, sub);
  if (!dPct) {
    const ba = partBBoxPct(main);
    const bb = partBBoxPct(sub);
    const overlap =
      ba &&
      bb &&
      !(ba.R < bb.L - 1.2 || bb.R < ba.L - 1.2 || ba.B < bb.T - 1.2 || bb.B < ba.T - 1.2);
    if (!overlap) return fail(state, "No overlap — drag the inner shape fully onto the main shape.");
    return fail(state, "Clip failed — move the inner shape so its center sits inside the main shape.");
  }
  let box = pathPctBBox(dPct);
  if (!box || !(box.w > 0.2 && box.h > 0.2)) return fail(state, "Overlap too small to clip.");
  box = padPathBox(box, 0.12);
  const pathLocal = artboardPathToLocal(dPct, box);
  if (!pathLocal) return fail(state, "Clip failed.");
  const gid = genId("jg");
  main.joinGroup = gid;
  main.joinRole = "main";
  const mBase = String(main.name || main.type || "Shape").replace(/\s·\s(main|inner|clipped).*$/i, "");
  main.name = `${mBase} · main`;
  sub.type = "silhouette";
  sub.pathLocal = pathLocal;
  sub.x = box.L + box.w / 2;
  sub.y = box.T + box.h / 2;
  sub.w = box.w;
  sub.h = box.h;
  sub.rot = 0;
  sub.showImage = false;
  sub.lockAspect = false;
  sub.joinGroup = gid;
  sub.joinRole = "inner";
  sub.z = (Number(main.z) || 0) + 1;
  const baseName = String(sub.name || sub.type || "Shape").replace(/\s·\s(main|inner|clipped).*$/i, "");
  sub.name = `${baseName} · inner`;
  blob.cutSourceIds = [main.id];
  blob.cutZoneId = null;
  recomputeUnion(blob);
  return {
    state: next,
    selectIds: [main.id, sub.id],
    message: "Trimmed — main border + clipped inner (own colors).",
    ok: true,
  };
}

function setCutToGroup(blob: CompositeBlob, gid: string) {
  const g = layersInLayerGroup(blob, gid);
  if (!g.parts.length && !g.zones.length) return false;
  blob.cutGroupId = gid;
  blob.cutZoneId = null;
  blob.cutSourceIds = g.parts.length ? g.parts.map((p) => p.id) : null;
  blob.unionPath = unionPathFromPartsAndZones(g.parts, g.zones);
  return true;
}

export function setCutToSelected(state: LabelState, ids: string[]): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Switch family to Composite first.");
  const { next, blob } = packed;
  const gid = selectedLayerGroupId(blob, ids);
  if (gid) {
    setCutToGroup(blob, gid);
    const g = layersInLayerGroup(blob, gid);
    return {
      state: next,
      selectIds: ids,
      message: `Cut = group (${g.parts.length + g.zones.length} layers).`,
      ok: true,
    };
  }
  const { partIds, zoneIds } = splitSelection(blob, ids);
  if (partIds.length + zoneIds.length >= 2) {
    const grouped = groupSelectedLayers(next, ids, { silent: true });
    if (!grouped.ok) return grouped;
    const gBlob = grouped.state._composite!;
    const newGid = selectedLayerGroupId(gBlob, ids);
    if (newGid && setCutToGroup(gBlob, newGid)) {
      return {
        state: grouped.state,
        selectIds: ids,
        message: `Cut = group (${partIds.length + zoneIds.length} layers).`,
        ok: true,
      };
    }
  }
  if (!partIds.length && zoneIds[0]) {
    const z = findZone(blob, zoneIds[0]);
    if (!z) return fail(state, "Select a shape layer first.");
    blob.cutSourceIds = null;
    blob.cutGroupId = null;
    blob.cutZoneId = z.id;
    blob.unionPath = zoneOutlinePathPct(z);
    return { state: next, selectIds: ids, message: `Cut = ${z.label || z.kind || "zone"}.`, ok: true };
  }
  if (!partIds.length) return fail(state, "Select layers, then Cut = selected.");
  const parts = partIds.map((id) => findPart(blob, id)).filter((p): p is CompositePart => Boolean(p));
  if (!parts.length) return fail(state, "Select a shape layer first.");
  blob.cutZoneId = null;
  blob.cutGroupId = null;
  blob.cutSourceIds = partIds.slice();
  blob.unionPath = unionPathFromPartsList(parts);
  const label = parts.length === 1 ? parts[0].name || parts[0].type || "layer" : `${parts.length} layers`;
  return { state: next, selectIds: ids, message: `Cut = ${label}.`, ok: true };
}

function cutOutlineZones(blob: CompositeBlob, explicitIds?: string[]) {
  if (explicitIds?.length) {
    return explicitIds.map((id) => findZone(blob, id)).filter((z): z is CompositeZone => Boolean(z) && isCutOutlineZone(z));
  }
  return (blob.zones || []).filter(isCutOutlineZone);
}

function collectWholeCutSources(blob: CompositeBlob) {
  return {
    partIds: (blob.parts || []).map((p) => p.id),
    zoneIds: cutOutlineZones(blob).map((z) => z.id),
  };
}

function buildCutPreviewPath(
  blob: CompositeBlob,
  src: { mode: string; partIds: string[]; zoneIds: string[]; groupId?: string | null; includeOuterIcons?: boolean },
) {
  if (src.mode === "group" && src.groupId) {
    const g = layersInLayerGroup(blob, src.groupId);
    const extraIcons = cutOutlineZones(blob).filter((z) => !z.layerGroup || z.layerGroup !== src.groupId);
    return unionPathFromPartsAndZones(g.parts, g.zones.concat(extraIcons));
  }
  if (src.mode === "selection" || src.mode === "all") {
    const parts = src.partIds.map((id) => findPart(blob, id)).filter((p): p is CompositePart => Boolean(p));
    const zones = src.zoneIds.map((id) => findZone(blob, id)).filter((z): z is CompositeZone => Boolean(z));
    if (src.includeOuterIcons !== false) {
      for (const z of cutOutlineZones(blob)) {
        if (zones.every((zz) => zz.id !== z.id)) zones.push(z);
      }
    }
    if (parts.length || zones.length) return unionPathFromPartsAndZones(parts, zones);
  }
  return "";
}

export function previewWholeCut(state: LabelState, ids: string[]): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Switch family to Composite first.");
  const { next, blob } = packed;
  const { partIds, zoneIds } = splitSelection(blob, ids);
  const gid = selectedLayerGroupId(blob, ids);
  const src = {
    mode: "all",
    partIds: [] as string[],
    zoneIds: [] as string[],
    groupId: null as string | null,
    includeOuterIcons: true,
  };
  if (gid) {
    src.mode = "group";
    src.groupId = gid;
    const g0 = layersInLayerGroup(blob, gid);
    src.partIds = g0.parts.map((p) => p.id);
    src.zoneIds = g0.zones.map((z) => z.id);
  } else if (partIds.length + zoneIds.length >= 1) {
    src.mode = "selection";
    src.partIds = partIds;
    src.zoneIds = zoneIds.slice();
    if (!zoneIds.length) {
      for (const z of cutOutlineZones(blob)) src.zoneIds.push(z.id);
    }
  } else {
    const whole = collectWholeCutSources(blob);
    src.partIds = whole.partIds;
    src.zoneIds = whole.zoneIds;
  }
  const path = buildCutPreviewPath(blob, src);
  if (!path) return fail(state, "No shape/icon border to detect — add shapes or icons first.");
  const resolved = new Set(src.zoneIds);
  for (const z of cutOutlineZones(blob)) resolved.add(z.id);
  src.zoneIds = [...resolved];
  const prev = snapshotCut(blob);
  blob.unionPath = path;
  const nIcons = src.zoneIds.length;
  const label =
    src.mode === "group" ? "group + outer icons" : `${src.partIds.length} shape(s) · ${nIcons} icon(s)`;
  return {
    state: next,
    selectIds: ids,
    message: `Preview cut · ${label} — tap Approve cut.`,
    ok: true,
    preview: {
      path,
      partIds: src.partIds.slice(),
      zoneIds: src.zoneIds.slice(),
      groupId: src.groupId,
      prev,
    },
  };
}

function commitCutFromPartsAndZones(blob: CompositeBlob, partIds: string[], zoneIds: string[]) {
  const parts = partIds.map((id) => findPart(blob, id)).filter((p): p is CompositePart => Boolean(p));
  const zones = zoneIds.map((id) => findZone(blob, id)).filter((z): z is CompositeZone => Boolean(z));
  if (!parts.length && !zones.length) return false;
  if (parts.length + zones.length >= 2) {
    const gid = genId("lg");
    for (const p of parts) p.layerGroup = gid;
    for (const z of zones) z.layerGroup = gid;
    return setCutToGroup(blob, gid);
  }
  if (!parts.length && zones[0]) {
    blob.cutSourceIds = null;
    blob.cutGroupId = null;
    blob.cutZoneId = zones[0].id;
    blob.unionPath = zoneOutlinePathPct(zones[0]);
    return true;
  }
  blob.cutZoneId = null;
  blob.cutGroupId = null;
  blob.cutSourceIds = partIds.slice();
  blob.unionPath = unionPathFromPartsList(parts);
  return true;
}

export function approveCutPreview(state: LabelState, preview: CutPreview): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Switch family to Composite first.");
  const { next, blob } = packed;
  if (!commitCutFromPartsAndZones(blob, preview.partIds, preview.zoneIds)) {
    return fail(state, "Could not approve that cut.");
  }
  return { state: next, selectIds: preview.partIds, message: "Cut approved.", ok: true, preview: null };
}

export function cancelCutPreview(state: LabelState, preview: CutPreview): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Nothing to cancel.");
  const { next, blob } = packed;
  restoreCut(blob, preview.prev);
  return { state: next, selectIds: [], message: "Cut preview cancelled.", ok: true, preview: null };
}

export function removePart(state: LabelState, id: string): StudioOp {
  const packed = withBlob(state);
  if (!packed) return fail(state, "Nothing to remove.");
  const { next, blob } = packed;
  if (!findPart(blob, id)) return fail(state, "That is not a shape.");
  if ((blob.parts || []).length <= 1) return fail(state, "Keep at least one shape.");
  blob.parts = blob.parts!.filter((p) => p.id !== id);
  if (blob.cutSourceIds) {
    blob.cutSourceIds = blob.cutSourceIds.filter((x) => x !== id);
    if (!blob.cutSourceIds.length) blob.cutSourceIds = null;
  }
  recomputeUnion(blob);
  return { state: next, selectIds: [], message: "Shape removed.", ok: true };
}

export function syncCutPath(state: LabelState): LabelState {
  const packed = withBlob(state);
  if (!packed) return state;
  const { next, blob } = packed;
  if (blob.parts?.length || blob.cutGroupId || blob.cutZoneId || blob.unionPath) recomputeUnion(blob);
  return next;
}
