"use client";

import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";
import { useDesignApp } from "./design-context";

export function DesignBusyOverlay() {
  const app = useDesignApp();
  const mounted = useIsClient();
  if (!mounted || !app.busy) return null;
  const label = app.busyMessage || "Working…";
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[color-mix(in_srgb,var(--bb-title)_38%,transparent)]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-1.5 w-full shrink-0 overflow-hidden bg-[var(--bb-line)]">
        <div className="bb-busy-bar" />
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="bb-glass max-w-sm rounded-[var(--bb-radius)] px-5 py-4 text-center shadow-lg">
          <p className="text-sm font-medium text-[var(--bb-title)]">{label}</p>
          <p className="mt-1 text-xs text-[var(--bb-muted)]">This can take a few seconds.</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
