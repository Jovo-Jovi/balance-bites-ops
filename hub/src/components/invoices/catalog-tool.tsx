"use client";

import { useMemo, useState } from "react";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, TextInput } from "./ui";
import { fmt } from "@/lib/invoices/helpers";

export function CatalogTool() {
  const app = useInvoiceApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");

  const visible = useMemo(() => {
    return app.activeProducts.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && p.categoryId !== cat) return false;
      return true;
    });
  }, [app.activeProducts, q, cat]);

  const selectedIds = Object.entries(selected)
    .filter(([, on]) => on)
    .map(([id]) => id);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--bb-muted)]">
        التصنيفات والمنتجات تُدار من المالية والمخزون. هنا للاختيار والإضافة إلى الفاتورة
        وطباعة الأسعار.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat("")}
          className={`bb-btn rounded-full text-xs ${cat === "" ? "bg-[var(--bb-title)] text-[var(--bb-panel)]" : "bb-glass"}`}
        >
          الكل
        </button>
        {app.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`bb-btn rounded-full text-xs ${cat === c.id ? "bg-[var(--bb-title)] text-[var(--bb-panel)]" : "bb-glass"}`}
          >
            <span
              className="me-1 inline-block h-2 w-2 rounded-full"
              style={{ background: c.color }}
            />
            {c.name.split("·")[0].trim()}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visible.length > 0 && visible.every((p) => selected[p.id])}
            onChange={(e) => {
              const on = e.target.checked;
              setSelected((prev) => {
                const next = { ...prev };
                visible.forEach((p) => {
                  next[p.id] = on;
                });
                return next;
              });
            }}
          />
          الكل (الظاهر)
        </label>
        <ActionBtn onClick={() => app.printPrices(selectedIds, note)}>
          طباعة الأسعار
        </ActionBtn>
        <span className="text-sm text-[var(--bb-muted)]">{selectedIds.length} محدد</span>
        <ActionBtn tone="ghost" onClick={app.catalogLocked}>
          إضافة منتج
        </ActionBtn>
      </div>
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث بالمنتج..."
      />
      <TextInput
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="ملاحظة اختيارية على قائمة الأسعار..."
      />
      {app.categories.length === 0 && app.products.length === 0 ? (
        <Empty>الكتالوج فارغ. بعد الاستيراد أو إدارة المالية ستظهر المنتجات هنا.</Empty>
      ) : visible.length === 0 ? (
        <Empty>لا يوجد منتجات</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => {
            const category = p.categoryId
              ? app.categories.find((c) => c.id === p.categoryId)
              : null;
            return (
              <li key={p.id} className="bb-glass flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={!!selected[p.id]}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [p.id]: e.target.checked }))
                  }
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => app.addProduct(p.id)}
                >
                  <span className="block text-[var(--bb-title)]">{p.name}</span>
                  <span className="text-xs text-[var(--bb-muted)]">
                    {[p.packType, p.weight].filter(Boolean).join(" · ")}
                    {category ? ` · ${category.name}` : ""}
                  </span>
                </button>
                <span dir="ltr" className="text-sm">
                  {fmt(p.unitPrice)} {app.strings.cur}
                </span>
                <ActionBtn onClick={() => app.addProduct(p.id)}>+ فاتورة</ActionBtn>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
