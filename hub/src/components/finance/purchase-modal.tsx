"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionBtn, Field, Modal, Select, TextInput } from "@/components/invoices/ui";
import { useFinanceApp, type ItemKind } from "./finance-context";
import { INV_TYPES, todayISO } from "@/lib/finance/helpers";
import type { Purchase } from "@/lib/finance/types";

export function PurchaseModal({
  open,
  onClose,
  edit,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  edit?: Purchase | null;
  prefill?: { type: ItemKind; itemId: string; qty?: number };
}) {
  const app = useFinanceApp();
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<ItemKind>("bb_materials");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const items = useMemo(() => {
    if (type === "bb_materials") return app.materials;
    if (type === "bb_packages") return app.packages;
    return app.stickers;
  }, [app.materials, app.packages, app.stickers, type]);

  const item = items.find((i) => i.id === itemId);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setDate(edit.date || todayISO());
      setType(edit.itemType);
      setItemId(edit.itemId);
      setQty(String(edit.qty));
      setCost(String(edit.costPerUnit));
      setSupplier(edit.supplier || "");
      setNotes(edit.notes || "");
      return;
    }
    setDate(todayISO());
    setType(prefill?.type || "bb_materials");
    setItemId(prefill?.itemId || "");
    setQty(prefill?.qty && prefill.qty > 0 ? String(prefill.qty) : "");
    setSupplier("");
    setNotes("");
    const found = (prefill?.type === "bb_packages"
      ? app.packages
      : prefill?.type === "bb_stickers"
        ? app.stickers
        : app.materials
    ).find((i) => i.id === prefill?.itemId);
    setCost(String(found?.costPerUnit ?? 0));
  }, [open, edit, prefill, app.materials, app.packages, app.stickers]);

  useEffect(() => {
    if (item && !edit) setCost(String(item.costPerUnit || 0));
  }, [itemId, item, edit]);

  return (
    <Modal
      open={open}
      title={edit ? "تعديل شراء" : prefill ? `تسجيل شراء · ${item?.name || ""}` : "تسجيل شراء"}
      onClose={onClose}
      footer={
        <>
          <ActionBtn
            onClick={() => {
              if (!itemId) return;
              const q = parseFloat(qty) || 0;
              if (!q) return;
              app.savePurchase({
                id: edit?.id,
                date,
                itemType: type,
                itemId,
                itemName: item?.name || "",
                qty: q,
                costPerUnit: parseFloat(cost) || 0,
                supplier,
                notes,
              });
              onClose();
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
        <Field label="التاريخ">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="النوع">
          <Select
            value={type}
            disabled={!!prefill}
            onChange={(e) => {
              setType(e.target.value as ItemKind);
              setItemId("");
            }}
          >
            {INV_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="الصنف">
          <Select value={itemId} disabled={!!prefill} onChange={(e) => setItemId(e.target.value)}>
            <option value="">—</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.unit ? ` (${i.unit})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="الكمية — يمكنك زيادتها عن العجز">
          <TextInput type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="تكلفة الوحدة">
          <TextInput type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field label="المورّد">
          <Select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">شراء حقيقي</option>
            <option value="رصيد افتتاحي">رصيد افتتاحي</option>
            <option value="تسوية جرد">تسوية جرد</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="ملاحظات">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
