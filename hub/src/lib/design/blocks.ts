import { genId } from "@/lib/invoices/helpers";
import type { DesignBlock, DesignBlockField, LabelState } from "./types";

export type { DesignBlock, DesignBlockField };

export const BLOCK_LAYER_PREFIX = "__fam:blk:";
export const RECIPE_KEYS = ["1", "2", "3", "4", "5", "6"] as const;

export function isRecipeKey(k: string) {
  return RECIPE_KEYS.includes(k as (typeof RECIPE_KEYS)[number]);
}

export function blockLayerId(id: string) {
  return `${BLOCK_LAYER_PREFIX}${id}`;
}

export function parseBlockLayerId(layerId: string) {
  return layerId.startsWith(BLOCK_LAYER_PREFIX) ? layerId.slice(BLOCK_LAYER_PREFIX.length) : "";
}

function asField(raw: unknown): DesignBlockField | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id || "").trim() || genId("f");
  return {
    id,
    label: String(r.label || "Line"),
    en: String(r.en || ""),
    ar: String(r.ar || ""),
  };
}

function asBlock(raw: unknown): DesignBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id || "").trim();
  if (!id || isRecipeKey(id)) return null;
  const fields = Array.isArray(r.fields) ? r.fields.map(asField).filter((f): f is DesignBlockField => Boolean(f)) : [];
  const width = Number(r.widthPct);
  return {
    id,
    title: String(r.title || "Section"),
    fields: fields.length ? fields : [{ id: genId("f"), label: "Line", en: "", ar: "" }],
    widthPct: Number.isFinite(width) && width > 0 ? width : 20,
  };
}

export function listBlocks(state: LabelState): DesignBlock[] {
  const raw = state._blocks;
  if (!Array.isArray(raw)) return [];
  return raw.map(asBlock).filter((b): b is DesignBlock => Boolean(b));
}

export function findBlock(state: LabelState, id: string) {
  return listBlocks(state).find((b) => b.id === id) || null;
}

export function sectionOrder(state: LabelState) {
  const raw = String(state.eSecOrd || "1,2,3,4,5,6")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const order: string[] = [];
  for (const k of raw) {
    if (!seen.has(k)) {
      seen.add(k);
      order.push(k);
    }
  }
  for (const k of RECIPE_KEYS) {
    if (!seen.has(k)) {
      seen.add(k);
      order.push(k);
    }
  }
  for (const b of listBlocks(state)) {
    if (!seen.has(b.id)) order.push(b.id);
  }
  return order;
}

export function addNamedBlock(state: LabelState, title = "Section"): { state: LabelState; selectId: string } {
  const id = genId("u");
  const block: DesignBlock = {
    id,
    title: title.trim() || "Section",
    fields: [{ id: genId("f"), label: "Line", en: "", ar: "" }],
    widthPct: 20,
  };
  const order = sectionOrder(state);
  if (!order.includes(id)) order.push(id);
  return {
    state: { ...state, _blocks: [...listBlocks(state), block], eSecOrd: order.join(",") },
    selectId: blockLayerId(id),
  };
}

export function removeNamedBlock(state: LabelState, id: string): LabelState {
  const next = listBlocks(state).filter((b) => b.id !== id);
  const order = sectionOrder(state).filter((k) => k !== id);
  return { ...state, _blocks: next, eSecOrd: order.join(",") };
}

export function patchNamedBlock(
  state: LabelState,
  id: string,
  patch: { title?: string; widthPct?: number; fields?: DesignBlockField[] },
): LabelState {
  const next = listBlocks(state).map((b) => {
    if (b.id !== id) return b;
    const width = patch.widthPct;
    return {
      ...b,
      ...patch,
      widthPct:
        width != null && Number.isFinite(width) && width > 0 ? Math.min(80, Math.max(4, width)) : b.widthPct,
    };
  });
  return { ...state, _blocks: next };
}

export function addBlockField(state: LabelState, blockId: string): LabelState {
  const block = findBlock(state, blockId);
  if (!block) return state;
  return patchNamedBlock(state, blockId, {
    fields: [...block.fields, { id: genId("f"), label: "Line", en: "", ar: "" }],
  });
}

export function removeBlockField(state: LabelState, blockId: string, fieldId: string): LabelState {
  const block = findBlock(state, blockId);
  if (!block) return state;
  const fields = block.fields.filter((f) => f.id !== fieldId);
  return patchNamedBlock(state, blockId, {
    fields: fields.length ? fields : [{ id: genId("f"), label: "Line", en: "", ar: "" }],
  });
}

export function patchBlockField(
  state: LabelState,
  blockId: string,
  fieldId: string,
  patch: Partial<Pick<DesignBlockField, "label" | "en" | "ar">>,
): LabelState {
  const block = findBlock(state, blockId);
  if (!block) return state;
  return patchNamedBlock(state, blockId, {
    fields: block.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
  });
}

export function setBlockFirstEn(state: LabelState, blockId: string, en: string): LabelState {
  const block = findBlock(state, blockId);
  if (!block?.fields[0]) return state;
  return patchBlockField(state, blockId, block.fields[0].id, { en });
}
