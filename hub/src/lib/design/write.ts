import { CloudStore } from "@/lib/cloud-store";
import { isDesignWriteKey, type BbKey } from "@/lib/keys";

export function writeDesignKey(key: BbKey, value: unknown) {
  if (!isDesignWriteKey(key)) {
    return Promise.reject(
      new Error(`Design does not write ${key} — catalog and stickers stay with Finance`),
    );
  }
  return CloudStore.set(key, value);
}

export function removeDesignKey(key: BbKey) {
  if (!isDesignWriteKey(key)) {
    return Promise.reject(
      new Error(`Design does not write ${key} — catalog and stickers stay with Finance`),
    );
  }
  return CloudStore.remove(key);
}
