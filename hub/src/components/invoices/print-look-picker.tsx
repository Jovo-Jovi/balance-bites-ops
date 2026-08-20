"use client";

import { useInvoiceApp } from "./invoice-context";

export function PrintLookPicker({ name }: { name: string }) {
  const app = useInvoiceApp();
  const C = app.theme;
  const looks = [
    { id: "__inv2__", label: "المظهر القديم" },
    ...app.presets.map((p) => ({ id: p.id, label: p.name })),
    { id: "__hub__", label: "مظهر التطبيق" },
  ];
  const selectedId = looks.some((look) => look.id === app.printLook)
    ? app.printLook
    : "__inv2__";

  function rowClass(selected: boolean) {
    return `bb-glass flex cursor-pointer items-start gap-3 p-3 ${
      selected ? "ring-2 ring-[var(--bb-gold)] bg-[color-mix(in_srgb,var(--bb-gold)_10%,var(--bb-panel))]" : ""
    }`;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--bb-muted)]">
        المظهر المحفوظ يُستخدم عند الطباعة المباشرة من السجل. إن لم يُحفظ اختيار،
        يُستخدم المظهر القديم.
      </p>
      <label className="block text-sm text-[var(--bb-muted)]">
        المظهر المحدد
        <select
          value={selectedId}
          onChange={(e) => app.setPrintLook(e.target.value)}
          className="bb-glass-input mt-1 w-full px-3 py-2 text-[var(--bb-text)] outline-none"
        >
          {looks.map((look) => (
            <option key={look.id} value={look.id}>
              {look.label}
            </option>
          ))}
        </select>
      </label>
      <label className={rowClass(selectedId === "__inv2__")}>
        <input
          type="radio"
          name={name}
          checked={selectedId === "__inv2__"}
          onChange={() => app.setPrintLook("__inv2__")}
          className="mt-1 size-4 shrink-0 accent-[var(--bb-gold)]"
        />
        <span>
          <span className="mb-1 flex gap-1">
            <i className="inline-block h-4 w-4 rounded-sm" style={{ background: C.bg }} />
            <i className="inline-block h-4 w-8 rounded-sm" style={{ background: C.gold }} />
            <i className="inline-block h-4 w-4 rounded-sm" style={{ background: C.txt }} />
          </span>
          <span className="block text-[var(--bb-title)]">المظهر القديم</span>
          <span className="text-xs text-[var(--bb-muted)]">
            Invoice Pro المحفوظ: أبيض وأخضر (bb_inv2)
          </span>
        </span>
      </label>
      {app.presets.map((p) => (
        <label key={p.id} className={rowClass(selectedId === p.id)}>
          <input
            type="radio"
            name={name}
            checked={selectedId === p.id}
            onChange={() => app.setPrintLook(p.id)}
            className="mt-1 size-4 shrink-0 accent-[var(--bb-gold)]"
          />
          <span>
            <span className="mb-1 flex gap-1">
              <i className="inline-block h-4 w-4 rounded-sm" style={{ background: p.bg }} />
              <i className="inline-block h-4 w-8 rounded-sm" style={{ background: p.gold }} />
              <i className="inline-block h-4 w-4 rounded-sm" style={{ background: p.txt }} />
            </span>
            <span className="block text-[var(--bb-title)]">{p.name}</span>
            {p.id === "cp_1782722748850" || p.name === "green" ? (
              <span className="text-xs text-[var(--bb-muted)]">البريسيت المستخدم حالياً</span>
            ) : null}
          </span>
        </label>
      ))}
      <label className={rowClass(selectedId === "__hub__")}>
        <input
          type="radio"
          name={name}
          checked={selectedId === "__hub__"}
          onChange={() => app.setPrintLook("__hub__")}
          className="mt-1 size-4 shrink-0 accent-[var(--bb-gold)]"
        />
        <span>
          <span className="block text-[var(--bb-title)]">مظهر التطبيق</span>
          <span className="text-xs text-[var(--bb-muted)]">
            كتان الويب: حبر على ورق وتمييز بالأخضر المزرق
          </span>
        </span>
      </label>
    </div>
  );
}
