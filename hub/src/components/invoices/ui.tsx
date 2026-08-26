"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs text-[var(--bb-muted)]">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`bb-glass-input w-full px-3 text-[var(--bb-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-gold)] ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`bb-glass-input w-full px-3 py-2 text-[var(--bb-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-gold)] ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`bb-glass-input w-full px-3 text-[var(--bb-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-gold)] ${props.className ?? ""}`}
    />
  );
}

export function ActionBtn({
  children,
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost" | "danger";
}) {
  const styles =
    tone === "danger"
      ? "border border-[var(--bb-bad)] text-[var(--bb-bad)]"
      : tone === "ghost"
        ? "border border-[var(--bb-line)] text-[var(--bb-text)]"
        : "border border-[var(--bb-btn)] bg-[var(--bb-btn)] text-[var(--bb-btn-text)]";
  return (
    <button
      type="button"
      {...props}
      data-tone={tone}
      className={`bb-btn inline-flex items-center justify-center rounded-[var(--bb-radius)] text-sm disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--bb-radius)] border border-dashed border-[var(--bb-line)] px-4 py-8 text-center text-sm text-[var(--bb-muted)]">
      {children}
    </p>
  );
}

export function Accordion({
  title,
  hint,
  children,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bb-glass overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bb-pressable flex w-full items-center gap-3 px-4 py-3 text-start"
      >
        <span className="font-label min-w-0 flex-1 text-[11px] tracking-[0.16em] text-[var(--bb-gold)] uppercase">
          {title}
        </span>
        {hint ? (
          <span className="shrink-0 text-xs font-normal tracking-normal text-[var(--bb-muted)] normal-case">
            {hint}
          </span>
        ) : null}
        <span
          className={`text-sm text-[var(--bb-gold)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      <div className={`border-t border-[var(--bb-line)]/50 ${open ? "block" : "hidden"}`}>
        <div className="p-4">{children}</div>
      </div>
    </section>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  closeLabel = "إغلاق",
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[color-mix(in_srgb,var(--bb-title)_62%,transparent)] p-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-0 flex w-full flex-col overflow-hidden rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-[var(--bb-panel)] shadow-[0_18px_48px_color-mix(in_srgb,var(--bb-title)_28%,transparent)] sm:my-auto ${
          wide
            ? "max-h-[min(92dvh,52rem)] max-w-4xl"
            : "max-h-[min(88dvh,40rem)] max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--bb-line)]/60 px-4 py-3">
          <h2 className="text-base text-[var(--bb-title)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="bb-btn min-h-11 rounded-full px-3 text-sm"
            data-tone="ghost"
          >
            {closeLabel}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap gap-2 border-t border-[var(--bb-line)]/60 p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
