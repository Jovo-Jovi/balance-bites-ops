"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useWorkspaceTab() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return useCallback(
    (tab: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("tab", tab);
      router.replace(`${pathname}?${next.toString()}`);
      window.scrollTo(0, 0);
    },
    [params, pathname, router],
  );
}
