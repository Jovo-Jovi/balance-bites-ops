"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { DesignProvider } from "./design-context";
import { DesignBusyOverlay } from "./design-busy";
import { LibraryTool } from "./library-tool";
import { AtelierTool } from "./atelier-tool";
import { PrintTool } from "./print-tool";

const LETTER_FONTS =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Baloo+2:wght@600;700;800&family=Nunito:wght@700;800;900&family=Bubblegum+Sans&family=Sniglet:wght@400;800&family=Bitter:ital,wght@0,400;0,700&family=Montserrat:wght@400;700;800&display=swap";

export function DesignApp({ tab }: { tab: string }) {
  const { storeReady, error } = useAuth();
  useEffect(() => {
    if (document.getElementById("bb-letter-fonts")) return;
    const link = document.createElement("link");
    link.id = "bb-letter-fonts";
    link.rel = "stylesheet";
    link.href = LETTER_FONTS;
    document.head.appendChild(link);
  }, []);
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
  return (
    <>
      <DesignBusyOverlay />
      {tab === "atelier" ? <AtelierTool /> : tab === "print" ? <PrintTool /> : <LibraryTool />}
    </>
  );
}
