"use client";

import { useEffect, useState } from "react";
import { ActionBtn, Empty, Field, Modal, Select, TextInput } from "@/components/invoices/ui";
import { fmt, fmtQty, INV_TYPES } from "@/lib/finance/helpers";
import { calcCOGS } from "@/lib/finance/recipes";
import type { Category, Product } from "@/lib/invoices/types";
import type { StockItem } from "@/lib/finance/types";
import { useFinanceApp, type ItemKind } from "./finance-context";
import { ItemModal } from "./item-modal";
import { SectionChips } from "./section-chips";

const SECTIONS = [
  { id: "report", label: "دفتر الكميات" },
  { id: "bb_materials", label: "مواد خام" },
  { id: "bb_packages", label: "تغليف" },
  { id: "bb_stickers", label: "ملصقات" },
  { id: "catalog", label: "الكتالوج" },
  { id: "bom", label: "بطاقات المنتج" },
] as const;

export function StockTool() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("report");
  return (
    <div className="flex flex-col gap-4">
      <SectionChips items={[...SECTIONS]} value={section} onChange={setSection} />
      {section === "report" ? <StockReport /> : null}
      {section === "bb_materials" || section === "bb_packages" || section === "bb_stickers" ? (
        <ItemCatalog type={section} />
      ) : null}
      {section === "catalog" ? <ProductCatalog /> : null}
      {section === "bom" ? <BomCards /> : null}
    </div>
  );
}

function StockReport() {
  const app = useFinanceApp();
  const r = app.stockReport;
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <p className="bb-glass p-3 text-sm">
          الإجمالي <span dir="ltr">{fmt(r.grandVal)} EGP</span>
        </p>
        <p className="bb-glass p-3 text-sm">
          نشط <span dir="ltr">{fmt(r.grandValActive)} EGP</span>
        </p>
        <p className="bb-glass p-3 text-sm">
          غير نشط <span dir="ltr">{fmt(r.grandValInactive)} EGP</span>
        </p>
      </div>
      {r.lines.length === 0 ? (
        <Empty>لا مخزون بعد</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-start text-[var(--bb-muted)]">
                <th className="p-2">الصنف</th>
                <th className="p-2">النوع</th>
                <th className="p-2">متبقي</th>
                <th className="p-2">تكلفة</th>
                <th className="p-2">قيمة</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l, i) => (
                <tr key={`${l.cat}-${l.name}-${i}`} className="border-t border-[var(--bb-line)]/50">
                  <td className="p-2">{l.name}</td>
                  <td className="p-2 text-[var(--bb-muted)]">{l.cat}</td>
                  <td className={`p-2 ${l.qty < 0 ? "text-[var(--bb-bad)]" : ""}`} dir="ltr">
                    {fmtQty(l.qty)}
                  </td>
                  <td className="p-2" dir="ltr">
                    {fmt(l.cpu)}
                  </td>
                  <td className="p-2" dir="ltr">
                    {fmt(l.val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ItemCatalog({ type }: { type: ItemKind }) {
  const app = useFinanceApp();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<StockItem | null | "new">(null);
  const list =
    type === "bb_materials" ? app.materials : type === "bb_packages" ? app.packages : app.stickers;
  const visible = list.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));
  const label = INV_TYPES.find((t) => t.id === type)?.label;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <ActionBtn onClick={() => setModal("new")}>إضافة {label}</ActionBtn>
        <TextInput
          className="max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث..."
        />
      </div>
      {visible.length === 0 ? (
        <Empty>لا أصناف</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => (
            <ItemRow
              key={item.id}
              type={type}
              item={item}
              onEdit={() => setModal(item)}
              onDelete={() => app.removeItem(type, item.id)}
            />
          ))}
        </ul>
      )}
      <ItemModal
        open={modal !== null}
        type={type}
        item={modal === "new" ? null : modal}
        onClose={() => setModal(null)}
      />
    </>
  );
}

function ItemRow({
  type,
  item,
  onEdit,
  onDelete,
}: {
  type: ItemKind;
  item: StockItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const app = useFinanceApp();
  const qty = app.qtyOf(type, item.id, item);
  const st = app.itemStatus(item, type);
  return (
    <li className="bb-glass flex flex-wrap items-center gap-3 p-3">
      <button type="button" className="min-w-0 flex-1 text-start" onClick={onEdit}>
        <span className="block text-[var(--bb-title)]">{item.name}</span>
        <span className="text-xs text-[var(--bb-muted)]">
          {item.unit} · {fmt(item.costPerUnit)} EGP
          {type === "bb_stickers" && item.templateKey ? " · قالب مربوط" : ""}
        </span>
      </button>
      <label className="flex items-center gap-2 text-sm">
        <span className={st === "crit" ? "text-[var(--bb-bad)]" : st === "low" ? "text-[var(--bb-warn)]" : ""}>
          كمية
        </span>
        <TextInput
          className="w-24"
          key={`${item.id}-${qty}`}
          defaultValue={String(qty)}
          onBlur={(e) => {
            const v = parseFloat(String(e.target.value).replace(/,/g, ""));
            if (Number.isNaN(v)) return;
            if (Math.abs(v - qty) < 0.0001) return;
            void app.applyTruthStock(type, item.id, v);
          }}
        />
      </label>
      <ActionBtn tone="ghost" onClick={onEdit}>
        تعديل
      </ActionBtn>
      <ActionBtn tone="danger" onClick={onDelete}>
        حذف
      </ActionBtn>
    </li>
  );
}

function ProductCatalog() {
  const app = useFinanceApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Product | null | "new">(null);
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#c9a84c");
  const visible = app.products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <ActionBtn onClick={() => setOpen("new")}>إضافة منتج</ActionBtn>
        <ActionBtn tone="ghost" onClick={() => setCatOpen(true)}>
          تصنيف جديد
        </ActionBtn>
        <TextInput className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث منتج..." />
      </div>
      <div className="flex flex-wrap gap-2">
        {app.categories.map((c) => (
          <span key={c.id} className="bb-glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.name}
            <button type="button" className="text-[var(--bb-bad)]" onClick={() => app.removeCategory(c.id)}>
              ✕
            </button>
          </span>
        ))}
      </div>
      {visible.length === 0 ? (
        <Empty>الكتالوج فارغ — المالية تكتب المنتجات هنا، والفواتير تقرأ فقط.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => {
            const cat = app.categories.find((c) => c.id === p.categoryId);
            const off = p.inactive === true || p.active === false;
            return (
              <li key={p.id} className="bb-glass flex flex-wrap items-center gap-3 p-3">
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setOpen(p)}>
                  <span className={`block ${off ? "opacity-50" : "text-[var(--bb-title)]"}`}>{p.name}</span>
                  <span className="text-xs text-[var(--bb-muted)]">
                    {[p.packType, p.weight, cat?.name].filter(Boolean).join(" · ")}
                    {off ? " · غير نشط" : ""}
                  </span>
                </button>
                <span dir="ltr">{fmt(p.unitPrice)} EGP</span>
                <ActionBtn
                  tone="ghost"
                  onClick={() => app.saveProduct({ ...p, inactive: !off, active: off })}
                >
                  {off ? "تفعيل" : "إيقاف"}
                </ActionBtn>
                <ActionBtn tone="danger" onClick={() => app.removeProduct(p.id)}>
                  حذف
                </ActionBtn>
              </li>
            );
          })}
        </ul>
      )}
      <ProductModal
        open={open !== null}
        product={open === "new" ? null : open}
        categories={app.categories}
        onClose={() => setOpen(null)}
      />
      <Modal
        open={catOpen}
        title="تصنيف"
        onClose={() => setCatOpen(false)}
        footer={
          <>
            <ActionBtn
              onClick={() => {
                if (!catName.trim()) return;
                app.saveCategory({ name: catName.trim(), color: catColor });
                setCatOpen(false);
                setCatName("");
              }}
            >
              حفظ
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => setCatOpen(false)}>
              إلغاء
            </ActionBtn>
          </>
        }
      >
        <Field label="الاسم">
          <TextInput value={catName} onChange={(e) => setCatName(e.target.value)} />
        </Field>
        <Field label="اللون">
          <TextInput type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}

function ProductModal({
  open,
  product,
  categories,
  onClose,
}: {
  open: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
}) {
  const app = useFinanceApp();
  const [name, setName] = useState("");
  const [packType, setPack] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("0");
  const [categoryId, setCat] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(product?.name || "");
    setPack(product?.packType || "");
    setWeight(product?.weight || "");
    setPrice(String(product?.unitPrice || 0));
    setCat(product?.categoryId || "");
  }, [open, product]);

  return (
    <Modal
      open={open}
      title={product ? "تعديل منتج" : "منتج جديد"}
      onClose={onClose}
      footer={
        <>
          <ActionBtn
            onClick={() => {
              if (!name.trim()) return;
              app.saveProduct({
                id: product?.id,
                name: name.trim(),
                packType,
                weight,
                unitPrice: parseFloat(price) || 0,
                categoryId: categoryId || null,
                inactive: product?.inactive,
                active: product?.active,
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
      <div className="grid gap-3">
        <Field label="الاسم">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="العبوة">
          <TextInput value={packType} onChange={(e) => setPack(e.target.value)} />
        </Field>
        <Field label="الوزن">
          <TextInput value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
        <Field label="السعر">
          <TextInput type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="التصنيف">
          <Select value={categoryId} onChange={(e) => setCat(e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function BomCards() {
  const app = useFinanceApp();
  const cards = app.recipes.filter((r) => r.productId);
  if (!cards.length) return <Empty>اربط وصفة بمنتج لعرض بطاقة BOM</Empty>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {cards.map((r) => {
        const cogs = calcCOGS(r, app.findItem);
        const fg = app.productSummary.find((p) => p.productId === r.productId);
        return (
          <li key={r.id} className="bb-glass p-4">
            <p className="text-[var(--bb-title)]">{r.name}</p>
            <p className="mt-1 text-xs text-[var(--bb-muted)]" dir="ltr">
              COGS {fmt(cogs.total)}
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              جاهز
              <TextInput
                className="w-24"
                defaultValue={String(fg?.onHand ?? 0)}
                key={`${r.productId}-${fg?.onHand ?? 0}`}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isNaN(v) || !r.productId) return;
                  if (Math.abs(v - (fg?.onHand || 0)) < 0.0001) return;
                  void app.applyProductStock(r.productId, r.id, v);
                }}
              />
            </label>
            <ul className="mt-3 space-y-1 text-sm">
              {(r.ingredients || []).map((ing) => {
                const item = app.findItem(ing.itemType, ing.itemId);
                const qty = item ? app.qtyOf(ing.itemType, ing.itemId, item) : 0;
                return (
                  <li key={`${ing.itemType}-${ing.itemId}`} className="flex justify-between gap-2">
                    <span>{item?.name || "؟"}</span>
                    <span dir="ltr">
                      {fmtQty(ing.qty)} / رصيد {fmtQty(qty)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
