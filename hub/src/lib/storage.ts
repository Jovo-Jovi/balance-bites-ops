"use client";

import { getFirebaseAuth } from "./firebase";
import { isStorageEnabled } from "./firebase-config";
import { backupKey, labelAssetKey } from "./storage-paths";

async function authHeader() {
  const user = getFirebaseAuth().currentUser;
  const token = await user?.getIdToken();
  if (!token) {
    throw new Error("سجّل الدخول قبل استخدام التخزين السحابي");
  }
  return { Authorization: `Bearer ${token}` };
}

export async function staffAuthHeader() {
  return authHeader();
}

async function readError(res: Response) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export function assertStorageEnabled() {
  if (!isStorageEnabled()) {
    throw new Error(
      "التخزين السحابي غير مفعّل — أضف مفاتيح Cloudflare R2 ثم اضبط NEXT_PUBLIC_BB_USE_STORAGE=true",
    );
  }
}

const signMemo = new Map<string, { url: string; exp: number }>();

export async function getLabelAssetUrls(objectKeys: string[]): Promise<Record<string, string>> {
  assertStorageEnabled();
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of objectKeys) {
    if (!key) continue;
    const hit = signMemo.get(key);
    if (hit && hit.exp > now) out[key] = hit.url;
    else missing.push(key);
  }
  const CHUNK = 40;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    const res = await fetch("/api/storage/sign", {
      method: "POST",
      headers: {
        ...(await authHeader()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys: chunk }),
    });
    if (!res.ok) throw new Error(await readError(res));
    const body = (await res.json()) as { urls?: Record<string, string>; url?: string };
    const urls =
      body.urls && Object.keys(body.urls).length
        ? body.urls
        : body.url && chunk[0]
          ? { [chunk[0]]: body.url }
          : {};
    for (const [key, url] of Object.entries(urls)) {
      if (!url) continue;
      signMemo.set(key, { url, exp: now + 14 * 60 * 1000 });
      out[key] = url;
    }
  }
  return out;
}

export async function getLabelAssetUrl(objectKey: string): Promise<string> {
  const urls = await getLabelAssetUrls([objectKey]);
  const url = urls[objectKey];
  if (!url) throw new Error("تعذر إنشاء رابط التحميل");
  return url;
}

export async function uploadLabelAsset(
  templateId: string,
  fileName: string,
  file: Blob,
): Promise<string> {
  assertStorageEnabled();
  const key = labelAssetKey(templateId, fileName);
  const form = new FormData();
  form.set("key", key);
  form.set("file", file, fileName);
  const res = await fetch("/api/storage/object", {
    method: "POST",
    headers: await authHeader(),
    body: form,
  });
  if (!res.ok) throw new Error(await readError(res));
  return key;
}

export type LabelAssetItem = { key: string; size: number; url?: string };

export async function listLabelAssets(): Promise<LabelAssetItem[]> {
  assertStorageEnabled();
  const res = await fetch("/api/storage/list", {
    method: "GET",
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { items?: LabelAssetItem[] };
  return body.items || [];
}

export async function listBackups(): Promise<LabelAssetItem[]> {
  assertStorageEnabled();
  const res = await fetch("/api/storage/list?kind=backups", {
    method: "GET",
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { items?: LabelAssetItem[] };
  return body.items || [];
}

export async function deleteLabelAssetFolder(templateId: string): Promise<number> {
  assertStorageEnabled();
  const res = await fetch(
    `/api/storage/object?templateId=${encodeURIComponent(templateId)}`,
    {
      method: "DELETE",
      headers: await authHeader(),
    },
  );
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { removed?: number };
  return Number(body.removed || 0);
}

export async function uploadBackupJson(
  fileName: string,
  json: string,
): Promise<string> {
  assertStorageEnabled();
  const key = backupKey(fileName);
  const form = new FormData();
  form.set("key", key);
  form.set(
    "file",
    new Blob([json], { type: "application/json" }),
    fileName,
  );
  const res = await fetch("/api/storage/object", {
    method: "POST",
    headers: await authHeader(),
    body: form,
  });
  if (!res.ok) throw new Error(await readError(res));
  return key;
}
