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

export function labelAssetFolder(templateId: string) {
  return `${LABEL_ASSETS_PREFIX}${sanitizeSegment(templateId)}/`;
}

export function labelAssetKey(templateId: string, fileName: string) {
  return `${labelAssetFolder(templateId)}${sanitizeSegment(fileName)}`;
}

export function parseLabelAssetKey(key: string) {
  const n = normalizeStorageKey(key);
  if (!n.startsWith(LABEL_ASSETS_PREFIX)) return null;
  const rest = n.slice(LABEL_ASSETS_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash < 1) return null;
  return { templateId: rest.slice(0, slash), fileName: rest.slice(slash + 1) };
}

export function isBinaryImageKey(key: string) {
  return /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(normalizeStorageKey(key));
}

export function backupKey(fileName: string) {
  return `${BACKUPS_PREFIX}${sanitizeSegment(fileName)}`;
}

export function sanitizeSegment(value: string) {
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
