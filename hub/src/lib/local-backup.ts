"use client";

import { CloudStore } from "./cloud-store";
import { isStorageEnabled } from "./firebase-config";
import {
  LABEL_ASSETS_PREFIX,
  normalizeStorageKey,
  parseLabelAssetKey,
} from "./storage-paths";
import { zipStore, type ZipFile } from "./zip-store";

export function localBackupFileName(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `bb-saved-data-${y}-${m}-${d}.zip`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function zipPathForAsset(objectKey: string): string | null {
  const parsed = parseLabelAssetKey(objectKey);
  if (parsed) return `label_assets/${parsed.templateId}/${parsed.fileName}`;
  const n = normalizeStorageKey(objectKey);
  if (!n.startsWith(LABEL_ASSETS_PREFIX)) return null;
  const rest = n.slice(LABEL_ASSETS_PREFIX.length);
  if (!rest || rest.endsWith("/")) return null;
  return `label_assets/${rest}`;
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  if (!items.length) return;
  let i = 0;
  const n = Math.min(limit, items.length);
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (;;) {
        const idx = i++;
        if (idx >= items.length) return;
        await fn(items[idx]);
      }
    }),
  );
}

async function collectLabelAssets(): Promise<ZipFile[]> {
  if (!isStorageEnabled()) {
    throw new Error("التخزين السحابي غير مفعّل — لا يمكن تنزيل صور الملصقات");
  }
  const { listLabelAssets, getLabelAssetUrls } = await import("./storage");
  const items = (await listLabelAssets(2000)).filter(
    (it) => it.key && !it.key.endsWith("/") && it.size > 0,
  );
  const out: ZipFile[] = [];
  const CHUNK = 40;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = items.slice(i, i + CHUNK);
    const urls = await getLabelAssetUrls(batch.map((it) => it.key));
    await pool(batch, 6, async (item) => {
      const path = zipPathForAsset(item.key);
      const url = urls[item.key];
      if (!path || !url) {
        throw new Error(`تعذر تجهيز ملف الملصق: ${item.key}`);
      }
      const res = await fetch(url, { mode: "cors", credentials: "omit" });
      if (!res.ok) {
        throw new Error(`تعذر تنزيل ${path}`);
      }
      out.push({ name: path, bytes: new Uint8Array(await res.arrayBuffer()) });
    });
  }
  return out;
}

/** Live Firestore `bb_*` docs + R2 `label_assets/` when storage is on. */
export async function downloadLocalBackup(): Promise<{
  filename: string;
  keys: string[];
  assets: number;
  assetsSkipped: boolean;
}> {
  const rows = await CloudStore.exportExisting();
  const assetsSkipped = !isStorageEnabled();
  const assets = isStorageEnabled() ? await collectLabelAssets() : [];
  if (!rows.length && !assets.length) {
    throw new Error("لا بيانات في السحابة للتحميل");
  }
  const files: ZipFile[] = [
    ...rows.map(({ key, data }) => ({
      name: `${key}.json`,
      bytes: new TextEncoder().encode(`${JSON.stringify(data, null, 2)}\n`),
    })),
    ...assets,
  ];
  const zip = zipStore(files);
  const filename = localBackupFileName();
  downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), filename);
  return { filename, keys: rows.map((r) => r.key), assets: assets.length, assetsSkipped };
}
