"use client";

import { useAuth } from "@/components/auth-provider";
import { FinanceProvider } from "./finance-context";
import { FinanceBusyOverlay } from "./finance-busy";
import { OverviewTool } from "./overview-tool";
import { InvoicesTool } from "./invoices-tool";
import { StockTool } from "./stock-tool";
import { FlowTool } from "./flow-tool";
import { PurchasesTool } from "./purchases-tool";
import { RecipesTool } from "./recipes-tool";
import { ReturnsTool } from "./returns-tool";
import { OpsTool } from "./ops-tool";

export function FinanceApp({ tab }: { tab: string }) {
  const { storeReady, error } = useAuth();
  if (!storeReady) {
    return (
      <p className="py-16 text-center text-[var(--bb-muted)]">
        {error || "جاري مزامنة البيانات من السحابة…"}
      </p>
    );
  }
  return (
    <FinanceProvider>
      <FinancePanel tab={tab} />
    </FinanceProvider>
  );
}

function FinancePanel({ tab }: { tab: string }) {
  const body =
    tab === "invoices" ? (
      <InvoicesTool />
    ) : tab === "stock" ? (
      <StockTool />
    ) : tab === "flow" ? (
      <FlowTool />
    ) : tab === "purchases" ? (
      <PurchasesTool />
    ) : tab === "recipes" ? (
      <RecipesTool />
    ) : tab === "returns" ? (
      <ReturnsTool />
    ) : tab === "ops" ? (
      <OpsTool />
    ) : (
      <OverviewTool />
    );
  return (
    <>
      <FinanceBusyOverlay />
      {body}
    </>
  );
}
