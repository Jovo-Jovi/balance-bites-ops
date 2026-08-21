"use client";

import { useAuth } from "@/components/auth-provider";
import { DesignProvider } from "./design-context";
import { LibraryTool } from "./library-tool";
import { AtelierTool } from "./atelier-tool";
import { PrintTool } from "./print-tool";

export function DesignApp({ tab }: { tab: string }) {
  const { storeReady, error } = useAuth();
  if (!storeReady) {
    return (
      <p className="py-16 text-center text-[var(--bb-muted)]">
        {error || "Syncing templates from the cloud…"}
      </p>
    );
  }
  return (
    <DesignProvider>
      <DesignPanel tab={tab} />
    </DesignProvider>
  );
}

function DesignPanel({ tab }: { tab: string }) {
  if (tab === "atelier") return <AtelierTool />;
  if (tab === "print") return <PrintTool />;
  return <LibraryTool />;
}
