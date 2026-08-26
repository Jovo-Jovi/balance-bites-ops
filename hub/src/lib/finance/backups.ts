import { CloudStore } from "@/lib/cloud-store";
import { BB_KEYS, isBbKey, type BbKey } from "@/lib/keys";

const SKIP_RESTORE = new Set<string>(["bb_backup_locals"]);

export type BackupSnapshot = {
  id: string;
  createdAt: string;
  label: string;
  keys: string[];
  data: Record<string, unknown>;
};

/** Read live local cache only. Skip keys that were never stored (no empty dumps). */
export function collectBackupSnapshot(label: string): BackupSnapshot {
  const data: Record<string, unknown> = {};
  const keys: string[] = [];
  if (typeof window !== "undefined") {
    BB_KEYS.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw == null || raw === "") return;
        data[k] = JSON.parse(raw);
        keys.push(k);
      } catch {
        /* skip broken local key */
      }
    });
  }
  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    label: label || "نقطة حفظ",
    keys,
    data,
  };
}

export async function restoreBackupSnapshot(snap: BackupSnapshot) {
  const keys = snap.keys?.length ? snap.keys : Object.keys(snap.data || {});
  for (const k of keys) {
    if (SKIP_RESTORE.has(k) || !isBbKey(k)) continue;
    const val = snap.data[k];
    if (val == null) continue;
    await CloudStore.set(k as BbKey, val);
  }
}

export function backupFileName(id: string) {
  return `${id}.json`;
}
