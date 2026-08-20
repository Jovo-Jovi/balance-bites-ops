"use client";

import { useMemo, useState } from "react";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, TextInput } from "./ui";
import {
  buildReport,
  filterInvoicesByDate,
  type ReportKind,
} from "@/lib/invoices/reports";

const TABS: { id: ReportKind; label: string }[] = [
  { id: "total", label: "الإجمالي" },
  { id: "customer", label: "عميل" },
  { id: "topProd", label: "أفضل منتج" },
  { id: "product", label: "منتج" },
];

export function ReportsTool() {
  const app = useInvoiceApp();
  const [kind, setKind] = useState<ReportKind>("total");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [sortBy, setSortBy] = useState<"qty" | "rev">("rev");

  const invoices = useMemo(
    () => filterInvoicesByDate(app.invoices, from, to),
    [app.invoices, from, to],
  );
  const customer = app.customers.find((c) => c.id === customerId);
  const view = useMemo(
    () =>
      buildReport({
        kind,
        invoices,
        returns: app.returns,
        products: app.products,
        strings: app.strings,
        customerId,
        customerName: customer?.name || "",
        productId,
        sortBy,
      }),
    [
      kind,
      invoices,
      app.returns,
      app.products,
      app.strings,
      customerId,
      customer?.name,
      productId,
      sortBy,
    ],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setKind(tab.id)}
            className={`bb-btn rounded-full text-sm ${
              kind === tab.id
                ? "border border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                : "bb-glass"
            }`}
            aria-pressed={kind === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-[var(--bb-muted)]">من</span>
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--bb-muted)]">إلى</span>
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {kind === "customer" ? (
          <select
            className="bb-glass-input px-3"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">-- كل العملاء --</option>
            {app.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null}
        {kind === "product" ? (
          <select
            className="bb-glass-input px-3"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">-- اختر منتج --</option>
            {app.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.split("·")[0].trim()}
              </option>
            ))}
          </select>
        ) : null}
        {kind === "topProd" ? (
          <select
            className="bb-glass-input px-3"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value === "qty" ? "qty" : "rev")}
          >
            <option value="qty">ترتيب بالكمية</option>
            <option value="rev">ترتيب بالإيراد</option>
          </select>
        ) : null}
        <ActionBtn
          tone="ghost"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          الكل
        </ActionBtn>
      </div>

      {view.empty ? (
        <Empty>{view.empty}</Empty>
      ) : (
        <>
          {view.title ? (
            <h2 className="text-lg text-[var(--bb-title)]">{view.title}</h2>
          ) : null}
          {view.stats.length ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {view.stats.map((s) => (
                <div key={s.label} className="bb-glass p-4">
                  <p className="text-xl text-[var(--bb-title)]">{s.value}</p>
                  <p className="text-xs text-[var(--bb-muted)]">{s.label}</p>
                </div>
              ))}
            </div>
          ) : null}
          {view.sections.map((section) => (
            <section key={section.title} className="bb-glass p-4">
              <h3 className="mb-3 text-sm text-[var(--bb-muted)]">{section.title}</h3>
              {section.bars ? (
                <BarList bars={section.bars} />
              ) : null}
              {section.table ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[var(--bb-muted)]">
                        {section.table.headers.map((h) => (
                          <th key={h} className="px-2 py-2 text-start font-normal">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, i) => (
                        <tr key={i} className="border-t border-[var(--bb-line)]/50">
                          {row.map((cell, j) => (
                            <td key={j} className="px-2 py-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function BarList({
  bars,
}: {
  bars: { label: string; value: number; display: string }[];
}) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  return (
    <ul className="flex flex-col gap-2">
      {bars.map((b) => (
        <li key={b.label} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2">
          <span className="truncate text-sm">{b.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bb-line)]">
            <div
              className="h-full bg-[var(--bb-gold)]"
              style={{ width: `${max > 0 ? Math.round((b.value / max) * 100) : 0}%` }}
            />
          </div>
          <span className="text-xs text-[var(--bb-muted)]">{b.display}</span>
        </li>
      ))}
    </ul>
  );
}
