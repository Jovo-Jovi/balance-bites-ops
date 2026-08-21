import { isStorageEnabled } from "@/lib/firebase-config";
import { getLabelAssetUrl, uploadLabelAsset } from "@/lib/storage";
import { labelAssetKey } from "@/lib/storage-paths";
import {
  assetFieldName,
  cloneState,
  isAssetRef,
  isInlineAsset,
  toAssetRef,
} from "./templates";
import type { CompositeBlob, CompositePart, CompositeZone, LabelState } from "./types";

type WithSrc = { id?: string; src?: string; srcUrl?: string };

async function putTextAsset(templateId: string, field: string, value: string) {
  const blob = new Blob([value], { type: "text/plain" });
  await uploadLabelAsset(templateId, `${field}.txt`, blob);
  return toAssetRef(field);
}

async function readTextAsset(templateId: string, field: string) {
  const url = await getLabelAssetUrl(labelAssetKey(templateId, `${field}.txt`));
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

function isFatDataUrl(value: unknown) {
  return typeof value === "string" && value.startsWith("data:") && value.length > 400;
}

function placeholderizeSrc(item: WithSrc, prefix: string) {
  if (!isFatDataUrl(item.src) && !isFatDataUrl(item.srcUrl)) return;
  const field = `${prefix}_${String(item.id || "x")}`;
  if (isFatDataUrl(item.src)) item.src = toAssetRef(field);
  if (isFatDataUrl(item.srcUrl)) item.srcUrl = toAssetRef(field);
}

async function stripSrc(templateId: string, item: WithSrc, prefix: string) {
  const src = item.src || item.srcUrl || "";
  if (!isFatDataUrl(src)) return;
  const field = `${prefix}_${String(item.id || "x")}`;
  try {
    const ref = await putTextAsset(templateId, field, src);
    if (item.src) item.src = ref;
    if (item.srcUrl) item.srcUrl = ref;
  } catch {
    placeholderizeSrc(item, prefix);
  }
}

async function hydrateSrc(templateId: string, item: WithSrc) {
  for (const key of ["src", "srcUrl"] as const) {
    const v = item[key];
    if (!isAssetRef(v)) continue;
    try {
      const data = await readTextAsset(templateId, assetFieldName(v));
      if (data) item[key] = data;
    } catch {
      /* keep placeholder — R2 may be off */
    }
  }
}

async function stripComposite(templateId: string, comp: CompositeBlob, upload: boolean) {
  const next = JSON.parse(JSON.stringify(comp)) as CompositeBlob;
  for (const part of next.parts || []) {
    if (upload) await stripSrc(templateId, part as CompositePart, "comp_p");
    else placeholderizeSrc(part as CompositePart, "comp_p");
  }
  for (const zone of next.zones || []) {
    if (upload) await stripSrc(templateId, zone as CompositeZone, "comp_z");
    else placeholderizeSrc(zone as CompositeZone, "comp_z");
  }
  return next;
}

export async function stripStateAssets(templateId: string, state: LabelState): Promise<LabelState> {
  const out = cloneState(state);
  const upload = isStorageEnabled();
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (!isInlineAsset(key, value)) continue;
    if (!upload) {
      out[key] = toAssetRef(key);
      continue;
    }
    try {
      out[key] = await putTextAsset(templateId, key, String(value));
    } catch {
      out[key] = toAssetRef(key);
    }
  }
  if (out._composite) {
    out._composite = await stripComposite(templateId, out._composite, upload);
  }
  return out;
}

export async function hydrateStateAssets(
  templateId: string,
  state: LabelState,
): Promise<LabelState> {
  const out = cloneState(state);
  if (!isStorageEnabled()) return out;
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (!isAssetRef(value)) continue;
    try {
      const data = await readTextAsset(templateId, assetFieldName(value));
      if (data) out[key] = data;
    } catch {
      /* keep placeholder */
    }
  }
  if (out._composite) {
    const next = JSON.parse(JSON.stringify(out._composite)) as CompositeBlob;
    for (const part of next.parts || []) await hydrateSrc(templateId, part);
    for (const zone of next.zones || []) await hydrateSrc(templateId, zone);
    out._composite = next;
  }
  return out;
}

export function hasUnresolvedAssets(state: LabelState) {
  for (const value of Object.values(state)) {
    if (isAssetRef(value)) return true;
  }
  const comp = state._composite;
  if (!comp) return false;
  const items = [...(comp.parts || []), ...(comp.zones || [])];
  return items.some((item) => isAssetRef(item.src) || isAssetRef(item.srcUrl));
}
