"use client";

import { useMemo, useState } from "react";
import { ActionBtn, Empty, Field, Select, TextInput } from "@/components/invoices/ui";
import { fmt, fmtQty, num, roundQty } from "@/lib/finance/helpers";
import { PREP_PRINT_MODES } from "@/lib/finance/print-prep";
import { calcPrepAggregate, recipeSellPrice } from "@/lib/finance/recipes";
import { prepBuyQty } from "@/lib/finance/reports";
import type { Customer } from "@/lib/invoices/types";
import type { ItemKind } from "./finance-context";
import { useFinanceApp } from "./finance-context";
import { PurchaseModal } from "./purchase-modal";
import { SectionChips } from "./section-chips";

const SECTIONS = [
  { id: "prep", label: "التحضير" },
  { id: "prod", label: "الإنتاج" },
] as const;

export function FlowTool() {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("prep");
  return (
    <div className="flex flex-col gap-4">
      <SectionChips items={[...SECTIONS]} value={section} onChange={setSection} />
      {section === "prep" ? <PrepSection /> : <ProdSection />}
    </div>
  );
}

function PrepSection() {
  const app = useFinanceApp();
  const [customerId, setCustomerId] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [units, setUnits] = useState("1");
  const [buy, setBuy] = useState<{ type: ItemKind; itemId: string; qty: number } | null>(null);

  const customer = app.customers.find((c) => c.id === customerId) || null;
  const onHandByRecipe = useMemo(() => {
    const map: Record<string, number> = {};
    app.productSummary.forEach((r) => {
      if (r.recipeId) map[r.recipeId] = r.onHand;
    });
    return map;
  }, [app.productSummary]);

  const agg = useMemo(
    () =>
      calcPrepAggregate(app.prepLines, app.recipes, {
        prodMode: app.prepProdMode,
        onHandByRecipe,
        findItem: app.findItem,
        ledger: app.ledger,
      }),
    [app.prepLines, app.recipes, app.prepProdMode, onHandByRecipe, app.findItem, app.ledger],
  );

  function addBoardLine() {
    if (!recipeId) return;
    const u = roundQty(parseFloat(units) || 0);
    if (!(u > 0)) return;
    const existing = app.prepLines.find((l) => l.recipeId === recipeId);
    const next = existing
      ? app.prepLines.map((l) => (l.recipeId === recipeId ? { ...l, units: roundQty(l.units + u) } : l))
      : [...app.prepLines, { recipeId, units: u }];
    app.setPrepLines(next);
  }

  function addToDraft() {
    if (!customer || !recipeId) return;
    const rec = app.recipes.find((r) => r.id === recipeId);
    if (!rec) return;
    const p = rec.productId ? app.products.find((x) => x.id === rec.productId) : null;
    const u = roundQty(parseFloat(units) || 0);
    if (!(u > 0)) return;
    app.addToCustomerDraft(customer, {
      productId: p ? p.id : rec.productId || null,
      name: p ? p.name : rec.name,
      packType: p?.packType || "",
      weight: p?.weight || rec.productWeight || "",
      categoryId: p?.categoryId || rec.categoryId || null,
      qty: u,
      price: p ? num(p.unitPrice) : recipeSellPrice(rec, app.products),
    });
  }

  return (
    <>
      <p className="text-sm text-[var(--bb-muted)]">
        مسودة لكل عميل (اعتماد يكتب فاتورة #INV-). الإنتاج زر منفصل — لا تخلط الاعتمادين.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="العميل">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— اختر عميلاً —</option>
            {app.customers.map((c: Customer) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="وصفة / منتج">
          <Select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
            <option value="">—</option>
            {app.recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="الكمية">
          <TextInput type="number" min={0} value={units} onChange={(e) => setUnits(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          <ActionBtn onClick={addToDraft} disabled={!customer}>
            إلى مسودة العميل
          </ActionBtn>
          <ActionBtn tone="ghost" onClick={addBoardLine}>
            إلى اللوحة
          </ActionBtn>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56">
          <Field label="طباعة اللوحة">
            <Select
              value={app.prepPrintMode}
              onChange={(e) => app.setPrepPrintMode(e.target.value as (typeof PREP_PRINT_MODES)[number]["id"])}
            >
              {PREP_PRINT_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <ActionBtn onClick={() => app.printPrepBoard()}>طباعة</ActionBtn>
        <ActionBtn
          tone="ghost"
          onClick={() => app.setPrepProdMode(app.prepProdMode === "all" ? "net" : "all")}
        >
          الإنتاج: {app.prepProdMode === "net" ? "صافي (بعد الجاهز)" : "كل الكمية"}
        </ActionBtn>
        <ActionBtn onClick={() => app.sendBoardToProduction()}>إرسال اللوحة للإنتاج</ActionBtn>
      </div>

      <h2 className="text-sm text-[var(--bb-muted)]">مسودات الفواتير</h2>
      <div className="flex flex-wrap gap-2">
        <ActionBtn tone="ghost" onClick={() => app.downloadPrepDraftSheet()}>
          تحميل الشيت المجموع
        </ActionBtn>
        <ActionBtn onClick={() => app.printPrepDraftSheet()}>طباعة الشيت</ActionBtn>
        <ActionBtn tone="ghost" onClick={() => app.printPrepDraftComponents()}>
          طباعة المكونات
        </ActionBtn>
      </div>
      {app.invoiceDrafts.length === 0 ? (
        <Empty>لا مسودات — اختر عميلاً وأضف صنفاً</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {app.invoiceDrafts.map((d) => (
            <li key={d.id} className="bb-glass p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-[var(--bb-title)]">{d.customerName}</p>
                <span className="text-xs text-[var(--bb-muted)]">{d.status}</span>
              </div>
              <ul className="mt-2 text-sm">
                {(d.items || []).map((it, i) => (
                  <li key={`${it.productId}-${i}`} className="flex justify-between gap-2">
                    <span>{it.name}</span>
                    <span dir="ltr">
                      {fmtQty(it.qty)} × {fmt(it.price)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn onClick={() => void app.approveDraft(d.id)}>اعتماد وإضافة للفواتير</ActionBtn>
                <ActionBtn tone="ghost" onClick={() => app.printPrepDraft(d.id)}>
                  طباعة
                </ActionBtn>
                <ActionBtn tone="danger" onClick={() => app.removePending(d.id)}>
                  حذف المسودة
                </ActionBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-sm text-[var(--bb-muted)]">ورقة المكوّنات المجمّعة</h2>
      {agg.lines.length === 0 ? (
        <Empty>أضف بنوداً للوحة لرؤية العجز والشراء</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {agg.lines.map((l) => {
            const need = prepBuyQty(l);
            return (
              <li key={`${l.type}|${l.itemId}`} className="bb-glass flex flex-wrap items-center gap-2 p-3">
                <span className="flex-1">{l.name}</span>
                <span className={l.ok ? "text-[var(--bb-ok)]" : "text-[var(--bb-bad)]"} dir="ltr">
                  يلزم {fmtQty(l.needed)} · رصيد {fmtQty(l.stock)}
                  {!l.ok ? ` · ينقص ${fmtQty(l.shortfall)}` : ""}
                </span>
                <ActionBtn
                  tone={need > 0 ? "primary" : "ghost"}
                  onClick={() =>
                    setBuy({ type: l.type as ItemKind, itemId: l.itemId, qty: need })
                  }
                >
                  {need > 0 ? `شراء ${fmtQty(need)}` : "شراء"}
                </ActionBtn>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="text-sm text-[var(--bb-muted)]">لوحة التحضير</h2>
      {app.prepLines.length === 0 ? (
        <Empty>اللوحة فارغة</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {app.prepLines.map((l) => {
            const rec = app.recipes.find((r) => r.id === l.recipeId);
            return (
              <li key={l.recipeId} className="bb-glass flex items-center gap-2 p-3">
                <span className="flex-1">{rec?.name || l.recipeId}</span>
                <TextInput
                  className="w-24"
                  type="number"
                  value={String(l.units)}
                  onChange={(e) =>
                    app.setPrepLines(
                      app.prepLines.map((x) =>
                        x.recipeId === l.recipeId ? { ...x, units: parseFloat(e.target.value) || 0 } : x,
                      ),
                    )
                  }
                />
                <ActionBtn
                  tone="danger"
                  onClick={() => app.setPrepLines(app.prepLines.filter((x) => x.recipeId !== l.recipeId))}
                >
                  ✕
                </ActionBtn>
              </li>
            );
          })}
        </ul>
      )}

      <PurchaseModal open={!!buy} prefill={buy || undefined} onClose={() => setBuy(null)} />
    </>
  );
}

function ProdSection() {
  const app = useFinanceApp();
  const [recipeId, setRecipeId] = useState("");
  const [units, setUnits] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <>
      <p className="text-sm text-[var(--bb-muted)]">
        اعتماد الإنتاج يسجّل دورات ويخصم المكوّنات عبر دفتر المشتريات/الاستهلاك. مسودات الفاتورة لا تظهر هنا.
      </p>
      <h2 className="text-sm text-[var(--bb-muted)]">بانتظار الإنتاج</h2>
      {app.awaitingProduction.length === 0 ? (
        <Empty>لا طلبات بانتظار الإنتاج</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {app.awaitingProduction.map((p) => (
            <li key={p.id} className="bb-glass p-4">
              <p className="text-[var(--bb-title)]">{p.title}</p>
              <p className="text-xs text-[var(--bb-muted)]">{p.customerName}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn onClick={() => void app.approveProduction(p.id)}>اعتماد الإنتاج</ActionBtn>
                <ActionBtn tone="ghost" onClick={() => app.updateDraft(p.id, { status: "pending" })}>
                  إرجاع للتحضير
                </ActionBtn>
                <ActionBtn
                  tone="danger"
                  onClick={() => {
                    if (!window.confirm(`حذف «${p.title || "طلب التحضير"}»؟`)) return;
                    app.removePending(p.id);
                  }}
                >
                  حذف
                </ActionBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-sm text-[var(--bb-muted)]">طلبات التحضير (لم تُرسل بعد)</h2>
      {app.prepOrders.filter((p) => p.status !== "awaiting_production").length === 0 ? (
        <Empty>لا طلبات معلّقة — أرسل اللوحة من التحضير</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {app.prepOrders
            .filter((p) => p.status !== "awaiting_production")
            .map((p) => (
              <li key={p.id} className="bb-glass flex flex-wrap items-center gap-2 p-3">
                <span className="flex-1">{p.title}</span>
                <ActionBtn onClick={() => app.sendOrderToProduction(p.id)}>إرسال للإنتاج</ActionBtn>
                <ActionBtn
                  tone="danger"
                  onClick={() => {
                    if (!window.confirm(`حذف «${p.title || "طلب التحضير"}»؟`)) return;
                    app.removePending(p.id);
                  }}
                >
                  حذف
                </ActionBtn>
              </li>
            ))}
        </ul>
      )}
      <h2 className="text-sm text-[var(--bb-muted)]">دورة إنتاج يدوية</h2>
      <div className="grid gap-3 sm:grid-cols-3">
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
        <Field label="وحدات">
          <TextInput type="number" value={units} onChange={(e) => setUnits(e.target.value)} />
        </Field>
        <Field label="ملاحظات">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <ActionBtn
        onClick={() => {
          if (!recipeId) return;
          app.addProductionRun(recipeId, parseFloat(units) || 0, notes);
          setUnits("");
        }}
      >
        تسجيل دورة
      </ActionBtn>
      {app.production.length === 0 ? (
        <Empty>لا دورات إنتاج</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {app.production.slice(0, 20).map((p) => (
            <li key={p.id} className="bb-glass flex justify-between p-3 text-sm">
              <span>
                {p.recipeName} · {p.date}
              </span>
              <span dir="ltr">{fmtQty(p.unitsProduced)} وحدة</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
