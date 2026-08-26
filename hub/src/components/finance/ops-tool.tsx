"use client";

import { useState } from "react";
import { ActionBtn, Empty, Field, Modal, Select, TextArea, TextInput } from "@/components/invoices/ui";
import { fmt, OP_CATEGORIES, todayISO } from "@/lib/finance/helpers";
import { backupFileName } from "@/lib/finance/backups";
import { getLabelAssetUrl } from "@/lib/storage";
import type { OpCost } from "@/lib/finance/types";
import { useFinanceApp } from "./finance-context";
import { SectionChips } from "./section-chips";

const SECTIONS = [
  { id: "opex", label: "تشغيل" },
  { id: "backups", label: "نسخ احتياطية" },
] as const;

export function OpsTool() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("opex");
  return (
    <div className="flex flex-col gap-4">
      <SectionChips items={[...SECTIONS]} value={section} onChange={setSection} />
      {section === "opex" ? <Opex /> : <Backups />}
    </div>
  );
}

function Opex() {
  const app = useFinanceApp();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<OpCost | null>(null);
  const [date, setDate] = useState(todayISO());
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof OP_CATEGORIES)[number]>("أخرى");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const total = app.opCosts.reduce((s, o) => s + (o.amount || 0), 0);

  function start(rec?: OpCost) {
    setEdit(rec || null);
    setDate(rec?.date || todayISO());
    setName(rec?.name || "");
    setCategory((rec?.category as (typeof OP_CATEGORIES)[number]) || "أخرى");
    setAmount(rec ? String(rec.amount) : "");
    setNotes(rec?.notes || "");
    setOpen(true);
  }

  return (
    <>
      <p className="text-sm text-[var(--bb-muted)]">
        تعويض يجوز أن يكون سالباً. الإيجار والأجور وغيرها تُطرح من الربح.
      </p>
      <ActionBtn onClick={() => start()}>تكلفة تشغيل</ActionBtn>
      <p className="text-sm" dir="ltr">
        الإجمالي {fmt(total)} EGP
      </p>
      {app.opCosts.length === 0 ? (
        <Empty>لا تكاليف تشغيل</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {app.opCosts.map((o) => (
            <li key={o.id} className="bb-glass flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--bb-title)]">{o.name}</p>
                <p className="text-xs text-[var(--bb-muted)]">
                  {o.date} · {o.category}
                </p>
              </div>
              <span dir="ltr" className={o.amount < 0 ? "text-[var(--bb-ok)]" : ""}>
                {fmt(o.amount)} EGP
              </span>
              <ActionBtn tone="ghost" onClick={() => start(o)}>
                تعديل
              </ActionBtn>
              <ActionBtn tone="danger" onClick={() => app.removeOpCost(o.id)}>
                حذف
              </ActionBtn>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        title="تكلفة تشغيل"
        onClose={() => setOpen(false)}
        footer={
          <>
            <ActionBtn
              onClick={() => {
                if (!name.trim()) return;
                app.saveOpCost({
                  id: edit?.id,
                  date,
                  name: name.trim(),
                  category,
                  amount: parseFloat(amount) || 0,
                  notes,
                });
                setOpen(false);
              }}
            >
              حفظ
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </ActionBtn>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="التاريخ">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="الاسم">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="التصنيف">
            <Select value={category} onChange={(e) => setCategory(e.target.value as (typeof OP_CATEGORIES)[number])}>
              {OP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="المبلغ (سالب مسموح للتعويض)">
            <TextInput type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="ملاحظات">
            <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

function Backups() {
  const app = useFinanceApp();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSnap(id: string) {
    const { listBackups } = await import("@/lib/storage");
    const items = await listBackups();
    const hit =
      items.find((it) => it.key.endsWith(`/${backupFileName(id)}`)) ||
      items.find((it) => it.key.includes(id));
    if (!hit) throw new Error("الملف غير موجود على R2");
    const url = await getLabelAssetUrl(hit.key);
    const res = await fetch(url);
    if (!res.ok) throw new Error("تعذر تنزيل النقطة");
    return res.json();
  }

  return (
    <>
      <p className="text-sm text-[var(--bb-muted)]">
        النسخ تُحفظ على Cloudflare R2 في bb_backups/. فهرس الأسماء في Firestore. النسخ المحلية للمتصفح تبقى خارج السحابة.
        الاستعادة تكتب المفاتيح الموجودة في الملف فقط — بلا قوائم فارغة.
      </p>
      <div className="flex flex-wrap gap-2">
        <TextInput
          className="max-w-xs"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="اسم النقطة..."
        />
        <ActionBtn
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void app.createNamedBackup(label).finally(() => setBusy(false));
          }}
        >
          حفظ نسخة
        </ActionBtn>
      </div>
      {app.backupIndex.length === 0 ? (
        <Empty>لا نقاط محفوظة في الفهرس</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {app.backupIndex.map((b) => (
            <li key={b.id} className="bb-glass flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--bb-title)]">{b.label}</p>
                <p className="text-xs text-[var(--bb-muted)]">{b.createdAt}</p>
              </div>
              <ActionBtn
                tone="ghost"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void app.restoreNamedBackup(b.id, loadSnap).finally(() => setBusy(false));
                }}
              >
                استعادة
              </ActionBtn>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
