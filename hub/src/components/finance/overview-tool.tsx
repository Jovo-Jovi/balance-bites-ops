"use client";

import { useState } from "react";
import { fmt, todayISO } from "@/lib/finance/helpers";
import { recipeSellPrice, calcCOGS } from "@/lib/finance/recipes";
import { investorShareOf } from "@/lib/finance/reports";
import { ActionBtn, Empty, Field, Modal, Select, TextArea, TextInput } from "@/components/invoices/ui";
import { useFinanceApp } from "./finance-context";
import { SectionChips, StatCard, plTone, plWord } from "./section-chips";

const SECTIONS = [
  { id: "dash", label: "اللوحة" },
  { id: "cogs", label: "COGS" },
  { id: "profit", label: "الأرباح" },
  { id: "investors", label: "المستثمرون" },
] as const;

export function OverviewTool() {
  const app = useFinanceApp();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("dash");
  const L = app.linked;
  const spent = L.spent;

  return (
    <div className="flex flex-col gap-4">
      <SectionChips items={[...SECTIONS]} value={section} onChange={setSection} />
      {section === "dash" ? <Dash /> : null}
      {section === "cogs" ? <Cogs /> : null}
      {section === "profit" ? <Profit /> : null}
      {section === "investors" ? <Investors /> : null}
      <p className="text-xs text-[var(--bb-muted)]">
        المصروف {fmt(spent)} EGP · الربح لا يشمل المخزون المتبقي (أصل). المعلق يُحصَّل في الإغلاق دائماً.
      </p>
    </div>
  );
}

function Dash() {
  const app = useFinanceApp();
  const L = app.linked;
  const alerts = [
    ...app.materials.map((i) => ({ i, type: "bb_materials" as const })),
    ...app.packages.map((i) => ({ i, type: "bb_packages" as const })),
    ...app.stickers.map((i) => ({ i, type: "bb_stickers" as const })),
  ].filter(({ i, type }) => app.itemStatus(i, type) !== "ok");

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="تكلفة المشروع"
          value={`${fmt(L.spent)} EGP`}
          hint={`مشتريات ${fmt(L.purchases)} · تشغيل ${fmt(L.opex)}`}
        />
        <StatCard
          label="إجمالي المبيعات"
          value={`${fmt(L.gross)} EGP`}
          hint={`مدفوع ${fmt(L.paid)} · معلق ${fmt(L.pending)}`}
        />
        <StatCard
          label="قيمة المخزون"
          value={`${fmt(L.stock)} EGP`}
          hint={`نشط ${fmt(L.stockActive)} · غير نشط ${fmt(L.stockInactive)}`}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ShutdownCol
          title="① المخزون يتحول إلى نقد"
          hint="تحصّل المعلق + تبيع/تسترد المخزون بسعر التكلفة"
          liquid={L.shutdownLiquid}
          pl={L.shutdownPL}
        />
        <ShutdownCol
          title="② المخزون خسارة"
          hint="تحصّل المعلق فقط · المخزون المتبقي يُعدم ولا يُحوَّل"
          liquid={L.shutdownLiquidLoss}
          pl={L.shutdownPLLoss}
        />
      </div>
      <p className="text-sm text-[var(--bb-muted)]">
        ① السيولة = مدفوع + معلق + مخزون · النتيجة = السيولة − المصروف. ② السيولة = مدفوع + معلق فقط.
        المعلق يُحصَّل في الحالتين. المخزون بسعر التكلفة وليس سعر التجزئة.
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <StatCard label="مواد" value={`${fmt(L.stockMat)} EGP`} />
        <StatCard label="تغليف" value={`${fmt(L.stockPkg)} EGP`} />
        <StatCard label="ملصقات" value={`${fmt(L.stockStk)} EGP`} />
        <StatCard label="جاهز" value={`${fmt(L.stockFg)} EGP`} />
      </div>
      <div>
        <h2 className="mb-2 text-sm text-[var(--bb-muted)]">تنبيهات المخزون</h2>
        {alerts.length === 0 ? (
          <Empty>جميع مستويات المخزون مقبولة</Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map(({ i, type }) => (
              <li key={`${type}-${i.id}`} className="bb-glass flex justify-between p-3 text-sm">
                <span>{i.name}</span>
                <span className={app.itemStatus(i, type) === "crit" ? "text-[var(--bb-bad)]" : "text-[var(--bb-warn)]"}>
                  {app.itemStatus(i, type) === "crit" ? "حرج" : "منخفض"} · {fmt(app.qtyOf(type, i.id, i))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function ShutdownCol({
  title,
  hint,
  liquid,
  pl,
}: {
  title: string;
  hint: string;
  liquid: number;
  pl: number;
}) {
  return (
    <div
      className={`rounded-[var(--bb-radius)] border p-4 ${
        pl >= -0.009
          ? "border-[var(--bb-ok)]/40 bg-[color-mix(in_srgb,var(--bb-ok)_10%,var(--bb-panel))]"
          : "border-[var(--bb-bad)]/40 bg-[color-mix(in_srgb,var(--bb-bad)_10%,var(--bb-panel))]"
      }`}
    >
      <p className="text-sm text-[var(--bb-title)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--bb-muted)]">{hint}</p>
      <p className="mt-3 text-2xl text-[var(--bb-title)]" dir="ltr">
        {fmt(liquid)} EGP
      </p>
      <p className={`mt-2 text-sm ${pl >= -0.009 ? "text-[var(--bb-ok)]" : "text-[var(--bb-bad)]"}`}>
        {plWord(pl)} {pl >= 0 ? "+" : ""}
        {fmt(pl)} EGP
      </p>
    </div>
  );
}

function Cogs() {
  const app = useFinanceApp();
  if (!app.recipes.length) return <Empty>لا وصفات — أضف وصفة لرؤية تكلفة الوحدة</Empty>;
  return (
    <ul className="flex flex-col gap-2">
      {app.recipes.map((r) => {
        const cogs = calcCOGS(r, app.findItem).total;
        const sell = recipeSellPrice(r, app.products);
        const margin = sell - cogs;
        return (
          <li key={r.id} className="bb-glass p-3">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-[var(--bb-title)]">{r.name}</span>
              <span dir="ltr" className="text-sm">
                COGS {fmt(cogs)} · بيع {fmt(sell)}
              </span>
            </div>
            <p className={`mt-1 text-xs ${plTone(margin) === "ok" ? "text-[var(--bb-ok)]" : "text-[var(--bb-bad)]"}`}>
              هامش {fmt(margin)} EGP {sell ? `· ${fmt((margin / sell) * 100)}%` : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Profit() {
  const app = useFinanceApp();
  const L = app.linked;
  const months = Object.keys(app.monthly).sort().reverse();
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="مبيعات" value={`${fmt(L.gross)} EGP`} />
        <StatCard label="تكلفة المباع" value={`${fmt(L.cogs)} EGP`} />
        <StatCard label="تشغيل + حوالك" value={`${fmt(L.opex + L.hawalekCogs)} EGP`} />
        <StatCard
          label="صافي الربح"
          value={`${fmt(L.netProfit)} EGP`}
          tone={plTone(L.netProfit)}
          hint="مبيعات − COGS المباع − تشغيل − حوالك. المخزون أصل."
        />
      </div>
      {months.length === 0 ? (
        <Empty>لا أشهر بعد</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {months.map((m) => {
            const row = app.monthly[m];
            const net = row.revenue - row.cogs - row.opcost - row.hawalekCogs;
            return (
              <li key={m} className="bb-glass flex flex-wrap justify-between gap-2 p-3 text-sm">
                <span>{m}</span>
                <span dir="ltr">
                  {fmt(row.revenue)} − {fmt(row.cogs)} − {fmt(row.opcost)} − {fmt(row.hawalekCogs)} ={" "}
                  <span className={plTone(net) === "ok" ? "text-[var(--bb-ok)]" : "text-[var(--bb-bad)]"}>
                    {fmt(net)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Investors() {
  const app = useFinanceApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const L = app.linked;
  const shares = investorShareOf(app.investors, L.nav, app.investorTarget.split || "share");
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="رأس المال المدفوع" value={`${fmt(L.invested)} EGP`} />
        <StatCard label="NAV (يشمل المخزون)" value={`${fmt(L.nav)} EGP`} hint="نقد + مخزون + معلق" />
        <StatCard label="صافي الربح" value={`${fmt(L.netProfit)} EGP`} tone={plTone(L.netProfit)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="المطلوب">
          <TextInput
            type="number"
            value={String(app.investorTarget.needed || "")}
            onChange={(e) => app.saveInvestorTarget({ needed: parseFloat(e.target.value) || 0 })}
          />
        </Field>
        <Field label="التوزيع">
          <Select
            value={app.investorTarget.split || "equal"}
            onChange={(e) =>
              app.saveInvestorTarget({ split: e.target.value === "share" ? "share" : "equal" })
            }
          >
            <option value="equal">بالتساوي</option>
            <option value="share">حسب الحصة</option>
          </Select>
        </Field>
        <Field label="بداية المشروع">
          <TextInput
            type="date"
            value={app.investorTarget.projectStart || ""}
            onChange={(e) => app.saveInvestorTarget({ projectStart: e.target.value })}
          />
        </Field>
      </div>
      <ActionBtn onClick={() => setOpen(true)}>مستثمر جديد</ActionBtn>
      {app.investors.length === 0 ? (
        <Empty>لا مستثمرين بعد</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {app.investors.map((p) => (
            <li key={p.id} className="bb-glass flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="text-[var(--bb-title)]">{p.name}</p>
                <p className="text-xs text-[var(--bb-muted)]" dir="ltr">
                  حصة {fmt(p.amount)} · NAV {fmt(shares[p.id] || 0)}
                </p>
              </div>
              <ActionBtn tone="danger" onClick={() => app.removeInvestor(p.id)}>
                حذف
              </ActionBtn>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        title="مستثمر"
        onClose={() => setOpen(false)}
        footer={
          <>
            <ActionBtn
              onClick={() => {
                if (!name.trim()) return;
                app.saveInvestor({
                  name: name.trim(),
                  amount: parseFloat(amount) || 0,
                  phone,
                  notes,
                  date: todayISO(),
                });
                setOpen(false);
                setName("");
                setAmount("");
                setPhone("");
                setNotes("");
              }}
            >
              حفظ
            </ActionBtn>
            <ActionBtn tone="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </ActionBtn>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="الاسم">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="المبلغ">
            <TextInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="هاتف">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="ملاحظات">
            <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
