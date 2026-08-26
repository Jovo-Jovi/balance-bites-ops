"use client";

import { useState, type ReactNode } from "react";
import { fmt, fmtQty } from "@/lib/finance/helpers";
import type { UnmatchedInvoiceLine } from "@/lib/finance/recipe-match";

export function SectionChips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.id)}
            className={`bb-btn rounded-full text-sm ${
              selected
                ? "border border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                : "bb-glass"
            }`}
            data-tone={selected ? undefined : "ghost"}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
  formula,
  brief,
  size = "md",
  quiet = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "bad" | "warn";
  formula?: string;
  brief?: { label: string; value: string }[];
  size?: "md" | "lg";
  /** Faded estimate — value sits transparent in the glass card. */
  quiet?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const color =
    tone === "ok"
      ? "text-[var(--bb-ok)]"
      : tone === "bad"
        ? "text-[var(--bb-bad)]"
        : tone === "warn"
          ? "text-[var(--bb-warn)]"
          : "text-[var(--bb-title)]";
  const title = [formula, hint].filter(Boolean).join(" — ");
  const expandable = !!(formula || (brief && brief.length));
  return (
    <button
      type="button"
      className="bb-glass bb-pressable w-full p-3 text-start"
      style={
        quiet
          ? {
              background: "color-mix(in srgb, var(--bb-panel) 18%, transparent)",
              boxShadow: "none",
            }
          : undefined
      }
      title={title || undefined}
      onClick={() => expandable && setOpen((v) => !v)}
    >
      <p className="text-[10px] tracking-[0.14em] text-[var(--bb-muted)] uppercase">{label}</p>
      <p
        className={`mt-1 ${size === "lg" ? "text-2xl sm:text-3xl" : "text-xl"} ${quiet ? "text-[var(--bb-title)] opacity-40" : color}`}
        dir="ltr"
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--bb-muted)]">{hint}</p> : null}
      {expandable ? (
        <p className="mt-1 text-[10px] text-[var(--bb-gold)]">{open ? "إخفاء التفصيل" : "اضغط للتفصيل"}</p>
      ) : null}
      {open ? (
        <div className="mt-3 border-t border-[var(--bb-line)]/50 pt-3 text-xs text-[var(--bb-muted)]">
          {formula ? <p className="mb-2">{formula}</p> : null}
          {brief?.length ? (
            <dl className="space-y-1">
              {brief.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt>{row.label}</dt>
                  <dd dir="ltr">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

export function MixBar({
  label,
  segments,
}: {
  label: string;
  segments: { key: string; label: string; value: number; fill: string }[];
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const title = segments.map((s) => `${s.label} ${fmt(s.value)} EGP`).join(" · ");
  return (
    <div className="bb-glass bb-pressable p-3" title={title}>
      <p className="text-[10px] tracking-[0.14em] text-[var(--bb-muted)] uppercase">{label}</p>
      <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--bb-gold)_12%,transparent)]">
        {segments.map((s) => {
          const pct = total > 0.009 ? (Math.max(0, s.value) / total) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={s.key}
              className="h-full"
              style={{ width: `${pct}%`, background: s.fill }}
              title={`${s.label} ${fmt(s.value)} EGP · ${pct.toFixed(0)}%`}
            />
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--bb-muted)]">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2 rounded-full" style={{ background: s.fill }} />
            {s.label} {fmt(s.value)}
          </span>
        ))}
      </p>
    </div>
  );
}

export function ColumnChart({
  label,
  items,
}: {
  label: string;
  items: { key: string; label: string; value: number; fill: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="bb-glass p-4">
      <p className="text-[10px] tracking-[0.14em] text-[var(--bb-muted)] uppercase">{label}</p>
      <div className="mt-4 flex h-44 items-end gap-3">
        {items.map((i) => {
          const h = Math.max(4, (Math.abs(i.value) / max) * 100);
          const negative = i.value < -0.009;
          return (
            <div key={i.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className={`text-[11px] ${negative ? "text-[var(--bb-bad)]" : "text-[var(--bb-title)]"}`} dir="ltr">
                {fmt(i.value)}
              </span>
              <div
                className="w-full max-w-14 rounded-t-md"
                style={{ height: `${h}%`, background: i.fill, opacity: negative ? 0.7 : 1 }}
                title={`${i.label} ${fmt(i.value)} EGP`}
              />
              <span className="text-center text-[10px] leading-tight text-[var(--bb-muted)]">{i.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UnmatchedLinesHint({ lines }: { lines: UnmatchedInvoiceLine[] }) {
  if (!lines.length) return null;
  const sample = lines.slice(0, 6);
  return (
    <div className="rounded-[var(--bb-radius)] border border-[var(--bb-warn)]/40 bg-[color-mix(in_srgb,var(--bb-warn)_8%,var(--bb-panel))] p-3 text-sm">
      <p className="text-[var(--bb-warn)]">
        {lines.length} سطر فاتورة بلا وصفة (المطابقة بالاسم إن لم يوجد productId)
      </p>
      <ul className="mt-2 space-y-1 text-xs text-[var(--bb-muted)]">
        {sample.map((l) => (
          <li key={`${l.invoiceId}-${l.name}-${l.qty}`}>
            {l.name} × {fmtQty(l.qty)}
            {l.invoiceNumber ? ` · ${l.invoiceNumber}` : ""}
            {l.customerName ? ` · ${l.customerName}` : ""}
          </li>
        ))}
      </ul>
      {lines.length > sample.length ? (
        <p className="mt-1 text-xs text-[var(--bb-muted)]">و {lines.length - sample.length} أخرى</p>
      ) : null}
    </div>
  );
}

export function plWord(n: number) {
  return n >= -0.009 ? "ربح" : "خسارة";
}

export function plTone(n: number): "ok" | "bad" {
  return n >= -0.009 ? "ok" : "bad";
}

export const thClass =
  "p-2 text-start text-[10px] tracking-[0.12em] text-[var(--bb-muted)]";
export const tdClass = "border-t border-[var(--bb-line)]/50 p-2 align-middle";

export function FinanceTable({
  children,
  minWidth = "42rem",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}
