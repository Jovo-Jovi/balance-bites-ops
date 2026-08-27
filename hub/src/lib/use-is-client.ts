import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** True after hydration. Safe to use `document` / portals. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
