"use client";

import { useMemo, useState } from "react";
import { ActionBtn, Empty, Field, Select, TextInput } from "@/components/invoices/ui";
import { dateInRange, fmt, fmtQty, INV_TYPES, typeLabel } from "@/lib/finance/helpers";
import type { Purchase } from "@/lib/finance/types";
import { useFinanceApp } from "./finance-context";
import { PurchaseModal } from "./purchase-modal";
import { FinanceTable, StatCard, tdClass, thClass } from "./section-chips";

export function PurchasesTool() {
  const app = useFinanceApp();
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Purchase | null>(null);
  const rows = useMemo(() => {
    return app.purchases.filter((p) => {
      if (typeF && p.itemType !== typeF) return false;
      if (!dateInRange(p.date, from, to)) return false;
      if (q && !`${p.itemName} ${p.supplier}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [app.purchases, q, typeF, from, to]);
  const totalCost = rows.reduce((s, p) => s + (p.totalCost || 0), 0);
  const totalQty = rows.reduce((s, p) => s + (p.qty || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--bb-muted)]">
        المشتريات مصدر كمية الدفتر. بعد شراء حقيقي يظهر الرصيد فوراً من مجموع الكميات.
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <StatCard label="سجل معروض" value={String(rows.length)} />
        <StatCard label="إجمالي الكمية" value={fmtQty(totalQty)} />
        <StatCard label="إجمالي التكلفة" value={`${fmt(totalCost)} EGP`} />
        <StatCard label="كل السجلات" value={String(app.purchases.length)} />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <ActionBtn
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          تسجيل شراء
        </ActionBtn>
        <Field label="من">
          <TextInput type="date" className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="إلى">
          <TextInput type="date" className="w-36" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Select value={typeF} className="max-w-40" onChange={(e) => setTypeF(e.target.value)}>
          <option value="">كل الأنواع</option>
          {INV_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
        <TextInput className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث صنف أو مورّد..." />
      </div>
      <p className="text-xs text-[var(--bb-muted)]">
        عرض {rows.length} من {app.purchases.length} سجل
      </p>
      {rows.length === 0 ? (
        <Empty>لا توجد نتائج</Empty>
      ) : (
        <FinanceTable minWidth="48rem">
          <thead>
            <tr>
              <th className={thClass}>التاريخ</th>
              <th className={thClass}>الصنف</th>
              <th className={thClass}>النوع</th>
              <th className={thClass}>كمية</th>
              <th className={thClass}>تكلفة الوحدة</th>
              <th className={thClass}>الإجمالي</th>
              <th className={thClass}>المورّد</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className={tdClass}>{p.date}</td>
                <td className={`${tdClass} text-[var(--bb-title)]`}>{p.itemName}</td>
                <td className={`${tdClass} text-[var(--bb-muted)]`}>{typeLabel(p.itemType)}</td>
                <td className={tdClass} dir="ltr">
                  +{fmtQty(p.qty)}
                </td>
                <td className={tdClass} dir="ltr">
                  {fmt(p.costPerUnit)}
                </td>
                <td className={tdClass} dir="ltr">
                  {fmt(p.totalCost)}
                </td>
                <td className={`${tdClass} text-[var(--bb-muted)]`}>{p.supplier || "—"}</td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  <ActionBtn
                    tone="ghost"
                    onClick={() => {
                      setEdit(p);
                      setOpen(true);
                    }}
                  >
                    تعديل
                  </ActionBtn>{" "}
                  <ActionBtn
                    tone="danger"
                    onClick={() => {
                      if (window.confirm(`حذف شراء «${p.itemName}» بتاريخ ${p.date}؟`)) {
                        app.removePurchase(p.id);
                      }
                    }}
                  >
                    حذف
                  </ActionBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </FinanceTable>
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
