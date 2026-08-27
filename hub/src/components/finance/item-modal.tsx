"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionBtn, Field, Modal, Select, TextArea, TextInput } from "@/components/invoices/ui";
import { useFinanceApp, type ItemKind } from "./finance-context";
import { INV_TYPES, fmtQty } from "@/lib/finance/helpers";
import type { StockItem } from "@/lib/finance/types";

export function ItemModal({
  open,
  type,
  item,
  onClose,
}: {
  open: boolean;
  type: ItemKind;
  item: StockItem | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return <ItemModalForm key={item?.id ?? "new"} type={type} item={item} onClose={onClose} />;
}

function ItemModalForm({
  type,
  item,
  onClose,
}: {
  type: ItemKind;
  item: StockItem | null;
  onClose: () => void;
}) {
  const app = useFinanceApp();
  const router = useRouter();
  const opened = item ? app.qtyOf(type, item.id, item) : 0;
  const [name, setName] = useState(item?.name || "");
  const [unit, setUnit] = useState(item?.unit || "قطعة");
  const [cost, setCost] = useState(String(item?.costPerUnit ?? 0));
  const [stock, setStock] = useState(String(opened));
  const [minStock, setMin] = useState(String(item?.minStock ?? 0));
  const [supplier, setSupplier] = useState(item?.supplier || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [productId, setProductId] = useState(item?.productId || "");
  const [recipeId, setRecipeId] = useState(item?.recipeId || "");
  const [templateKey, setTemplateKey] = useState(item?.templateKey || "");
  const [openedStock] = useState(opened);

  const label = INV_TYPES.find((t) => t.id === type)?.label || type;

  return (
    <Modal
      open
      title={item ? `تعديل ${label}` : `إضافة ${label}`}
      onClose={onClose}
      footer={
        <>
          <ActionBtn
            onClick={() => {
              const nextQty = parseFloat(String(stock).replace(/,/g, "")) || 0;
              if (Math.abs(nextQty - openedStock) > 0.0001) {
                if (
                  !window.confirm(
                    `تأكيد تعديل رصيد «${name.trim() || label}»؟\nمن ${fmtQty(openedStock)} إلى ${fmtQty(nextQty)}\nيُسجَّل كتسوية جرد إن تغيّر الرصيد.`,
                  )
                ) {
                  return;
                }
              }
              void app
                .saveItem(
                  type,
                  {
                    id: item?.id,
                    name,
                    unit,
                    costPerUnit: parseFloat(cost) || 0,
                    minStock: parseFloat(minStock) || 0,
                    supplier,
                    notes,
                    productId: type === "bb_stickers" ? productId : "",
                    recipeId: type === "bb_stickers" ? recipeId : "",
                    templateKey: type === "bb_stickers" ? templateKey : "",
                  },
                  nextQty,
                  openedStock,
                )
                .then((id) => {
                  if (id) onClose();
                });
            }}
          >
            حفظ
          </ActionBtn>
          <ActionBtn tone="ghost" onClick={onClose}>
            إلغاء
          </ActionBtn>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الاسم">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="الوحدة">
          <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Field label="تكلفة الوحدة">
          <TextInput type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field label="الكمية (من الدفتر — تُكتب تسوية فقط إذا تغيّرت)">
          <TextInput value={stock} onChange={(e) => setStock(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="حد أدنى">
          <TextInput type="number" value={minStock} onChange={(e) => setMin(e.target.value)} />
        </Field>
        <Field label="المورّد">
          <TextInput value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="ملاحظات">
            <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        {type === "bb_stickers" ? (
          <>
            <Field label="منتج">
              <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">—</option>
                {app.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="وصفة">
              <Select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
                <option value="">—</option>
                {app.recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="قالب الملصق (من التصميم)">
              <Select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
                <option value="">—</option>
                {app.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id}
                  </option>
                ))}
              </Select>
            </Field>
            {item ? (
              <div className="flex items-end">
                <ActionBtn
                  tone="ghost"
                  onClick={() => {
                    app.prepareLabelOpen(item.id);
                    router.push("/design?tab=atelier");
                  }}
                >
                  فتح في الاستوديو
                </ActionBtn>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-[var(--bb-muted)]">
        الكمية الحالية من الدفتر: {fmtQty(opened)} — لا تُكتب «تسوية جرد» إن لم تتغيّر.
      </p>
    </Modal>
  );
}
