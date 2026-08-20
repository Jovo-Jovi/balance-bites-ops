"use client";

import { useAuth } from "@/components/auth-provider";
import { InvoiceProvider } from "./invoice-context";
import { EditorTool } from "./editor-tool";
import { CustomersTool } from "./customers-tool";
import { CatalogTool } from "./catalog-tool";
import { QueueTool } from "./queue-tool";
import { HistoryTool } from "./history-tool";
import { ReportsTool } from "./reports-tool";
import { LookTool } from "./look-tool";

export function InvoiceApp({ tab }: { tab: string }) {
  const { storeReady, error } = useAuth();
  if (!storeReady) {
    return (
      <p className="py-16 text-center text-[var(--bb-muted)]">
        {error || "جاري مزامنة البيانات من السحابة…"}
      </p>
    );
  }
  return (
    <InvoiceProvider>
      <InvoicePanel tab={tab} />
    </InvoiceProvider>
  );
}

function InvoicePanel({ tab }: { tab: string }) {
  switch (tab) {
    case "customers":
      return <CustomersTool />;
    case "catalog":
      return <CatalogTool />;
    case "queue":
      return <QueueTool />;
    case "history":
      return <HistoryTool />;
    case "reports":
      return <ReportsTool />;
    case "look":
      return <LookTool />;
    default:
      return <EditorTool />;
  }
}
