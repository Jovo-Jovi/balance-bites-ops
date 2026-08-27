"use client";

import { useMemo, useState } from "react";
import { ActionBtn, Empty, Field, Modal, Select, TextInput } from "@/components/invoices/ui";
import { fmt, fmtQty, todayISO } from "@/lib/finance/helpers";
import { getHawalekAmount, getTotalReturns, isExpiredDisp, normalizeDisposition } from "@/lib/finance/returns-live";
import type { ReturnLine } from "@/lib/invoices/types";
import { useFinanceApp } from "./finance-context";

export function ReturnsTool() {
  const app = useFinanceApp();
  const [open, setOpen] = useState(false);
  const haw = getHawalekAmount(app.returns);
  const ret = getTotalReturns(app.returns);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--bb-muted)]">
        إعادة للمخزون تخفّض استهلاك الوصفة. التالف/حوالك لا يُعاد ويُحمَّل على الربح.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="bb-glass p-3 text-sm">
          مرتجعات فواتير <span dir="ltr">{fmt(ret)} EGP</span>
        </p>
        <p className="bb-glass p-3 text-sm">
          هوالك <span dir="ltr">{fmt(haw)} EGP</span>
        </p>
      </div>
      <ActionBtn onClick={() => setOpen(true)}>مرتجع جديد</ActionBtn>
      {app.returns.length === 0 ? (
        <Empty>لا مرتجعات</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {app.returns.map((r) => (
            <li key={r.id} className="bb-glass flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[var(--bb-title)]">{r.customerName || r.invoiceNumber || "مرتجع مخزون"}</p>
                <p className="text-xs text-[var(--bb-muted)]">
                  {r.date} · {r.disposition || "expired"} · {r.items?.length || 0} صنف
                </p>
              </div>
              <span dir="ltr">{fmt(r.amount || 0)} EGP</span>
              <ActionBtn tone="danger" onClick={() => app.removeReturn(r.id)}>
                حذف
              </ActionBtn>
            </li>
          ))}
        </ul>
      )}
      <ReturnModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function ReturnModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <ReturnModalForm onClose={onClose} />;
}

function ReturnModalForm({ onClose }: { onClose: () => void }) {
  const app = useFinanceApp();

  const customerOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; invCount: number }>();
    app.customers.forEach((c) => {
      map.set(c.id, { id: c.id, name: c.name || "—", phone: c.phone || "", invCount: 0 });
    });
    app.invoices.forEach((inv) => {
      if (inv.customerId) {
        const hit = map.get(inv.customerId);
        if (hit) hit.invCount += 1;
        else {
          map.set(inv.customerId, {
            id: inv.customerId,
            name: inv.customerName || "—",
            phone: inv.customerPhone || "",
            invCount: 1,
          });
        }
      } else if (inv.customerName) {
        const key = `name:${inv.customerName.trim()}`;
        const hit = map.get(key);
        if (hit) hit.invCount += 1;
        else map.set(key, { id: key, name: inv.customerName, phone: inv.customerPhone || "", invCount: 1 });
      }
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [app.customers, app.invoices]);

  const startCust =
    app.lastCustomerId && customerOptions.some((c) => c.id === app.lastCustomerId) ? app.lastCustomerId : "";
  const [customerId, setCustomerId] = useState(startCust);
  const [invoiceId, setInvoiceId] = useState("");
  const [date, setDate] = useState(todayISO);
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<ReturnLine[]>([]);

  const customerInvoices = useMemo(() => {
    if (!customerId) return app.invoices;
    if (customerId.startsWith("name:")) {
      const name = customerId.slice(5);
      return app.invoices.filter((inv) => !inv.customerId && inv.customerName === name);
    }
    return app.invoices.filter((inv) => inv.customerId === customerId);
  }, [app.invoices, customerId]);

  const inv = app.invoices.find((i) => i.id === invoiceId);

  function pickCustomer(id: string) {
    setCustomerId(id);
    app.setLastCustomer(id);
    setInvoiceId("");
    setItems([]);
  }

  function loadInvoice(id: string) {
    setInvoiceId(id);
    const found = app.invoices.find((i) => i.id === id);
    if (!found) {
      setItems([]);
      return;
    }
    if (found.customerId && found.customerId !== customerId) {
      setCustomerId(found.customerId);
      app.setLastCustomer(found.customerId);
    }
    setItems(
      (found.items || []).map((it) => ({
        productId: it.productId,
        name: it.name,
        qty: it.qty,
        price: it.price,
        lineTotal: it.qty * it.price,
        disposition: "restock",
      })),
    );
  }

  return (
    <Modal
      open
      title="مرتجع"
      wide
      onClose={onClose}
      footer={
        <>
          <ActionBtn
            onClick={() => {
              const live = items.filter((it) => (it.qty || 0) > 0);
              if (!live.length && invoiceId) return;
              app.saveReturn({
                date,
                invoiceId: inv?.id || "",
                invoiceNumber: inv?.invoiceNumber || "",
                customerId: inv?.customerId || (customerId.startsWith("name:") ? "" : customerId),
                customerName:
                  inv?.customerName ||
                  customerOptions.find((c) => c.id === customerId)?.name ||
                  "",
                reason,
                items: live,
                source: inv ? "invoice" : "items",
                disposition: normalizeDisposition(live),
                amount: live.reduce((s, it) => s + (it.lineTotal || (it.qty || 0) * (it.price || 0)), 0),
              });
              onClose();
              setItems([]);
              setInvoiceId("");
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
        <Field label="العميل">
          <Select value={customerId} onChange={(e) => pickCustomer(e.target.value)}>
            <option value="">— كل العملاء / بدون فاتورة —</option>
            {customerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` · ${c.phone}` : ""}
                {c.invCount ? ` (${c.invCount})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="فاتورة (اختياري)">
          <Select value={invoiceId} onChange={(e) => loadInvoice(e.target.value)}>
            <option value="">بدون فاتورة — من المخزون</option>
            {customerInvoices.map((i) => (
              <option key={i.id} value={i.id}>
                {i.invoiceNumber} · {i.customerName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="التاريخ">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="السبب">
            <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </div>
      {!inv ? (
        <ManualReturnLines items={items} setItems={setItems} />
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((it, i) => (
            <li key={`${it.productId}-${i}`} className="grid gap-2 sm:grid-cols-4">
              <span className="sm:col-span-2 text-sm">{it.name}</span>
              <TextInput
                type="number"
                value={String(it.qty || 0)}
                onChange={(e) => {
                  const next = items.slice();
                  const qty = parseFloat(e.target.value) || 0;
                  next[i] = { ...it, qty, lineTotal: qty * (it.price || 0) };
                  setItems(next);
                }}
              />
              <Select
                value={it.disposition === "expired" ? "expired" : "restock"}
                onChange={(e) => {
                  const next = items.slice();
                  next[i] = { ...it, disposition: e.target.value };
                  setItems(next);
                }}
              >
                <option value="restock">إعادة للمخزون</option>
                <option value="expired">تالف / حوالك</option>
              </Select>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ManualReturnLines({
  items,
  setItems,
}: {
  items: ReturnLine[];
  setItems: (items: ReturnLine[]) => void;
}) {
  const app = useFinanceApp();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [disp, setDisp] = useState("restock");
  return (
    <div className="mt-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">منتج</option>
          {app.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <TextInput type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Select value={disp} onChange={(e) => setDisp(e.target.value)}>
          <option value="restock">إعادة للمخزون</option>
          <option value="expired">تالف / حوالك</option>
        </Select>
        <ActionBtn
          onClick={() => {
            const p = app.products.find((x) => x.id === productId);
            if (!p) return;
            const q = parseFloat(qty) || 0;
            setItems([
              ...items,
              {
                productId: p.id,
                name: p.name,
                qty: q,
                price: p.unitPrice,
                lineTotal: q * p.unitPrice,
                disposition: disp,
              },
            ]);
          }}
        >
          إضافة
        </ActionBtn>
      </div>
      <ul className="mt-2 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex justify-between gap-2 py-1">
            <span>
              {it.name} · {isExpiredDisp(it, { disposition: it.disposition }) ? "حوالك" : "إعادة"}
            </span>
            <span dir="ltr">{fmtQty(it.qty || 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
