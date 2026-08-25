"use client";

import type { ReactNode } from "react";
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
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "bad" | "warn";
  formula?: string;
}) {
  const color =
    tone === "ok"
      ? "text-[var(--bb-ok)]"
      : tone === "bad"
        ? "text-[var(--bb-bad)]"
        : tone === "warn"
          ? "text-[var(--bb-warn)]"
          : "text-[var(--bb-title)]";
  const title = [formula, hint].filter(Boolean).join(" — ");
  return (
    <div className="bb-glass bb-pressable p-3" title={title || undefined}>
      <p className="text-[10px] tracking-[0.14em] text-[var(--bb-muted)] uppercase">{label}</p>
      <p className={`mt-1 text-lg ${color}`} dir="ltr">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--bb-muted)]">{hint}</p> : null}
    </div>
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
      <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--bb-gold)_12%,transparent)]">
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
