"use client";

import { useInvoiceApp } from "./invoice-context";

export function PrintLookPicker({ name }: { name: string }) {
  const app = useInvoiceApp();
  const C = app.theme;
  return (
    <div className="flex flex-col gap-2">
      <label className="bb-glass flex cursor-pointer items-start gap-3 p-3">
        <input
          type="radio"
          name={name}
          checked={app.printLook === "__inv2__"}
          onChange={() => app.setPrintLook("__inv2__")}
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
        <label key={p.id} className="bb-glass flex cursor-pointer items-start gap-3 p-3">
          <input
            type="radio"
            name={name}
            checked={app.printLook === p.id}
            onChange={() => app.setPrintLook(p.id)}
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
      <label className="bb-glass flex cursor-pointer items-start gap-3 p-3">
        <input
          type="radio"
          name={name}
          checked={app.printLook === "__hub__"}
          onChange={() => app.setPrintLook("__hub__")}
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
