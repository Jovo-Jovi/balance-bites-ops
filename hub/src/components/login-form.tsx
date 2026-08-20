"use client";

import { FormEvent, useState } from "react";
import { DiamondMark } from "./diamond-mark";
import { useAuth } from "./auth-provider";

export function LoginForm() {
  const { signInEmail, signInGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signInEmail(email.trim(), password);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "فشل الدخول");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setMessage(null);
    try {
      await signInGoogle();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "فشل دخول جوجل");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bb-shell flex flex-col items-center justify-center">
      <span className="sm:hidden">
        <DiamondMark size={28} />
      </span>
      <span className="hidden sm:inline-block">
        <DiamondMark size={36} />
      </span>
      <h1 className="font-brand mt-6 text-[clamp(1.75rem,8vw,3rem)] tracking-tight text-[var(--bb-title)] sm:mt-10">
        Balance Bites
      </h1>
      <p className="font-label mt-2 text-[10px] tracking-[0.22em] text-[var(--bb-muted)] uppercase sm:mt-3 sm:text-[11px] sm:tracking-[0.28em]">
        Operations
      </p>
      <form
        onSubmit={onSubmit}
        className="bb-glass mt-8 w-full max-w-sm space-y-4 p-4 sm:mt-12 sm:p-6"
        autoComplete="on"
      >
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--bb-muted)]">
            البريد
          </span>
          <input
            type="email"
            name="email"
            required
            dir="ltr"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bb-glass-input w-full px-3 py-2 text-[var(--bb-text)] outline-none focus:border-[var(--bb-gold)] focus:ring-1 focus:ring-[var(--bb-gold)]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--bb-muted)]">
            كلمة المرور
          </span>
          <input
            type="password"
            name="password"
            required
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bb-glass-input w-full px-3 py-2 text-[var(--bb-text)] outline-none focus:border-[var(--bb-gold)] focus:ring-1 focus:ring-[var(--bb-gold)]"
          />
        </label>
        {message ? (
          <p className="text-sm text-[var(--bb-bad)]" role="alert">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="bb-btn w-full rounded-[var(--bb-radius)] border border-[var(--bb-gold)] bg-[var(--bb-btn)] text-lg text-[var(--bb-btn-text)] hover:bg-[var(--bb-btn-hover)] hover:text-[var(--bb-btn-hover-text)] disabled:opacity-50"
        >
          دخول
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onGoogle}
          className="bb-btn w-full rounded-[var(--bb-radius)] border border-[var(--bb-line)] text-sm text-[var(--bb-muted)] hover:border-[var(--bb-gold)] hover:text-[var(--bb-gold)] disabled:opacity-50"
        >
          دخول بجوجل (اختياري)
        </button>
      </form>
    </div>
  );
}
