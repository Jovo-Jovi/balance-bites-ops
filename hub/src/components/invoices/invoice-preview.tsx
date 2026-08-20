"use client";

import { useMemo } from "react";
import { todayISO } from "@/lib/invoices/helpers";
import { resolvePrintTheme } from "@/lib/invoices/look";
import { buildInvoicePrintHtml } from "@/lib/invoices/print-layout";
import type { InvoiceLine } from "@/lib/invoices/types";
import { useInvoiceApp } from "./invoice-context";

const SAMPLE_LINES: InvoiceLine[] = [
  {
    productId: null,
    name: "عينة · Sample A",
    packType: "Jar",
    weight: "200g",
    categoryId: null,
    qty: 2,
    price: 85,
  },
  {
    productId: null,
    name: "عينة · Sample B",
    packType: "Pouch",
    weight: "100g",
    categoryId: null,
    qty: 1,
    price: 45,
  },
];

export function InvoicePreview() {
  const app = useInvoiceApp();
  const liveItems = app.draft.items.filter((it) => String(it.name || "").trim());
  const sample = liveItems.length === 0;
  const html = useMemo(
    () =>
      buildInvoicePrintHtml({
        draft: {
          ...app.draft,
          customerName: app.draft.customerName || "عميل تجريبي",
          invoiceNumber: app.draft.invoiceNumber || "BB-000",
          date: app.draft.date || todayISO(),
          discount: sample ? 0 : app.draft.discount,
        },
        items: sample ? SAMPLE_LINES : liveItems,
        theme: resolvePrintTheme(app.printLook, app.theme, app.presets),
        strings: app.strings,
        mode: "original",
        returns: app.returns,
        invoices: app.invoices,
        pageSize: app.pageSize,
        margins: app.margins,
        fitOne: app.fitOne,
        autoPrint: false,
      }),
    [
      app.draft,
      app.fitOne,
      app.invoices,
      app.margins,
      app.pageSize,
      app.presets,
      app.printLook,
      app.returns,
      app.strings,
      app.theme,
      liveItems,
      sample,
    ],
  );

  return (
    <section className="bb-glass overflow-hidden p-3">
      <h2 className="mb-2 text-sm text-[var(--bb-muted)]">معاينة الفاتورة</h2>
      <p className="mb-3 text-xs text-[var(--bb-muted)]">
        قالب Invoice Pro: نسيج قطري ذهبي، ترويسة BB، وحجم الصفحة
        {sample ? " · أصناف تجريبية حتى تُضاف بنود" : ""}
      </p>
      <iframe
        title="معاينة الفاتورة"
        srcDoc={html}
        sandbox="allow-scripts"
        className="h-[min(78vh,920px)] w-full rounded-[10px] border-0 bg-[var(--bb-panel)] shadow-[0_8px_28px_rgba(0,0,0,.18)]"
      />
    </section>
  );
}
