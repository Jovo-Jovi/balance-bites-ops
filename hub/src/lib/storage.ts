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

export async function getLabelAssetUrl(objectKey: string): Promise<string> {
  assertStorageEnabled();
  const res = await fetch("/api/storage/sign", {
    method: "POST",
    headers: {
      ...(await authHeader()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key: objectKey }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as { url?: string };
  if (!body.url) throw new Error("تعذر إنشاء رابط التحميل");
  return body.url;
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

export async function deleteLabelAsset(objectKey: string): Promise<void> {
  assertStorageEnabled();
  const res = await fetch(
    `/api/storage/object?key=${encodeURIComponent(objectKey)}`,
    {
      method: "DELETE",
      headers: await authHeader(),
    },
  );
  if (!res.ok) throw new Error(await readError(res));
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
