"use client";

import { useMemo, useState } from "react";
import { ActionBtn, Field, Modal, Select, TextInput } from "@/components/invoices/ui";
import { useFinanceApp, type ItemKind } from "./finance-context";
import { INV_TYPES, todayISO } from "@/lib/finance/helpers";
import type { Purchase, StockItem } from "@/lib/finance/types";

function catalogFor(type: ItemKind, catalogs: { materials: StockItem[]; packages: StockItem[]; stickers: StockItem[] }) {
  if (type === "bb_packages") return catalogs.packages;
  if (type === "bb_stickers") return catalogs.stickers;
  return catalogs.materials;
}

function seedPurchase(
  edit: Purchase | null | undefined,
  prefill: { type: ItemKind; itemId: string; qty?: number } | undefined,
  catalogs: { materials: StockItem[]; packages: StockItem[]; stickers: StockItem[] },
) {
  if (edit) {
    return {
      date: edit.date || todayISO(),
      type: edit.itemType,
      itemId: edit.itemId,
      qty: String(edit.qty),
      cost: String(edit.costPerUnit),
      supplier: edit.supplier || "",
      notes: edit.notes || "",
    };
  }
  const type = prefill?.type || "bb_materials";
  const itemId = prefill?.itemId || "";
  const found = catalogFor(type, catalogs).find((i) => i.id === itemId);
  return {
    date: todayISO(),
    type,
    itemId,
    qty: prefill?.qty && prefill.qty > 0 ? String(prefill.qty) : "",
    cost: String(found?.costPerUnit ?? 0),
    supplier: "",
    notes: "",
  };
}

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
  if (!open) return null;
  const key = edit?.id ?? `${prefill?.type ?? "new"}:${prefill?.itemId ?? ""}`;
  return <PurchaseModalForm key={key} onClose={onClose} edit={edit} prefill={prefill} />;
}

function PurchaseModalForm({
  onClose,
  edit,
  prefill,
}: {
  onClose: () => void;
  edit?: Purchase | null;
  prefill?: { type: ItemKind; itemId: string; qty?: number };
}) {
  const app = useFinanceApp();
  const seed = seedPurchase(edit, prefill, {
    materials: app.materials,
    packages: app.packages,
    stickers: app.stickers,
  });
  const [date, setDate] = useState(seed.date);
  const [type, setType] = useState<ItemKind>(seed.type);
  const [itemId, setItemId] = useState(seed.itemId);
  const [qty, setQty] = useState(seed.qty);
  const [cost, setCost] = useState(seed.cost);
  const [supplier, setSupplier] = useState(seed.supplier);
  const [notes, setNotes] = useState(seed.notes);

  const items = useMemo(() => {
    if (type === "bb_materials") return app.materials;
    if (type === "bb_packages") return app.packages;
    return app.stickers;
  }, [app.materials, app.packages, app.stickers, type]);

  const item = items.find((i) => i.id === itemId);

  return (
    <Modal
      open
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
          <Select
            value={itemId}
            disabled={!!prefill}
            onChange={(e) => {
              const id = e.target.value;
              setItemId(id);
              if (edit) return;
              const found = items.find((i) => i.id === id);
              setCost(String(found?.costPerUnit ?? 0));
            }}
          >
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
