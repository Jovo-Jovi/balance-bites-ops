"use client";

import { useMemo, useState } from "react";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, Field, Modal, TextInput } from "./ui";
import type { Customer } from "@/lib/invoices/types";

const emptyForm = {
  id: "",
  name: "",
  phone: "",
  address: "",
  notes: "",
};

export function CustomersTool() {
  const app = useInvoiceApp();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [note, setNote] = useState("");
  const [cols, setCols] = useState({
    includeInvDate: true,
    includeInvVal: true,
    includePayStatus: true,
    includePendingList: true,
  });

  const visible = useMemo(() => {
    const query = q.toLowerCase();
    return app.customers.filter(
      (c) =>
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.phone || "").includes(query),
    );
  }, [app.customers, q]);

  const selectedIds = Object.entries(selected)
    .filter(([, on]) => on)
    .map(([id]) => id);

  function openForm(c?: Customer) {
    setForm(
      c
        ? {
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address,
            notes: c.notes,
          }
        : emptyForm,
    );
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visible.length > 0 && visible.every((c) => selected[c.id])}
            onChange={(e) => {
              const on = e.target.checked;
              setSelected((prev) => {
                const next = { ...prev };
                visible.forEach((c) => {
                  next[c.id] = on;
                });
                return next;
              });
            }}
          />
          الكل (الظاهر)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cols.includeInvDate}
            onChange={(e) => setCols((c) => ({ ...c, includeInvDate: e.target.checked }))}
          />
          آخر فاتورة
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cols.includeInvVal}
            onChange={(e) => setCols((c) => ({ ...c, includeInvVal: e.target.checked }))}
          />
          القيمة
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cols.includePayStatus}
            onChange={(e) => setCols((c) => ({ ...c, includePayStatus: e.target.checked }))}
          />
          حالة الدفع
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cols.includePendingList}
            onChange={(e) =>
              setCols((c) => ({ ...c, includePendingList: e.target.checked }))
            }
          />
          فواتير معلقة
        </label>
        <ActionBtn onClick={() => app.printCustomers(selectedIds, note, cols)}>
          طباعة القائمة
        </ActionBtn>
        <span className="text-sm text-[var(--bb-muted)]">{selectedIds.length} محدد</span>
      </div>
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث بالاسم أو الهاتف..."
      />
      <TextInput
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ملاحظة اختيارية على القائمة..."
      />
      {visible.length === 0 ? (
        <Empty>لا يوجد عملاء بعد</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((c) => {
            const n = app.invoices.filter((i) => i.customerId === c.id).length;
            const sel = c.id === app.draft.customerId;
            return (
              <li
                key={c.id}
                className={`bb-glass p-4 ${sel ? "ring-2 ring-[var(--bb-gold)]" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!selected[c.id]}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [c.id]: e.target.checked }))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[var(--bb-title)]">{c.name}</p>
                    {c.phone ? (
                      <p className="text-sm text-[var(--bb-muted)]" dir="ltr">
                        {c.phone}
                      </p>
                    ) : null}
                    {c.address ? (
                      <p className="text-sm text-[var(--bb-muted)]">{c.address}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-[var(--bb-muted)]">{n} فاتورة</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionBtn
                        onClick={() => {
                          app.selectCustomer(c.id);
                        }}
                      >
                        اختر للفاتورة
                      </ActionBtn>
                      <ActionBtn tone="ghost" onClick={() => openForm(c)}>
                        تعديل
                      </ActionBtn>
                      <ActionBtn
                        tone="danger"
                        onClick={() => {
                          if (window.confirm(`حذف "${c.name}"؟`)) app.removeCustomer(c.id);
                        }}
                      >
                        حذف
                      </ActionBtn>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ActionBtn onClick={() => openForm()}>عميل جديد</ActionBtn>

      <Modal
        open={formOpen}
        title={form.id ? "تعديل عميل" : "إضافة عميل"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <ActionBtn
              onClick={() => {
                const saved = app.saveCustomer({
                  id: form.id || undefined,
                  name: form.name,
                  phone: form.phone,
                  address: form.address,
                  notes: form.notes,
                });
                if (saved) setFormOpen(false);
              }}
            >
              حفظ
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => setFormOpen(false)}>
              إلغاء
            </ActionBtn>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="الاسم *">
            <TextInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="الهاتف">
            <TextInput
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <Field label="العنوان">
            <TextInput
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </Field>
          <Field label="ملاحظات">
            <TextInput
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
