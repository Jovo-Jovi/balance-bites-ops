import { TENANT_ID } from "./tenant";

export const LABEL_ASSETS_PREFIX = `tenants/${TENANT_ID}/label_assets/`;
export const BACKUPS_PREFIX = `tenants/${TENANT_ID}/bb_backups/`;

export const MAX_OBJECT_BYTES = 15 * 1024 * 1024;

export function isAllowedStorageKey(key: string) {
  const n = normalizeStorageKey(key);
  if (!n || n.includes("..") || n.length > 500) return false;
  return n.startsWith(LABEL_ASSETS_PREFIX) || n.startsWith(BACKUPS_PREFIX);
}

export function normalizeStorageKey(key: string) {
  return String(key || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

export function labelAssetKey(templateId: string, fileName: string) {
  const id = sanitizeSegment(templateId);
  const name = sanitizeSegment(fileName);
  return `${LABEL_ASSETS_PREFIX}${id}/${name}`;
}

export function backupKey(fileName: string) {
  return `${BACKUPS_PREFIX}${sanitizeSegment(fileName)}`;
}

function sanitizeSegment(value: string) {
  const n = String(value || "")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .pop();
  if (!n || n === "." || n === "..") {
    throw new Error("اسم ملف غير صالح");
  }
  return n;
}
