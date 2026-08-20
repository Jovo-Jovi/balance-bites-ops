"use client";

import { useMemo, useState } from "react";
import { useInvoiceApp } from "./invoice-context";
import { ActionBtn, Empty, Field, Modal, TextArea, TextInput } from "./ui";
import { calcTotals, fmt, fmtQty, itemRetKey } from "@/lib/invoices/helpers";
import {
  enrichInvoice,
  getItemReturnBreakdown,
  hasItemReturnInfo,
  salesStatusLabel,
} from "@/lib/invoices/returns";
import { isInactiveProduct } from "@/lib/invoices/helpers";

export function EditorTool() {
  const app = useInvoiceApp();
  const { draft, strings } = app;
  const totals = calcTotals(draft.items, draft.discount);
  const saved = draft.loadedInvoiceId
    ? app.invoices.find((i) => i.id === draft.loadedInvoiceId)
    : null;
  const enriched = saved ? enrichInvoice(app.returns, saved) : null;
  const breakdown = getItemReturnBreakdown(
    app.returns,
    draft.loadedInvoiceId,
    draft.items,
  );
  const pending = draft.pendingId
    ? app.pending.find((p) => p.id === draft.pendingId)
    : null;

  const [custOpen, setCustOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [histId, setHistId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <ActionBtn onClick={app.newInvoice} tone="ghost">
          فاتورة جديدة
        </ActionBtn>
        <ActionBtn onClick={() => void app.saveInvoice()}>حفظ</ActionBtn>
        {draft.pendingId ? (
          <ActionBtn onClick={() => void app.completePending()}>إصدار المسودة</ActionBtn>
        ) : null}
        <ActionBtn tone="ghost" onClick={() => app.printInvoice("original")}>
          طباعة أصلية
        </ActionBtn>
        {enriched && enriched.salesStatus !== "active" ? (
          <ActionBtn tone="ghost" onClick={() => app.printInvoice("net")}>
            طباعة للدفع
          </ActionBtn>
        ) : null}
      </div>

      {pending ? (
        <div className="rounded-[var(--bb-radius)] border border-[var(--bb-warn)]/40 bg-[color-mix(in_srgb,var(--bb-warn)_10%,transparent)] px-4 py-3 text-sm">
          مسودة تحضير: {pending.title || "طلب"} ·{" "}
          {pending.prepSummary?.stockOk ? "المخزون كافٍ" : "ينقص مكونات — راجع المالية"}{" "}
          · العميل: {draft.customerName || "لم يُعيَّن بعد"}
        </div>
      ) : null}

      {enriched && enriched.returnInfo ? (
        <ReturnBanner enriched={enriched} cur={strings.cur} />
      ) : null}

      <section className="bb-glass grid gap-3 p-4 sm:grid-cols-2">
        <Field label="اسم العميل">
          <div className="flex gap-2">
            <TextInput
              value={draft.customerName}
              onChange={(e) => app.setDraft({ customerName: e.target.value })}
              placeholder="اسم العميل..."
            />
            <ActionBtn tone="ghost" onClick={() => setCustOpen(true)}>
              اختر
            </ActionBtn>
          </div>
        </Field>
        <Field label="رقم الفاتورة">
          <TextInput
            value={draft.invoiceNumber}
            onChange={(e) => app.setDraft({ invoiceNumber: e.target.value })}
          />
        </Field>
        <Field label="التاريخ">
          <TextInput
            type="date"
            value={draft.date}
            onChange={(e) => app.setDraft({ date: e.target.value })}
          />
        </Field>
        <Field label="التليفون">
          <TextInput
            dir="ltr"
            value={draft.customerPhone}
            onChange={(e) => app.setDraft({ customerPhone: e.target.value })}
            placeholder="+20 ..."
          />
        </Field>
      </section>

      <section className="bb-glass overflow-hidden p-4">
        <div className="mb-3 hidden grid-cols-[1fr_4.5rem_6rem_6rem_2.5rem] gap-2 text-[11px] tracking-wide text-[var(--bb-muted)] uppercase sm:grid">
          <span>{strings.hItem}</span>
          <span className="text-center">{strings.hQty}</span>
          <span>{strings.hPrice}</span>
          <span>{strings.hSub}</span>
          <span />
        </div>
        {draft.items.length === 0 ? (
          <Empty>لا أصناف بعد — أضف من الكتالوج أو سطراً يدوياً</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {draft.items.map((it, i) => {
              const info = breakdown[itemRetKey(it)];
              const cat = it.categoryId
                ? app.categories.find((c) => c.id === it.categoryId)
                : null;
              return (
                <li
                  key={`${it.productId || "m"}-${i}`}
                  className="grid gap-2 border-b border-[var(--bb-line)]/50 pb-3 sm:grid-cols-[1fr_4.5rem_6rem_6rem_2.5rem] sm:items-start"
                >
                  <div>
                    <TextInput
                      value={it.name}
                      placeholder="اسم المنتج..."
                      onChange={(e) => app.setLine(i, { name: e.target.value })}
                    />
                    {it.packType || it.weight ? (
                      <p className="mt-1 text-xs text-[var(--bb-muted)]">
                        {[it.packType, it.weight].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {cat ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--bb-muted)]">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: cat.color }}
                        />
                        {cat.name}
                      </span>
                    ) : null}
                    {hasItemReturnInfo(info) ? (
                      <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-[var(--bb-muted)]">
                        {info.soldTo.map((s) => (
                          <span key={`${s.customerName}-${s.invoiceNumber}`}>
                            {fmtQty(s.qty)} → {s.customerName}
                          </span>
                        ))}
                        {info.expiredQty > 0 ? <span>تالف {fmtQty(info.expiredQty)}</span> : null}
                        {info.restockQty > 0 ? (
                          <span>مخزون {fmtQty(info.restockQty)}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <TextInput
                    type="number"
                    min={0}
                    step={1}
                    value={it.qty}
                    onChange={(e) =>
                      app.setLine(i, { qty: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <TextInput
                    type="number"
                    min={0}
                    step={0.5}
                    value={it.price}
                    onChange={(e) =>
                      app.setLine(i, { price: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <p className="self-center text-sm" dir="ltr">
                    {fmt((it.qty || 0) * (it.price || 0))} {strings.cur}
                  </p>
                  <button
                    type="button"
                    className="bb-btn min-h-11 text-[var(--bb-bad)]"
                    onClick={() => app.removeLine(i)}
                    aria-label="حذف السطر"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionBtn onClick={() => setProdOpen(true)}>من الكتالوج</ActionBtn>
          <ActionBtn tone="ghost" onClick={app.addManualLine}>
            سطر يدوي
          </ActionBtn>
        </div>
      </section>

      <section className="bb-glass ms-auto w-full max-w-sm p-4">
        <Field label={`${strings.discLabel} %`}>
          <TextInput
            type="number"
            min={0}
            step={0.5}
            value={draft.discount}
            onChange={(e) =>
              app.setDraft({ discount: parseFloat(e.target.value) || 0 })
            }
          />
        </Field>
        <div className="mt-3 flex justify-between text-sm">
          <span>{strings.lSubtotal}</span>
          <span dir="ltr">
            {fmt(totals.subtotal)} {strings.cur}
          </span>
        </div>
        {totals.discount > 0 ? (
          <div className="mt-1 flex justify-between text-sm text-[var(--bb-muted)]">
            <span>{strings.discLabel}</span>
            <span dir="ltr">
              − {fmt(totals.discountAmount)} {strings.cur}
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex justify-between border-t border-[var(--bb-line)] pt-3 text-lg text-[var(--bb-title)]">
          <span>{strings.lTotal}</span>
          <span dir="ltr">
            {fmt(totals.total)} {strings.cur}
          </span>
        </div>
        {enriched && enriched.returnInfo ? (
          <>
            <div className="mt-2 flex justify-between text-sm text-[var(--bb-bad)]">
              <span>مرتجع</span>
              <span dir="ltr">
                − {fmt(enriched.returnInfo.totalRevenue)} {strings.cur}
              </span>
            </div>
            <div className="mt-2 flex justify-between font-medium">
              <span>المطلوب سداده</span>
              <span dir="ltr">
                {fmt(enriched.net)} {strings.cur}
              </span>
            </div>
          </>
        ) : null}
      </section>

      <Field label="ملاحظات">
        <TextArea
          rows={3}
          value={draft.notes}
          onChange={(e) => app.setDraft({ notes: e.target.value })}
          placeholder="أي ملاحظات إضافية..."
        />
      </Field>

      <Modal
        open={custOpen}
        title="اختر عميل"
        onClose={() => {
          setCustOpen(false);
          setQ("");
        }}
      >
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          className="mb-3"
        />
        <CustomerPickList
          query={q}
          onPick={(id) => {
            const { showHistory } = app.selectCustomer(id);
            setCustOpen(false);
            setQ("");
            if (showHistory) setHistId(id);
          }}
        />
      </Modal>

      <ProductPicker open={prodOpen} onClose={() => setProdOpen(false)} />
      <CustomerHistory
        customerId={histId}
        onClose={() => setHistId(null)}
        onLoad={(id) => {
          if (
            window.confirm(
              "تحميل هذه الفاتورة؟ ستُستبدل البيانات الحالية.",
            )
          ) {
            app.loadInvoice(id);
            setHistId(null);
          }
        }}
      />
    </div>
  );
}

function ReturnBanner({
  enriched,
  cur,
}: {
  enriched: ReturnType<typeof enrichInvoice>;
  cur: string;
}) {
  const info = enriched.returnInfo;
  if (!info) return null;
  return (
    <div className="rounded-[var(--bb-radius)] border border-[var(--bb-line)] px-4 py-3 text-sm">
      <p className="text-[var(--bb-title)]">
        {salesStatusLabel(enriched.salesStatus)} · −{fmt(info.totalRevenue)} {cur} ·{" "}
        {info.totalQty} وحدة
      </p>
      <ul className="mt-2 space-y-2 text-[var(--bb-muted)]">
        {info.records.map((ret) => (
          <li key={ret.id}>
            <span>{ret.date || "—"}</span>
            {ret.reason ? ` · ${ret.reason}` : ""}
            <ul className="mt-1">
              {(ret.items || []).map((it, i) => (
                <li key={`${ret.id}-${i}`}>
                  {it.name} ×{it.qty} · {it.disposition === "restock" ? "مخزون" : "تالف"}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CustomerPickList({
  query,
  onPick,
}: {
  query: string;
  onPick: (id: string) => void;
}) {
  const { customers, invoices } = useInvoiceApp();
  const q = query.toLowerCase();
  const list = customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").includes(q),
  );
  if (!list.length) return <Empty>لا يوجد عملاء</Empty>;
  return (
    <ul className="flex flex-col gap-2">
      {list.map((c) => {
        const n = invoices.filter((i) => i.customerId === c.id).length;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c.id)}
              className="bb-glass w-full px-3 py-3 text-start"
            >
              <span className="block text-[var(--bb-title)]">{c.name}</span>
              <span className="text-xs text-[var(--bb-muted)]">
                {c.phone || "بدون هاتف"} · {n} فاتورة
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CustomerHistory({
  customerId,
  onClose,
  onLoad,
}: {
  customerId: string | null;
  onClose: () => void;
  onLoad: (id: string) => void;
}) {
  const app = useInvoiceApp();
  const c = app.customers.find((x) => x.id === customerId);
  const invs = useMemo(() => {
    if (!customerId) return [];
    return app.invoices
      .filter((i) => i.customerId === customerId)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((inv) => enrichInvoice(app.returns, inv));
  }, [app.invoices, app.returns, customerId]);
  const net = invs
    .filter((e) => e.salesStatus !== "full")
    .reduce((s, e) => s + e.net, 0);
  return (
    <Modal
      open={Boolean(customerId && c)}
      title={c ? c.name : ""}
      onClose={onClose}
      footer={
        <ActionBtn onClick={onClose}>موافق — فاتورة جديدة {app.draft.invoiceNumber}</ActionBtn>
      }
    >
      <p className="mb-3 text-sm text-[var(--bb-muted)]">
        {invs.length} فاتورة سابقة · صافي {fmt(net)} {app.strings.cur}
      </p>
      {invs.length === 0 ? (
        <Empty>لا يوجد فواتير سابقة</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {invs.map((e) => (
            <li key={e.inv.id}>
              <button
                type="button"
                onClick={() => onLoad(e.inv.id)}
                className="bb-glass w-full px-3 py-3 text-start"
              >
                <span className="block text-[var(--bb-title)]">
                  {e.inv.invoiceNumber} · {e.inv.date}
                </span>
                <span className="text-xs text-[var(--bb-muted)]">
                  {fmt(e.net)} {app.strings.cur}
                  {e.salesStatus !== "active"
                    ? ` · ${salesStatusLabel(e.salesStatus)}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ProductPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useInvoiceApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [pickedCats, setPickedCats] = useState<Record<string, boolean>>({});

  const visible = app.activeProducts.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat && p.categoryId !== cat) return false;
    return true;
  });
  const catCount = (id: string) =>
    app.activeProducts.filter((p) => p.categoryId === id).length;

  return (
    <Modal open={open} title="اختر منتج" onClose={onClose}>
      <div className="mb-3 flex flex-wrap gap-2">
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
            {c.name.split("·")[0].trim()}
          </button>
        ))}
      </div>
      {cat ? (
        <ActionBtn
          className="mb-3"
          onClick={() => {
            const n = app.addProducts(
              app.activeProducts.filter((p) => p.categoryId === cat),
            );
            if (n) onClose();
          }}
        >
          إضافة كل التصنيف ({catCount(cat)})
        </ActionBtn>
      ) : null}
      <div className="mb-3 rounded-[var(--bb-radius)] border border-[var(--bb-line)]/70 p-3">
        <p className="mb-2 text-xs text-[var(--bb-muted)]">تصنيفات متعددة</p>
        <div className="mb-2 flex max-h-32 flex-col gap-1 overflow-y-auto">
          {app.categories
            .filter((c) => catCount(c.id) > 0)
            .map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!pickedCats[c.id]}
                  onChange={(e) =>
                    setPickedCats((prev) => ({ ...prev, [c.id]: e.target.checked }))
                  }
                />
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: c.color }}
                />
                {c.name} ({catCount(c.id)})
              </label>
            ))}
        </div>
        <ActionBtn
          onClick={() => {
            const ids = Object.entries(pickedCats)
              .filter(([, on]) => on)
              .map(([id]) => id);
            const n = app.addProducts(
              app.activeProducts.filter((p) => p.categoryId && ids.includes(p.categoryId)),
            );
            if (n) onClose();
          }}
        >
          إضافة التصنيفات المحددة
        </ActionBtn>
      </div>
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث..."
        className="mb-3"
      />
      {visible.length === 0 ? (
        <Empty>
          {app.products.length === 0
            ? "الكتالوج فارغ حتى تُدار المنتجات من المالية"
            : "لا نتائج"}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={isInactiveProduct(p)}
                onClick={() => {
                  app.addProduct(p.id);
                }}
                className="bb-glass flex w-full items-center justify-between gap-2 px-3 py-3 text-start"
              >
                <span>
                  <span className="block text-[var(--bb-title)]">{p.name}</span>
                  <span className="text-xs text-[var(--bb-muted)]">
                    {[p.packType, p.weight].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span dir="ltr" className="text-sm">
                  {fmt(p.unitPrice)} {app.strings.cur}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
