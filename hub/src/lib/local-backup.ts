"use client";

import { CloudStore } from "./cloud-store";
import { zipStore } from "./zip-store";

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

/** Live Firestore `bb_*` docs as `{key}.json` — same shape as Desktop saved data. */
export async function downloadLocalBackup(): Promise<{
  filename: string;
  keys: string[];
}> {
  const rows = await CloudStore.exportExisting();
  if (!rows.length) {
    throw new Error("لا بيانات في السحابة للتحميل");
  }
  const files = rows.map(({ key, data }) => ({
    name: `${key}.json`,
    bytes: new TextEncoder().encode(`${JSON.stringify(data, null, 2)}\n`),
  }));
  const zip = zipStore(files);
  const filename = localBackupFileName();
  const bytes = new Uint8Array(zip.byteLength);
  bytes.set(zip);
  downloadBlob(
    new Blob([bytes.buffer as ArrayBuffer], { type: "application/zip" }),
    filename,
  );
  return { filename, keys: rows.map((r) => r.key) };
}
