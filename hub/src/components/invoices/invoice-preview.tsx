"use client";

import type { ReactNode } from "react";
import { calcTotals, fmt, todayISO } from "@/lib/invoices/helpers";
import { hexA, resolvePrintTheme } from "@/lib/invoices/look";
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
  const C = resolvePrintTheme(app.printLook, app.theme, app.presets);
  const S = app.strings;
  const liveItems = app.draft.items.filter((it) => String(it.name || "").trim());
  const sample = liveItems.length === 0;
  const items = sample ? SAMPLE_LINES : liveItems;
  const discount = sample ? 0 : app.draft.discount;
  const totals = calcTotals(items, discount);

  return (
    <section className="bb-glass overflow-hidden p-3">
      <h2 className="mb-2 text-sm text-[var(--bb-muted)]">معاينة الفاتورة</h2>
      <p className="mb-3 text-xs text-[var(--bb-muted)]">
        تتحدّث مع الألوان والنصوص ومظهر الطباعة المختار
        {sample ? " · أصناف تجريبية حتى تُضاف بنود في الفاتورة" : ""}
      </p>
      <div
        className="overflow-x-auto rounded-[10px] shadow-[0_8px_28px_rgba(0,0,0,.18)]"
        style={{ background: C.bg, color: C.txt }}
      >
        <article
          dir="rtl"
          className="mx-auto w-full min-w-[280px] max-w-[720px] px-5 py-6 sm:px-8 sm:py-8"
          style={{ background: C.bg, color: C.txt }}
        >
          <div className="mb-2.5 flex items-center gap-2.5">
            <i className="h-px flex-1 opacity-55" style={{ background: C.gold }} />
            <b
              className="h-2 w-2 shrink-0"
              style={{ background: C.gold, transform: "rotate(45deg)" }}
            />
            <i className="h-px flex-1 opacity-55" style={{ background: C.gold }} />
          </div>
          <div
            className="font-label text-center text-[10px] tracking-[5px]"
            style={{ color: C.gold }}
          >
            {S.mono}
          </div>
          <div className="font-brand text-center text-[clamp(1.5rem,4vw,2rem)] leading-tight">
            {S.brand}
          </div>
          <div
            className="font-label mt-2 text-center text-[11px] tracking-[3px] uppercase"
            style={{ color: C.mut }}
          >
            {S.docTitle}
          </div>

          <div
            className="my-5 grid grid-cols-2 gap-x-6 gap-y-3 p-3.5 text-sm"
            style={{
              background: C.row,
              border: `1px solid ${hexA(C.gold, 0.25)}`,
            }}
          >
            <Meta label="اسم العميل" value={app.draft.customerName || "عميل تجريبي"} mut={C.mut} />
            <Meta label="رقم الفاتورة" value={app.draft.invoiceNumber || "BB-000"} mut={C.mut} />
            <Meta label="التاريخ" value={app.draft.date || todayISO()} mut={C.mut} />
            <Meta
              label="التليفون"
              value={app.draft.customerPhone || "—"}
              mut={C.mut}
              ltr
            />
          </div>

          <table className="w-full border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr style={{ background: hexA(C.gold, 0.08) }}>
                <Th mut={C.mut} line={hexA(C.txt, 0.1)}>
                  {S.hItem}
                </Th>
                <Th mut={C.mut} line={hexA(C.txt, 0.1)} className="text-center">
                  {S.hQty}
                </Th>
                <Th mut={C.mut} line={hexA(C.txt, 0.1)}>
                  {S.hPrice}
                </Th>
                <Th mut={C.mut} line={hexA(C.txt, 0.1)}>
                  {S.hSub}
                </Th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const line = (it.qty || 0) * (it.price || 0);
                const meta = [it.packType, it.weight].filter(Boolean).join(" · ");
                return (
                  <tr key={`${it.name}-${i}`}>
                    <Td line={hexA(C.txt, 0.1)}>
                      <div className="font-bold">{it.name}</div>
                      {meta ? (
                        <div className="mt-0.5 text-[10px]" style={{ color: C.mut }}>
                          {meta}
                        </div>
                      ) : null}
                    </Td>
                    <Td line={hexA(C.txt, 0.1)} className="text-center">
                      {fmt(it.qty)}
                    </Td>
                    <Td line={hexA(C.txt, 0.1)} className="whitespace-nowrap text-start" ltr>
                      {fmt(it.price)} {S.cur}
                    </Td>
                    <Td line={hexA(C.txt, 0.1)} className="whitespace-nowrap text-start" ltr>
                      {fmt(line)} {S.cur}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div
            className="ms-auto mt-4 w-full max-w-[320px] px-4 py-3"
            style={{
              background: C.tot,
              border: `1px solid ${hexA(C.gold, 0.25)}`,
            }}
          >
            <Tot label={S.lSubtotal} value={`${fmt(totals.subtotal)} ${S.cur}`} />
            {totals.discount ? (
              <Tot
                label={S.discLabel}
                value={`− ${fmt(totals.discountAmount)} ${S.cur} (${totals.discount}%)`}
              />
            ) : null}
            <div
              className="font-brand mt-1.5 flex justify-between gap-3 border-t pt-2.5 text-lg"
              style={{ borderColor: C.gold, background: C.grand }}
            >
              <span>{S.lTotal}</span>
              <span dir="ltr">
                {fmt(totals.total)} {S.cur}
              </span>
            </div>
          </div>

          <div className="mt-7 text-center text-[11px]" style={{ color: C.mut }}>
            {S.footNote}
            {S.web ? (
            <div className="mt-1.5" style={{ color: C.gold, fontFamily: "var(--font-dm), sans-serif" }}>
                {S.web}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}

function Meta({
  label,
  value,
  mut,
  ltr,
}: {
  label: string;
  value: string;
  mut: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <span className="mb-1 block text-[10px] tracking-wide" style={{ color: mut }}>
        {label}
      </span>
      <div dir={ltr ? "ltr" : undefined}>{value}</div>
    </div>
  );
}

function Th({
  children,
  mut,
  line,
  className = "",
}: {
  children: ReactNode;
  mut: string;
  line: string;
  className?: string;
}) {
  return (
    <th
      className={`font-label px-2 py-2.5 text-right text-[9px] tracking-[1.5px] uppercase ${className}`}
      style={{ color: mut, borderBottom: `1px solid ${line}` }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  line,
  className = "",
  ltr,
}: {
  children: ReactNode;
  line: string;
  className?: string;
  ltr?: boolean;
}) {
  return (
    <td
      className={`px-2 py-2.5 text-right ${className}`}
      dir={ltr ? "ltr" : undefined}
      style={{ borderBottom: `1px solid ${line}` }}
    >
      {children}
    </td>
  );
}

function Tot({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-[13px]">
      <span>{label}</span>
      <span dir="ltr">{value}</span>
    </div>
  );
}
