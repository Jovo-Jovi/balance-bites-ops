import { CloudStore } from "@/lib/cloud-store";
import { isStatusWriteKey, type BbKey } from "@/lib/keys";

export function writeStatusKey(key: BbKey, value: unknown) {
  if (!isStatusWriteKey(key)) {
    return Promise.reject(
      new Error(
        `Weekly status does not write ${key} — invoices and stock stay with their apps`,
      ),
    );
  }
  return CloudStore.set(key, value);
}
