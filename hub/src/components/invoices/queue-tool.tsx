"use client";

import { useState } from "react";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, Modal, TextInput } from "./ui";

export function QueueTool() {
  const app = useInvoiceApp();
  const [bundleName, setBundleName] = useState("");
  const [copyId, setCopyId] = useState<string | null>(null);
  const [copyQ, setCopyQ] = useState("");
  const [copySel, setCopySel] = useState<Record<string, boolean>>({});

  const copyCustomers = app.customers.filter((c) => {
    const q = copyQ.toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.phone || "").includes(q);
  });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-2 text-lg text-[var(--bb-title)]">مسودات التحضير</h2>
        <p className="mb-3 text-sm text-[var(--bb-muted)]">
          مسودات التحضير من المالية لا تظهر هنا حتى الاعتماد. هنا طلبات الانتظار الأخرى
          فقط.
        </p>
        {app.queue.length === 0 ? (
          <Empty>لا توجد مسودات — أنشئها من المالية ← التحضير ثم اعتمدها</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {app.queue.map((p) => (
              <li key={p.id} className="bb-glass p-4">
                <p className="text-[var(--bb-title)]">{p.title || "طلب تحضير"}</p>
                <p className="text-sm text-[var(--bb-muted)]">
                  {p.items?.length || 0} منتج ·{" "}
                  {p.prepSummary?.stockOk ? "مخزون كافٍ" : "ينقص مكونات"} ·{" "}
                  {p.customerName || "بدون عميل"} · {(p.createdAt || "").slice(0, 10)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionBtn onClick={() => app.loadPending(p.id)}>تحميل</ActionBtn>
                  <ActionBtn
                    tone="danger"
                    onClick={() => {
                      if (window.confirm(`حذف "${p.title}"؟`)) app.removePending(p.id);
                    }}
                  >
                    حذف
                  </ActionBtn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg text-[var(--bb-title)]">مجموعات الأصناف</h2>
        <p className="mb-3 text-sm text-[var(--bb-muted)]">
          احفظ أصناف الفاتورة الحالية ثم أضفها أو انسخها لعدة عملاء.
        </p>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <TextInput
            value={bundleName}
            onChange={(e) => setBundleName(e.target.value)}
            placeholder="اسم المجموعة..."
          />
          <ActionBtn
            onClick={() => {
              app.saveBundle(bundleName);
              setBundleName("");
            }}
          >
            حفظ أصناف الفاتورة
          </ActionBtn>
        </div>
        {app.bundles.length === 0 ? (
          <Empty>لا مجموعات بعد</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {app.bundles.map((b) => (
              <li key={b.id} className="bb-glass p-4">
                <p className="text-[var(--bb-title)]">{b.name}</p>
                <p className="text-sm text-[var(--bb-muted)]">
                  {b.items.length} صنف
                  {b.items.length
                    ? ` · ${b.items
                        .slice(0, 3)
                        .map((it) => it.name)
                        .join(" · ")}`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionBtn onClick={() => app.applyBundle(b.id, false)}>
                    إضافة للفاتورة
                  </ActionBtn>
                  <ActionBtn tone="ghost" onClick={() => app.applyBundle(b.id, true)}>
                    استبدال
                  </ActionBtn>
                  <ActionBtn
                    tone="ghost"
                    onClick={() => {
                      setCopyId(b.id);
                      setCopySel({});
                      setCopyQ("");
                    }}
                  >
                    نسخ لعملاء
                  </ActionBtn>
                  <ActionBtn
                    tone="danger"
                    onClick={() => {
                      if (window.confirm(`حذف المجموعة «${b.name}»؟`)) {
                        app.removeBundle(b.id);
                      }
                    }}
                  >
                    حذف
                  </ActionBtn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={Boolean(copyId)}
        title="نسخ المجموعة لعملاء"
        onClose={() => setCopyId(null)}
        footer={
          <>
            <ActionBtn
              onClick={() => {
                if (!copyId) return;
                const ids = Object.entries(copySel)
                  .filter(([, on]) => on)
                  .map(([id]) => id);
                app.multiCopyBundle(copyId, ids);
                setCopyId(null);
              }}
            >
              إنشاء الفواتير
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => setCopyId(null)}>
              إلغاء
            </ActionBtn>
          </>
        }
      >
        <TextInput
          value={copyQ}
          onChange={(e) => setCopyQ(e.target.value)}
          placeholder="بحث..."
          className="mb-3"
        />
        <div className="mb-3 flex gap-2">
          <ActionBtn
            tone="ghost"
            onClick={() => {
              const next: Record<string, boolean> = {};
              copyCustomers.forEach((c) => {
                next[c.id] = true;
              });
              setCopySel(next);
            }}
          >
            تحديد الكل
          </ActionBtn>
          <ActionBtn tone="ghost" onClick={() => setCopySel({})}>
            إلغاء التحديد
          </ActionBtn>
        </div>
        {copyCustomers.length === 0 ? (
          <Empty>لا يوجد عملاء</Empty>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {copyCustomers.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={!!copySel[c.id]}
                    onChange={(e) =>
                      setCopySel((prev) => ({ ...prev, [c.id]: e.target.checked }))
                    }
                  />
                  {c.name}
                  {c.phone ? ` · ${c.phone}` : ""}
                </label>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
