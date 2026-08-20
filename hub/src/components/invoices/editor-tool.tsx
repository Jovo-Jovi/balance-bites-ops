"use client";

import { useRef, useState } from "react";
import { PRINT_PAGE_SIZES } from "@/lib/invoices/print-layout";
import { useInvoiceApp } from "./invoice-context";
import { CustomerBrief, CustomerPickList } from "./customer-brief";
import { Accordion, ActionBtn, Empty, Field, Modal, TextArea, TextInput } from "./ui";
import { PrintLookPicker } from "./print-look-picker";
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
  const [printOpen, setPrintOpen] = useState(false);
  const [q, setQ] = useState("");
  const suppressCustFocus = useRef(false);

  function openCustomerPicker() {
    setCustOpen(true);
  }

  function closeCustomerPicker() {
    setCustOpen(false);
    setQ("");
    suppressCustFocus.current = true;
    window.setTimeout(() => {
      suppressCustFocus.current = false;
    }, 200);
  }

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
        <ActionBtn tone="ghost" onClick={() => setPrintOpen(true)}>
          طباعة
        </ActionBtn>
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

      <Accordion title="بيانات الفاتورة">
        <div className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم العميل">
          <div className="flex gap-2">
            <TextInput
              value={draft.customerName}
              onChange={(e) => app.setDraft({ customerName: e.target.value })}
              onFocus={() => {
                if (!suppressCustFocus.current) openCustomerPicker();
              }}
              onClick={() => openCustomerPicker()}
              placeholder="اضغط لاختيار عميل..."
              className="cursor-pointer"
            />
            <ActionBtn tone="ghost" onClick={openCustomerPicker}>
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
        </div>
      </Accordion>

      <Accordion title="تفاصيل الطلب">
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
                    data-tone="danger"
                    className="bb-btn min-h-11 border border-[var(--bb-bad)] text-[var(--bb-bad)]"
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
      </Accordion>

      <Accordion title="المجاميع والملاحظات">
      <div className="ms-auto w-full max-w-sm">
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
      </div>

      <div className="mt-4">
        <Field label="ملاحظات">
          <TextArea
            rows={3}
            value={draft.notes}
            onChange={(e) => app.setDraft({ notes: e.target.value })}
            placeholder="أي ملاحظات إضافية..."
          />
        </Field>
      </div>
      </Accordion>

      <Modal
        open={custOpen}
        title="اختر عميل"
        onClose={closeCustomerPicker}
      >
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          className="mb-3"
          autoFocus
        />
        <CustomerPickList
          query={q}
          onPick={(id) => {
            const { showHistory } = app.selectCustomer(id);
            closeCustomerPicker();
            if (showHistory) setHistId(id);
          }}
        />
      </Modal>

      <ProductPicker open={prodOpen} onClose={() => setProdOpen(false)} />
      <PrintChooser
        open={printOpen}
        showNet={Boolean(enriched && enriched.salesStatus !== "active")}
        onClose={() => setPrintOpen(false)}
      />
      <CustomerBrief
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

function PrintChooser({
  open,
  showNet,
  onClose,
}: {
  open: boolean;
  showNet: boolean;
  onClose: () => void;
}) {
  const app = useInvoiceApp();
  return (
    <Modal
      open={open}
      title="طباعة الفاتورة"
      onClose={onClose}
      footer={
        <>
          <ActionBtn
            onClick={() => {
              app.printInvoice("original", app.printLook);
              onClose();
            }}
          >
            أصلية
          </ActionBtn>
          {showNet ? (
            <ActionBtn
              tone="ghost"
              onClick={() => {
                app.printInvoice("net", app.printLook);
                onClose();
              }}
            >
              للدفع
            </ActionBtn>
          ) : null}
        </>
      }
    >
      <p className="mb-3 text-sm text-[var(--bb-muted)]">اختر مظهر الطباعة ثم اطبع</p>
      <PrintLookPicker name="print-look" />
      <label className="mt-4 block text-sm text-[var(--bb-muted)]">
        حجم الصفحة
        <select
          value={app.pageSize}
          onChange={(e) =>
            app.setPageSize(e.target.value as typeof app.pageSize)
          }
          className="bb-glass-input mt-1 w-full px-3 py-2 text-[var(--bb-text)] outline-none"
        >
          {PRINT_PAGE_SIZES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </Modal>
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
          aria-pressed={cat === ""}
          className={`bb-btn rounded-full text-xs ${cat === "" ? "border border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]" : "bb-glass"}`}
        >
          الكل
        </button>
        {app.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            aria-pressed={cat === c.id}
            className={`bb-btn rounded-full text-xs ${cat === c.id ? "border border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]" : "bb-glass"}`}
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
