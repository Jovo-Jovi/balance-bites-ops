"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCloudKey } from "@/hooks/use-cloud-key";
import { useToast } from "@/components/toast";
import { fireAndForget } from "@/lib/cloud-store";
import { asArray, asRecord } from "@/lib/invoices/helpers";
import type {
  Customer,
  Invoice,
  InvoicePayments,
  Product,
  ReturnRecord,
} from "@/lib/invoices/types";
import type {
  CustomerPayment,
  FinancePending,
  ProductionRun,
  Purchase,
  Recipe,
  StockItem,
} from "@/lib/finance/types";
import { parseChurchStatus } from "@/lib/status/parse";
import { downloadChurchReportXlsx, printChurchReport } from "@/lib/status/print";
import { buildChurchReport } from "@/lib/status/report";
import type { ChurchStatusDoc } from "@/lib/status/types";
import { writeStatusKey } from "@/lib/status/write";
import { StatusSheet, StatusToolbar } from "./status-sheet";

export function StatusApp() {
  const { storeReady, error, user } = useAuth();
  if (!storeReady) {
    return (
      <p className="py-16 text-center text-[var(--bb-muted)]">
        {error || "Syncing from the cloud…"}
      </p>
    );
  }
  return <StatusPanel email={user?.email || ""} />;
}

function StatusPanel({ email }: { email: string }) {
  const toast = useToast();
  const invoices = asArray<Invoice>(useCloudKey("bb_invoices"));
  const customers = asArray<Customer>(useCloudKey("bb_customers"));
  const returns = asArray<ReturnRecord>(useCloudKey("bb_returns"));
  const payments = asRecord<InvoicePayments>(useCloudKey("bb_invoice_payments"));
  const customerPayments = asArray<CustomerPayment>(useCloudKey("bb_customer_payments"));
  const pending = asArray<FinancePending>(useCloudKey("bb_pending_invoices"));
  const materials = asArray<StockItem>(useCloudKey("bb_materials"));
  const packages = asArray<StockItem>(useCloudKey("bb_packages"));
  const stickers = asArray<StockItem>(useCloudKey("bb_stickers"));
  const recipes = asArray<Recipe>(useCloudKey("bb_recipes"));
  const products = asArray<Product>(useCloudKey("bb_products"));
  const purchases = asArray<Purchase>(useCloudKey("bb_purchases"));
  const production = asArray<ProductionRun>(useCloudKey("bb_production"));
  const raw = useCloudKey<unknown>("bb_church_status");
  const saved = useMemo(() => parseChurchStatus(raw), [raw]);
  const [draft, setDraft] = useState<ChurchStatusDoc | null>(null);
  const doc = draft ?? saved;

  const fallbackName = email.includes("@") ? email.slice(0, email.indexOf("@")) : email;
  const report = useMemo(
    () =>
      buildChurchReport(
        {
          invoices,
          customers,
          returns,
          payments,
          customerPayments,
          pending,
          preparedByFallback: fallbackName,
          materials,
          packages,
          stickers,
          recipes,
          products,
          purchases,
          production,
        },
        doc,
      ),
    [
      invoices,
      customers,
      returns,
      payments,
      customerPayments,
      pending,
      doc,
      fallbackName,
      materials,
      packages,
      stickers,
      recipes,
      products,
      purchases,
      production,
    ],
  );

  function set(fn: (d: ChurchStatusDoc) => ChurchStatusDoc) {
    setDraft(fn(doc));
  }

  function save() {
    const next: ChurchStatusDoc = {
      ...doc,
      weekStart: report.weekStart,
      weekEnd: report.weekEnd,
      preparedBy: doc.preparedBy.trim() || fallbackName,
      managementFocus: doc.managementFocus.trim(),
    };
    setDraft(next);
    fireAndForget(
      writeStatusKey("bb_church_status", next).then(() => {
        toast.push("Weekly status saved", "ok");
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4" dir="ltr">
      <StatusToolbar
        report={report}
        doc={doc}
        fallbackName={fallbackName}
        onDoc={set}
        onSave={save}
        onPrint={() => printChurchReport(report)}
        onExcel={() => downloadChurchReportXlsx(report)}
      />
      <p className="text-sm text-[var(--bb-muted)]">
        KPIs and tables come from invoices, stock, purchases, production, and the
        pending queue. Notes, RAG overrides, and risks are yours to edit. Save writes{" "}
        <span dir="ltr">bb_church_status</span> only.
      </p>
      <StatusSheet report={report} doc={doc} onDoc={set} />
    </div>
  );
}
