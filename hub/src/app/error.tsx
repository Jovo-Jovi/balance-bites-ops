"use client";

import { DiamondMark } from "@/components/diamond-mark";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bb-shell flex flex-col items-center justify-center gap-4">
      <DiamondMark size={28} />
      <p className="font-brand text-[clamp(1.5rem,6vw,1.75rem)] text-[var(--bb-title)]">
        Balance Bites
      </p>
      <p className="max-w-md text-center break-words text-[var(--bb-bad)]">
        حدث خطأ. أعد المحاولة.
        {error.digest ? (
          <span className="mt-1 block font-mono text-xs text-[var(--bb-muted)]" dir="ltr">
            {error.digest}
          </span>
        ) : null}
      </p>
      {process.env.NODE_ENV !== "production" ? (
        <p className="max-w-md text-center break-words text-xs text-[var(--bb-muted)]" dir="ltr">
          {error.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="bb-btn rounded-[var(--bb-radius)] border border-[var(--bb-gold)] bg-[var(--bb-btn)] text-[var(--bb-btn-text)] hover:bg-[var(--bb-btn-hover)] hover:text-[var(--bb-btn-hover-text)]"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
