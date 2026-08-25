"use client";

import { useMemo, useState } from "react";
import { ActionBtn, Empty, Select, TextInput } from "@/components/invoices/ui";
import { fmt, fmtQty, INV_TYPES, typeLabel } from "@/lib/finance/helpers";
import type { Purchase } from "@/lib/finance/types";
import { useFinanceApp } from "./finance-context";
import { PurchaseModal } from "./purchase-modal";

export function PurchasesTool() {
  const app = useFinanceApp();
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Purchase | null>(null);
  const rows = useMemo(() => {
    return app.purchases.filter((p) => {
      if (typeF && p.itemType !== typeF) return false;
      if (q && !`${p.itemName} ${p.supplier}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [app.purchases, q, typeF]);
  const total = rows.reduce((s, p) => s + (p.totalCost || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--bb-muted)]">
        المشتريات مصدر كمية الدفتر. بعد شراء حقيقي يظهر الرصيد فوراً من مجموع الكميات.
      </p>
      <div className="flex flex-wrap gap-2">
        <ActionBtn
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          تسجيل شراء
        </ActionBtn>
        <Select value={typeF} className="max-w-40" onChange={(e) => setTypeF(e.target.value)}>
          <option value="">كل الأنواع</option>
          {INV_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
        <TextInput className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." />
      </div>
      <p className="text-sm text-[var(--bb-muted)]" dir="ltr">
        {rows.length} سجل · {fmt(total)} EGP
      </p>
      {rows.length === 0 ? (
        <Empty>لا يوجد مشتريات</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((p) => (
            <li key={p.id} className="bb-glass flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--bb-title)]">{p.itemName}</p>
                <p className="text-xs text-[var(--bb-muted)]">
                  {p.date} · {typeLabel(p.itemType)}
                  {p.supplier ? ` · ${p.supplier}` : ""}
                </p>
              </div>
              <span dir="ltr" className="text-sm">
                +{fmtQty(p.qty)} · {fmt(p.totalCost)} EGP
              </span>
              <ActionBtn
                tone="ghost"
                onClick={() => {
                  setEdit(p);
                  setOpen(true);
                }}
              >
                تعديل
              </ActionBtn>
              <ActionBtn tone="danger" onClick={() => app.removePurchase(p.id)}>
                حذف
              </ActionBtn>
            </li>
          ))}
        </ul>
      )}
      <PurchaseModal
        open={open}
        edit={edit}
        onClose={() => {
          setOpen(false);
          setEdit(null);
        }}
      />
    </div>
  );
}
