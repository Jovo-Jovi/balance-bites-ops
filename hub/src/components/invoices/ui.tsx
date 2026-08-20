"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

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
        : "bg-[var(--bb-btn)] text-[var(--bb-btn-text)]";
  return (
    <button
      type="button"
      {...props}
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

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[color-mix(in_srgb,var(--bb-title)_35%,transparent)] p-3 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bb-glass flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--bb-line)]/60 px-4 py-3">
          <h2 className="text-base text-[var(--bb-title)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="bb-btn min-h-11 rounded-full px-3 text-sm"
          >
            إغلاق
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap gap-2 border-t border-[var(--bb-line)]/60 p-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
