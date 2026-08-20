"use client";

import { useState } from "react";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, Field, TextInput } from "./ui";
import { InvoicePreview } from "./invoice-preview";
import { PrintLookPicker } from "./print-look-picker";

export function LookTool() {
  const app = useInvoiceApp();
  const [name, setName] = useState("");
  const C = app.theme;
  const S = app.strings;

  return (
    <div className="flex flex-col-reverse gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(300px,42%)] xl:items-start">
      <div className="flex flex-col gap-6">
      <p className="text-sm text-[var(--bb-muted)]">
        مظهر الطباعة فقط — شاشة العمل تبقى بثيم المركز. لا نكتب بريسيتات افتراضية إذا كانت
        القائمة فارغة.
      </p>
      <section className="bb-glass p-4">
        <h2 className="mb-3 text-sm text-[var(--bb-muted)]">بريسيتات محفوظة</h2>
        {app.presets.length === 0 ? (
          <Empty>لا يوجد بريسيت — احفظ مظهرك الحالي بعد ضبط الألوان</Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {app.presets.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-[var(--bb-radius)] border border-[var(--bb-line)] p-3">
                <button
                  type="button"
                  onClick={() => app.applyPreset(p.id)}
                  className="min-w-0 flex-1 text-start"
                >
                  <span className="mb-1 flex gap-1">
                    <i className="inline-block h-4 w-4" style={{ background: p.bg }} />
                    <i className="inline-block h-4 flex-1" style={{ background: p.gold }} />
                    <i className="inline-block h-4 w-4" style={{ background: p.txt }} />
                  </span>
                  <span className="text-sm">
                    {p.name}
                    {app.activePresetId === p.id ? " · مفعّل" : ""}
                  </span>
                </button>
                <ActionBtn
                  tone="danger"
                  onClick={() => {
                    if (window.confirm("حذف هذا البريسيت؟")) app.removePreset(p.id);
                  }}
                >
                  حذف
                </ActionBtn>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم البريسيت..."
          />
          <ActionBtn
            onClick={() => {
              app.savePreset(name);
              setName("");
            }}
          >
            حفظ المظهر الحالي
          </ActionBtn>
        </div>
      </section>

      <section className="bb-glass grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorField label="الخلفية" value={C.bg} onChange={(v) => app.setTheme({ bg: v })} />
        <ColorField label="الذهبي / التمييز" value={C.gold} onChange={(v) => app.setTheme({ gold: v })} />
        <ColorField label="النص" value={C.txt} onChange={(v) => app.setTheme({ txt: v })} />
        <ColorField label="الخافت" value={C.mut} onChange={(v) => app.setTheme({ mut: v })} />
        <ColorField label="صف" value={C.row} onChange={(v) => app.setTheme({ row: v })} />
        <ColorField label="المجاميع" value={C.tot} onChange={(v) => app.setTheme({ tot: v })} />
        <ColorField label="الإجمالي" value={C.grand} onChange={(v) => app.setTheme({ grand: v })} />
      </section>

      <section className="bb-glass grid gap-3 p-4 sm:grid-cols-2">
        <Field label="اختصار العلامة">
          <TextInput value={S.mono} onChange={(e) => app.setStrings({ mono: e.target.value })} />
        </Field>
        <Field label="الاسم">
          <TextInput value={S.brand} onChange={(e) => app.setStrings({ brand: e.target.value })} />
        </Field>
        <Field label="عنوان المستند">
          <TextInput
            value={S.docTitle}
            onChange={(e) => app.setStrings({ docTitle: e.target.value })}
          />
        </Field>
        <Field label="الموقع">
          <TextInput value={S.web} onChange={(e) => app.setStrings({ web: e.target.value })} />
        </Field>
        <Field label="العملة">
          <TextInput value={S.cur} onChange={(e) => app.setStrings({ cur: e.target.value })} />
        </Field>
        <Field label="تذييل">
          <TextInput
            value={S.footNote}
            onChange={(e) => app.setStrings({ footNote: e.target.value })}
          />
        </Field>
      </section>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={app.fitOne}
          onChange={(e) => app.setFitOne(e.target.checked)}
        />
        ملاءمة الفاتورة في صفحة واحدة عند الطباعة
      </label>

      <fieldset className="bb-glass p-4">
        <legend className="px-1 text-sm text-[var(--bb-muted)]">مظهر الطباعة الافتراضي</legend>
        <PrintLookPicker name="look-print" />
      </fieldset>

      <ActionBtn onClick={app.persistLook}>حفظ إعدادات الطباعة</ActionBtn>
      </div>
      <div className="xl:sticky xl:top-4">
        <InvoicePreview />
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 cursor-pointer rounded-[var(--bb-radius)] border border-[var(--bb-line)] bg-transparent"
        />
        <TextInput dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}
