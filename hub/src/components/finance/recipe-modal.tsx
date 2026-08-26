"use client";

import { useState } from "react";
import { ActionBtn, Field, Modal, Select, TextInput } from "@/components/invoices/ui";
import { useFinanceApp } from "./finance-context";
import type { Recipe, RecipeIngredient } from "@/lib/finance/types";
import { INV_TYPES, financeId, num } from "@/lib/finance/helpers";

export function RecipeModal({
  open,
  recipe,
  onClose,
}: {
  open: boolean;
  recipe: Recipe | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return <RecipeModalForm key={recipe?.id ?? "new"} recipe={recipe} onClose={onClose} />;
}

function RecipeModalForm({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const app = useFinanceApp();
  const [name, setName] = useState(recipe?.name || "");
  const [batchSize, setBatch] = useState(String(recipe?.batchSize || 1));
  const [productId, setProductId] = useState(recipe?.productId || "");
  const [unitPrice, setPrice] = useState(String(recipe?.unitPrice || 0));
  const [ings, setIngs] = useState<RecipeIngredient[]>(
    recipe?.ingredients?.length ? recipe.ingredients.map((i) => ({ ...i })) : [],
  );

  const product = app.products.find((p) => p.id === productId);

  function addIng() {
    setIngs((prev) => [...prev, { itemId: "", itemType: "bb_materials", qty: 0 }]);
  }

  return (
    <Modal
      open
      title={recipe ? "تعديل وصفة" : "وصفة جديدة"}
      wide
      onClose={onClose}
      footer={
        <>
          <ActionBtn
            onClick={() => {
              if (!name.trim()) return;
              const prod = app.products.find((p) => p.id === productId);
              app.saveRecipe({
                id: recipe?.id || financeId("rec"),
                name: name.trim(),
                batchSize: Math.max(1, num(batchSize) || 1),
                ingredients: ings.filter((i) => i.itemId && num(i.qty) > 0),
                productId,
                productWeight: prod?.weight || recipe?.productWeight || "",
                unitPrice: prod ? num(prod.unitPrice) : num(unitPrice),
                categoryId: prod?.categoryId || recipe?.categoryId || "",
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
        <Field label="اسم الوصفة">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="حجم الدفعة">
          <TextInput type="number" min={1} value={batchSize} onChange={(e) => setBatch(e.target.value)} />
        </Field>
        <Field label="المنتج المربوط">
          <Select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              const p = app.products.find((x) => x.id === e.target.value);
              if (p) {
                setName((n) => n || p.name);
                setPrice(String(p.unitPrice || 0));
              }
            }}
          >
            <option value="">— بدون منتج —</option>
            {app.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="سعر البيع (إن لم يُربط منتج)">
          <TextInput
            type="number"
            step="0.01"
            value={product ? String(product.unitPrice) : unitPrice}
            disabled={!!product}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-[var(--bb-muted)]">المكوّنات</p>
        <ActionBtn tone="ghost" onClick={addIng}>
          + مكوّن
        </ActionBtn>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {ings.map((ing, i) => {
          const items =
            ing.itemType === "bb_materials"
              ? app.materials
              : ing.itemType === "bb_packages"
                ? app.packages
                : app.stickers;
          return (
            <li key={`${i}-${ing.itemId}`} className="grid gap-2 sm:grid-cols-4">
              <Select
                value={ing.itemType}
                onChange={(e) => {
                  const next = ings.slice();
                  next[i] = { ...ing, itemType: e.target.value as RecipeIngredient["itemType"], itemId: "" };
                  setIngs(next);
                }}
              >
                {INV_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Select
                className="sm:col-span-2"
                value={ing.itemId}
                onChange={(e) => {
                  const next = ings.slice();
                  next[i] = { ...ing, itemId: e.target.value };
                  setIngs(next);
                }}
              >
                <option value="">— صنف —</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <TextInput
                  type="number"
                  step="0.0001"
                  value={String(ing.qty)}
                  onChange={(e) => {
                    const next = ings.slice();
                    next[i] = { ...ing, qty: parseFloat(e.target.value) || 0 };
                    setIngs(next);
                  }}
                />
                <ActionBtn
                  tone="danger"
                  onClick={() => setIngs(ings.filter((_, j) => j !== i))}
                >
                  ✕
                </ActionBtn>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
