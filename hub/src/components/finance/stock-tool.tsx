"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionBtn, Accordion, Empty, Field, Modal, Select, TextInput } from "@/components/invoices/ui";
import { LibraryThumb } from "@/components/design/library-thumb-img";
import { fmt, fmtQty, INV_TYPES, itemKey, todayISO, typeLabel } from "@/lib/finance/helpers";
import { calcCOGS, recipeSellPrice } from "@/lib/finance/recipes";
import { itemUsage, inventoryUsageLabel, matchesInventoryUsageFilter } from "@/lib/finance/analytics";
import {
  labelDesignBadge,
  resolveStickerTemplate,
  stickerDisplayName,
  stickerProductLabel,
} from "@/lib/finance/stickers";
import type { Category, Product } from "@/lib/invoices/types";
import type { Recipe, StockItem } from "@/lib/finance/types";
import { useFinanceApp, type ItemKind } from "./finance-context";
import { ItemModal } from "./item-modal";
import { FinanceTable, SectionChips, StatCard, tdClass, thClass } from "./section-chips";

const SECTIONS = [
  { id: "report", label: "دفتر الكميات" },
  { id: "bb_materials", label: "مواد خام" },
  { id: "bb_packages", label: "تغليف" },
  { id: "bb_stickers", label: "ملصقات" },
  { id: "catalog", label: "الكتالوج" },
  { id: "bom", label: "بطاقات المنتج" },
] as const;

function StockAlertsStrip() {
  const app = useFinanceApp();
  const alerts = [
    ...app.materials.map((i) => ({ i, type: "bb_materials" as const })),
    ...app.packages.map((i) => ({ i, type: "bb_packages" as const })),
    ...app.stickers.map((i) => ({ i, type: "bb_stickers" as const })),
  ].filter(({ i, type }) => app.itemStatus(i, type) !== "ok");
  if (!alerts.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {alerts.map(({ i, type }) => {
        const st = app.itemStatus(i, type);
        return (
          <span
            key={`${type}-${i.id}`}
            className={`bb-glass px-3 py-1.5 text-xs ${
              st === "crit" ? "text-[var(--bb-bad)]" : "text-[var(--bb-warn)]"
            }`}
          >
            {i.name} · {st === "crit" ? "حرج" : "منخفض"} · {fmtQty(app.qtyOf(type, i.id, i))}
          </span>
        );
      })}
    </div>
  );
}

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
  const catVal = (key: string) => r.byCat[key]?.val || 0;

  return (
    <>
      <p className="text-xs text-[var(--bb-muted)]">
        تاريخ التقرير: {todayISO()}
        {app.invoices.length ? ` · ${app.invoices.length} فاتورة · بعد خصم المباع` : " · لا فواتير بعد"}
      </p>
      <StockAlertsStrip />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard size="lg" label="منتجات جاهزة" value={`${fmt(catVal("منتج جاهز"))} EGP`} />
        <StatCard size="lg" label="مواد خام" value={`${fmt(catVal("مواد خام"))} EGP`} />
        <StatCard size="lg" label="تغليف" value={`${fmt(catVal("تغليف"))} EGP`} />
        <StatCard size="lg" label="ملصقات" value={`${fmt(catVal("ملصقات"))} EGP`} />
        <StatCard size="lg" label="الإجمالي" value={`${fmt(r.grandVal)} EGP`} />
        <StatCard size="lg" label="نشط" value={`${fmt(r.grandValActive)} EGP`} />
        <StatCard size="lg" label="غير نشط" value={`${fmt(r.grandValInactive)} EGP`} />
      </div>
      {r.deficits.length ? (
        <div className="rounded-[var(--bb-radius)] border border-[var(--bb-bad)]/40 bg-[color-mix(in_srgb,var(--bb-bad)_8%,var(--bb-panel))] p-3 text-sm">
          <p className="text-[var(--bb-bad)]">عجز (كمية سالبة — لا تُحسب في القيمة)</p>
          <ul className="mt-2 space-y-1 text-xs text-[var(--bb-muted)]">
            {r.deficits.map((d) => (
              <li key={`${d.cat}-${d.name}`}>
                {d.name} ({d.cat}): {fmtQty(d.qty)} {d.unit} · مشتريات {fmtQty(d.purchased)} − مستخدم{" "}
                {fmtQty(d.used)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Accordion title="ملخص الفئات" hint={`${r.lines.length} صنف`} defaultOpen>
        <FinanceTable minWidth="36rem">
          <thead>
            <tr>
              <th className={thClass}>الفئة</th>
              <th className={thClass}>عدد</th>
              <th className={thClass}>مشتريات</th>
              <th className={thClass}>مباع</th>
              <th className={thClass}>متبقي</th>
              <th className={thClass}>قيمة</th>
            </tr>
          </thead>
          <tbody>
            {r.cats.map((c) => {
              const d = r.byCat[c.key];
              return (
                <tr key={c.key}>
                  <td className={tdClass}>
                    {c.icon} {d.label}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {d.count}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmtQty(d.purchased)}
                  </td>
                  <td className={`${tdClass} text-[var(--bb-muted)]`} dir="ltr">
                    {fmtQty(d.sold)}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmtQty(d.remain)}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmt(d.val)}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className={`${tdClass} text-[var(--bb-title)]`}>
                الإجمالي (نشط {fmt(r.grandValActive)} + غير نشط {fmt(r.grandValInactive)})
              </td>
              <td className={tdClass} dir="ltr">
                {r.lines.length}
              </td>
              <td className={tdClass} dir="ltr">
                {fmtQty(r.grandPurchased)}
              </td>
              <td className={tdClass} dir="ltr">
                {fmtQty(r.grandSold)}
              </td>
              <td className={tdClass} dir="ltr">
                {fmtQty(r.grandRemain)}
              </td>
              <td className={tdClass} dir="ltr">
                {fmt(r.grandVal)}
              </td>
            </tr>
          </tbody>
        </FinanceTable>
      </Accordion>
      <Accordion title="كل الأصناف" hint={`${r.lines.length}`} defaultOpen={false}>
        {r.lines.length === 0 ? (
          <Empty>لا مخزون بعد</Empty>
        ) : (
          <FinanceTable minWidth="48rem">
            <thead>
              <tr>
                <th className={thClass}>النوع</th>
                <th className={thClass}>الصنف</th>
                <th className={thClass}>وحدة</th>
                <th className={thClass}>مشتريات</th>
                <th className={thClass}>مباع</th>
                <th className={thClass}>متبقي</th>
                <th className={thClass}>تكلفة</th>
                <th className={thClass}>قيمة</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l, i) => (
                <tr key={`${l.cat}-${l.name}-${i}`}>
                  <td className={`${tdClass} text-[var(--bb-muted)]`}>{l.cat}</td>
                  <td className={tdClass}>
                    {l.name}
                    {l.activity === "inactive" ? (
                      <span className="ms-2 text-[10px] text-[var(--bb-muted)]">غير نشط</span>
                    ) : null}
                  </td>
                  <td className={tdClass}>{l.unit}</td>
                  <td className={tdClass} dir="ltr">
                    {fmtQty(l.purchased)}
                  </td>
                  <td className={`${tdClass} text-[var(--bb-muted)]`} dir="ltr">
                    {fmtQty(l.sold)}
                  </td>
                  <td className={`${tdClass} ${l.qty < 0 ? "text-[var(--bb-bad)]" : ""}`} dir="ltr">
                    {fmtQty(l.qty)}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmt(l.cpu)}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmt(l.val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </FinanceTable>
        )}
      </Accordion>
      <Accordion title="منتجات جاهزة" hint={`${app.productSummary.length}`} defaultOpen>
        {app.productSummary.length === 0 ? (
          <Empty>لا بيانات — اربط الفواتير وسجّل الإنتاج</Empty>
        ) : (
          <FinanceTable minWidth="40rem">
            <thead>
              <tr>
                <th className={thClass}>المنتج</th>
                <th className={thClass}>إنتاج</th>
                <th className={thClass}>مباع</th>
                <th className={thClass}>رصيد</th>
                <th className={thClass}>تكلفة وحدة</th>
                <th className={thClass}>قيمة</th>
              </tr>
            </thead>
            <tbody>
              {app.productSummary.map((row) => (
                <tr key={row.productId || row.recipeId}>
                  <td className={tdClass}>
                    {row.name}
                    {row.weight ? ` · ${row.weight}` : ""}
                    {row.hasRecipe ? "" : (
                      <span className="ms-2 text-[10px] text-[var(--bb-warn)]">بلا وصفة</span>
                    )}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmtQty(row.produced)}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmtQty(row.sold)}
                  </td>
                  <td className={tdClass}>
                    <InlineQty
                      value={row.onHand}
                      name={row.name}
                      onCommit={(v) => {
                        if (!row.productId || !row.recipeId) return;
                        void app.applyProductStock(row.productId, row.recipeId, v);
                      }}
                    />
                  </td>
                  <td className={tdClass} dir="ltr">
                    {row.cogsPerUnit ? fmt(row.cogsPerUnit) : "—"}
                  </td>
                  <td className={tdClass} dir="ltr">
                    {fmt(row.stockValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </FinanceTable>
        )}
      </Accordion>
      <Accordion title="مواد خام" hint={`${app.materials.length}`} defaultOpen>
        <ReportItemTable type="bb_materials" items={app.materials} />
      </Accordion>
      <Accordion title="تغليف وملصقات" hint={`${app.packages.length + app.stickers.length}`} defaultOpen>
        <ReportItemTable type="bb_packages" items={app.packages} extra={app.stickers} />
      </Accordion>
    </>
  );
}

function confirmQtyChange(name: string, from: number, to: number) {
  return window.confirm(
    `تأكيد تعديل الكمية؟\n«${name}»\nمن ${fmtQty(from)} إلى ${fmtQty(to)}\nيُسجَّل كتسوية جرد إن تغيّر الرصيد.`,
  );
}

function InlineQty({
  name,
  value,
  onCommit,
}: {
  name: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  return (
    <TextInput
      className="w-28 text-base"
      key={String(value)}
      defaultValue={String(value)}
      onBlur={(e) => {
        const v = parseFloat(String(e.target.value).replace(/,/g, ""));
        if (Number.isNaN(v)) return;
        if (Math.abs(v - value) < 0.0001) return;
        if (!confirmQtyChange(name, value, v)) {
          e.target.value = String(value);
          return;
        }
        onCommit(v);
      }}
    />
  );
}

function ReportItemTable({
  type,
  items,
  extra,
}: {
  type: ItemKind;
  items: StockItem[];
  extra?: StockItem[];
}) {
  const app = useFinanceApp();
  const rows = extra
    ? [
        ...items.map((i) => ({ item: i, kind: type })),
        ...extra.map((i) => ({ item: i, kind: "bb_stickers" as const })),
      ]
    : items.map((i) => ({ item: i, kind: type }));
  if (!rows.length) return <Empty>لا أصناف</Empty>;
  return (
    <FinanceTable minWidth="36rem">
      <thead>
        <tr>
          <th className={thClass}>الصنف</th>
          <th className={thClass}>وحدة</th>
          <th className={thClass}>رصيد</th>
          <th className={thClass}>تكلفة</th>
          <th className={thClass}>قيمة</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ item, kind }) => {
          const qty = app.qtyOf(kind, item.id, item);
          const val = Math.max(0, qty) * (item.costPerUnit || 0);
          return (
            <tr key={`${kind}-${item.id}`}>
              <td className={tdClass}>{item.name}</td>
              <td className={tdClass}>{item.unit}</td>
              <td className={tdClass}>
                <InlineQty value={qty} name={item.name} onCommit={(v) => void app.applyTruthStock(kind, item.id, v)} />
              </td>
              <td className={`${tdClass} text-lg`} dir="ltr">
                {fmt(item.costPerUnit)}
              </td>
              <td className={`${tdClass} text-lg`} dir="ltr">
                {fmt(val)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </FinanceTable>
  );
}

function ItemCatalog({ type }: { type: ItemKind }) {
  const app = useFinanceApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [stockF, setStockF] = useState("");
  const [usageF, setUsageF] = useState("");
  const [modal, setModal] = useState<StockItem | null | "new">(null);
  const list =
    type === "bb_materials" ? app.materials : type === "bb_packages" ? app.packages : app.stickers;
  const needle = q.trim().toLowerCase();
  const visible = list.filter((i) => {
    if (needle) {
      const nameHit = i.name.toLowerCase().includes(needle);
      const supplierHit = (i.supplier || "").toLowerCase().includes(needle);
      let extra = false;
      if (type === "bb_stickers") {
        const prod = i.productId ? app.products.find((p) => p.id === i.productId) : null;
        const tmpl = resolveStickerTemplate(i, app.templates);
        extra =
          !!(prod && prod.name.toLowerCase().includes(needle)) ||
          !!(tmpl && tmpl.name.toLowerCase().includes(needle));
      }
      if (!nameHit && !supplierHit && !extra) return false;
    }
    if (stockF && app.itemStatus(i, type) !== stockF) return false;
    const usage = itemUsage(i, type, app.recipes, app.products, app.stickers);
    if (!matchesInventoryUsageFilter(usage.kind, usageF)) return false;
    return true;
  });
  const label = INV_TYPES.find((t) => t.id === type)?.label;
  const linkedN =
    type === "bb_stickers"
      ? visible.filter((i) => resolveStickerTemplate(i, app.templates)).length
      : 0;

  function openStudio(item: StockItem) {
    app.prepareLabelOpen(item.id);
    router.push("/design?tab=atelier");
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <ActionBtn onClick={() => setModal("new")}>إضافة {label}</ActionBtn>
        <TextInput
          className="max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث: اسم، مورد..."
        />
        <div className="min-w-[9rem] max-w-[12rem]">
          <Select
            value={stockF}
            onChange={(e) => setStockF(e.target.value)}
            aria-label="مستوى المخزون"
          >
            <option value="">كل المستويات</option>
            <option value="ok">طبيعي</option>
            <option value="low">منخفض</option>
            <option value="crit">حرج</option>
          </Select>
        </div>
        <div className="min-w-[10rem] max-w-[14rem]">
          <Select
            value={usageF}
            onChange={(e) => setUsageF(e.target.value)}
            aria-label="الاستخدام"
          >
            <option value="">كل الاستخدام</option>
            <option value="active">نشط</option>
            <option value="unused">غير مستخدم</option>
            <option value="shared">مشترك</option>
            <option value="inactive">غير نشط فقط</option>
          </Select>
        </div>
      </div>
      <p className="text-xs text-[var(--bb-muted)]">
        عرض {visible.length} من {list.length}
        {type === "bb_stickers"
          ? ` · ${linkedN} مربوط بتصميم · اضغط البطاقة لفتح الاستوديو`
          : " · المخزون = مشتريات − استخدام الفواتير"}
      </p>
      {visible.length === 0 ? (
        <Empty>لا أصناف</Empty>
      ) : type === "bb_stickers" ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <StickerCard
              key={item.id}
              item={item}
              onOpen={() => openStudio(item)}
              onEdit={() => setModal(item)}
              onDelete={() => {
                if (!window.confirm(`حذف «${item.name}» من المخزون؟`)) return;
                app.removeItem(type, item.id);
              }}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => (
            <ItemRow
              key={item.id}
              type={type}
              item={item}
              onEdit={() => setModal(item)}
              onDelete={() => {
                if (!window.confirm(`حذف «${item.name}» من المخزون؟`)) return;
                app.removeItem(type, item.id);
              }}
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
  const usage = itemUsage(item, type, app.recipes, app.products, app.stickers);
  return (
    <li className="bb-glass flex flex-wrap items-center gap-3 p-3">
      <button type="button" className="min-w-0 flex-1 text-start" onClick={onEdit}>
        <span className="block text-[var(--bb-title)]">{item.name}</span>
        <span className="text-xs text-[var(--bb-muted)]">
          {item.unit} · {fmt(item.costPerUnit)} EGP
          {usage.kind !== "unused" ? ` · ${inventoryUsageLabel(usage.kind)}` : ""}
        </span>
      </button>
      <label className="flex items-center gap-2 text-sm">
        <span className={st === "crit" ? "text-[var(--bb-bad)]" : st === "low" ? "text-[var(--bb-warn)]" : ""}>
          كمية
        </span>
        <TextInput
          className="w-28 text-base"
          key={`${item.id}-${qty}`}
          defaultValue={String(qty)}
          onBlur={(e) => {
            const v = parseFloat(String(e.target.value).replace(/,/g, ""));
            if (Number.isNaN(v)) return;
            if (Math.abs(v - qty) < 0.0001) return;
            if (!confirmQtyChange(item.name, qty, v)) {
              e.target.value = String(qty);
              return;
            }
            void app.applyTruthStock(type, item.id, v);
          }}
        />
      </label>
      <span className="text-lg text-[var(--bb-title)]" dir="ltr">
        {fmtQty(qty)} {item.unit}
      </span>
      <ActionBtn tone="ghost" onClick={onEdit}>
        تعديل
      </ActionBtn>
      <ActionBtn tone="danger" onClick={onDelete}>
        حذف
      </ActionBtn>
    </li>
  );
}

function StickerCard({
  item,
  onOpen,
  onEdit,
  onDelete,
}: {
  item: StockItem;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const app = useFinanceApp();
  const qty = app.qtyOf("bb_stickers", item.id, item);
  const st = app.itemStatus(item, "bb_stickers");
  const usage = itemUsage(item, "bb_stickers", app.recipes, app.products, app.stickers);
  const tmpl = resolveStickerTemplate(item, app.templates);
  const badge = labelDesignBadge(tmpl);
  const led = app.ledger[itemKey("bb_stickers", item.id)];
  const badgeCls =
    badge.kind === "circle"
      ? "border-[color-mix(in_srgb,#d4a860_40%,transparent)] text-[#d4a860]"
      : badge.kind === "cup"
        ? "border-[color-mix(in_srgb,#8ec0e0_40%,transparent)] text-[#8ec0e0]"
        : badge.kind === "none"
          ? "opacity-50"
          : "";

  return (
    <li
      className={`bb-glass overflow-hidden ${
        st === "crit"
          ? "ring-1 ring-[var(--bb-bad)]"
          : st === "low"
            ? "ring-1 ring-[var(--bb-warn)]"
            : ""
      } ${usage.kind === "inactive" ? "opacity-60" : ""}`}
    >
      <button type="button" className="w-full text-start" onClick={onOpen}>
        <div className="px-3 pt-3">
          {tmpl ? (
            <LibraryThumb template={tmpl} compact />
          ) : (
            <div className="flex h-20 items-center justify-center rounded-[var(--bb-radius)] border border-dashed border-[var(--bb-line)] text-[10px] text-[var(--bb-muted)]">
              بدون تصميم
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <p className="truncate text-sm text-[var(--bb-title)]">
            {stickerDisplayName(item, app.templates)}
            {usage.kind !== "unused" ? (
              <span className="ms-2 text-[10px] text-[var(--bb-muted)]">
                {inventoryUsageLabel(usage.kind)}
              </span>
            ) : null}
          </p>
          <p className="truncate text-[10px] text-[var(--bb-muted)]">
            {stickerProductLabel(item, app.products, app.recipes)}
          </p>
          <p className="text-[10px] text-[var(--bb-muted)]">
            مشتريات {fmtQty(led?.purchased || 0)} · مباع {fmtQty(led?.used || 0)} · {fmt(item.costPerUnit)}{" "}
            EGP
          </p>
          <p className="mt-1 text-lg text-[var(--bb-gold)]" dir="ltr">
            {fmtQty(qty)}{" "}
            <span className="text-[10px] font-normal text-[var(--bb-muted)]">{item.unit}</span>
          </p>
        </div>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--bb-line)]/40 px-3 py-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badgeCls}`}>{badge.txt}</span>
        <div className="flex flex-wrap gap-1">
          <ActionBtn tone="ghost" onClick={onOpen}>
            استوديو
          </ActionBtn>
          <ActionBtn tone="ghost" onClick={onEdit}>
            تعديل
          </ActionBtn>
          <ActionBtn tone="danger" onClick={onDelete}>
            حذف
          </ActionBtn>
        </div>
      </div>
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
            <button
              type="button"
              className="text-[var(--bb-bad)]"
              onClick={() => {
                if (!window.confirm(`حذف التصنيف «${c.name}»؟`)) return;
                app.removeCategory(c.id);
              }}
            >
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
                <span className="text-xl text-[var(--bb-title)]" dir="ltr">{fmt(p.unitPrice)} EGP</span>
                <ActionBtn
                  tone="ghost"
                  onClick={() => app.saveProduct({ ...p, inactive: !off, active: off })}
                >
                  {off ? "تفعيل" : "إيقاف"}
                </ActionBtn>
                <ActionBtn
                  tone="danger"
                  onClick={() => {
                    if (!window.confirm(`حذف المنتج «${p.name}»؟`)) return;
                    app.removeProduct(p.id);
                  }}
                >
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
  const cards = app.recipes.filter((r) => r.productId).slice().sort((a, b) => a.name.localeCompare(b.name, "ar"));
  if (!cards.length) return <Empty>اربط وصفة بمنتج لعرض بطاقة BOM</Empty>;
  return (
    <>
      <p className="text-xs text-[var(--bb-muted)]">اضغط البطاقة لفتح الوصفة والكميات</p>
      <ul className="grid gap-3 xl:grid-cols-2">
        {cards.map((r) => (
          <BomCard key={r.id} recipe={r} />
        ))}
      </ul>
    </>
  );
}

function BomCard({ recipe: r }: { recipe: Recipe }) {
  const app = useFinanceApp();
  const [open, setOpen] = useState(false);
  const cogs = calcCOGS(r, app.findItem);
  const sell = recipeSellPrice(r, app.products);
  const fg = app.productSummary.find((p) => p.productId === r.productId);
  const onHand = fg?.onHand ?? 0;
  const stockVal = fg?.stockValue ?? Math.max(0, onHand) * cogs.total;
  const ings = r.ingredients || [];
  const shortN = ings.filter((ing) => {
    const item = app.findItem(ing.itemType, ing.itemId);
    const qty = item ? app.qtyOf(ing.itemType, ing.itemId, item) : 0;
    return qty + 0.0001 < ing.qty;
  }).length;
  const margin = sell > 0.009 ? ((sell - cogs.total) / sell) * 100 : null;

  return (
    <li className="bb-glass overflow-hidden">
      <button
        type="button"
        className="bb-pressable flex w-full items-start gap-3 p-4 text-start"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[var(--bb-title)]">{r.name}</p>
          <p className="mt-1 text-xs text-[var(--bb-muted)]">
            دفعة {r.batchSize}
            {r.productWeight ? ` · ${r.productWeight}` : ""}
            {ings.length ? ` · ${ings.length} أصناف` : ""}
            {shortN ? ` · ${shortN} عجز` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            <p>
              <span className="block text-[10px] tracking-[0.12em] text-[var(--bb-muted)]">جاهز</span>
              <span className="text-lg text-[var(--bb-title)]" dir="ltr">
                {fmtQty(onHand)}
              </span>
            </p>
            <p>
              <span className="block text-[10px] tracking-[0.12em] text-[var(--bb-muted)]">COGS</span>
              <span className="text-lg text-[var(--bb-title)]" dir="ltr">
                {fmt(cogs.total)}
              </span>
            </p>
            <p>
              <span className="block text-[10px] tracking-[0.12em] text-[var(--bb-muted)]">بيع</span>
              <span className="text-lg text-[var(--bb-title)]" dir="ltr">
                {fmt(sell)}
              </span>
            </p>
            <p>
              <span className="block text-[10px] tracking-[0.12em] text-[var(--bb-muted)]">قيمة</span>
              <span className="text-lg text-[var(--bb-gold)]" dir="ltr">
                {fmt(stockVal)}
              </span>
            </p>
          </div>
          <p className="mt-2 text-[10px] text-[var(--bb-gold)]">
            {open ? "إخفاء التفاصيل" : "اضغط للتفاصيل"}
            {margin != null ? ` · هامش ${margin.toFixed(0)}%` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 text-sm text-[var(--bb-gold)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open ? (
        <div className="border-t border-[var(--bb-line)]/50 px-4 pb-4 pt-3">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            تعديل الجاهز
            <TextInput
              className="w-28 text-base"
              defaultValue={String(onHand)}
              key={`${r.productId}-${onHand}`}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isNaN(v) || !r.productId) return;
                if (Math.abs(v - onHand) < 0.0001) return;
                if (!confirmQtyChange(r.name, onHand, v)) {
                  e.target.value = String(onHand);
                  return;
                }
                void app.applyProductStock(r.productId, r.id, v);
              }}
            />
          </label>
          {ings.length === 0 ? (
            <Empty>لا أصناف في الوصفة</Empty>
          ) : (
            <ul className="mt-3 space-y-3">
              {ings.map((ing) => {
                const item = app.findItem(ing.itemType, ing.itemId);
                const qty = item ? app.qtyOf(ing.itemType, ing.itemId, item) : 0;
                const perUnit = r.batchSize > 0 ? ing.qty / r.batchSize : ing.qty;
                const forOnHand = perUnit * Math.max(0, onHand);
                const short = qty + 0.0001 < ing.qty;
                return (
                  <li key={`${ing.itemType}-${ing.itemId}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[var(--bb-title)]">
                        {item?.name || "؟"}
                        <span className="ms-2 text-[10px] text-[var(--bb-muted)]">{typeLabel(ing.itemType)}</span>
                      </span>
                      <span className={`text-lg ${short ? "text-[var(--bb-bad)]" : "text-[var(--bb-title)]"}`} dir="ltr">
                        {fmtQty(qty)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--bb-muted)]">
                      للدفعة {fmtQty(ing.qty)} {item?.unit || ""} · للجاري {fmtQty(forOnHand)}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--bb-gold)_12%,transparent)]">
                      <div
                        className={`h-full ${short ? "bg-[var(--bb-bad)]" : "bg-[var(--bb-ok)]"}`}
                        style={{
                          width: `${Math.min(100, ing.qty > 0 ? (Math.max(0, qty) / ing.qty) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}
