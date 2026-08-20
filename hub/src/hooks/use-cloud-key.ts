"use client";

import { useEffect, useState } from "react";
import { CloudStore, subscribeCloudStore } from "@/lib/cloud-store";
import { EMPTY_DEFAULTS, type BbKey } from "@/lib/keys";

export function useCloudKey<T>(key: BbKey): T {
  const [value, setValue] = useState<T>(() =>
    CloudStore.get(key, EMPTY_DEFAULTS[key] as T),
  );

  useEffect(() => {
    return subscribeCloudStore((changed) => {
      if (changed === key) {
        setValue(CloudStore.get(key, EMPTY_DEFAULTS[key] as T));
      }
    });
  }, [key]);

  return value;
}
