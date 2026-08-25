"use client";

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
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "bad" | "warn";
}) {
  const color =
    tone === "ok"
      ? "text-[var(--bb-ok)]"
      : tone === "bad"
        ? "text-[var(--bb-bad)]"
        : tone === "warn"
          ? "text-[var(--bb-warn)]"
          : "text-[var(--bb-title)]";
  return (
    <div className="bb-glass p-3">
      <p className="text-[10px] tracking-[0.14em] text-[var(--bb-muted)] uppercase">{label}</p>
      <p className={`mt-1 text-lg ${color}`} dir="ltr">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--bb-muted)]">{hint}</p> : null}
    </div>
  );
}

export function plWord(n: number) {
  return n >= -0.009 ? "ربح" : "خسارة";
}

export function plTone(n: number): "ok" | "bad" {
  return n >= -0.009 ? "ok" : "bad";
}
