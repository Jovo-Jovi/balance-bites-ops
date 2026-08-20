import { calcTotals, esc, fmt } from "./helpers";
import { hexA } from "./look";
import { enrichInvoice } from "./returns";
import type {
  Invoice,
  InvoiceDraft,
  InvoiceLine,
  InvoiceStrings,
  InvoiceTheme,
  ReturnRecord,
} from "./types";

export type PrintPageSize = "A4" | "A5" | "letter" | "80mm";

export type PrintMargins = { t: number; r: number; b: number; l: number };

export const DEFAULT_PRINT_MARGINS: PrintMargins = { t: 16, r: 14, b: 16, l: 14 };

export const PRINT_PAGE_SIZES: { id: PrintPageSize; label: string; css: string }[] = [
  { id: "A4", label: "A4", css: "A4 portrait" },
  { id: "A5", label: "A5", css: "A5 portrait" },
  { id: "letter", label: "Letter", css: "letter portrait" },
  { id: "80mm", label: "إيصال 80مم", css: "80mm auto" },
];

export function parsePageSize(value: unknown): PrintPageSize {
  if (value === "A5" || value === "letter" || value === "80mm" || value === "A4") {
    return value;
  }
  return "A4";
}

export function parseMargins(value: unknown): PrintMargins {
  const raw = value && typeof value === "object" ? (value as Partial<PrintMargins>) : {};
  return {
    t: clampMargin(raw.t, DEFAULT_PRINT_MARGINS.t),
    r: clampMargin(raw.r, DEFAULT_PRINT_MARGINS.r),
    b: clampMargin(raw.b, DEFAULT_PRINT_MARGINS.b),
    l: clampMargin(raw.l, DEFAULT_PRINT_MARGINS.l),
  };
}

function clampMargin(n: unknown, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(50, v));
}

export function pageSizeCss(id: PrintPageSize) {
  return PRINT_PAGE_SIZES.find((p) => p.id === id)?.css || "A4 portrait";
}

function paperBox(id: PrintPageSize) {
  if (id === "A5") return { w: "148mm", h: "210mm" };
  if (id === "letter") return { w: "8.5in", h: "11in" };
  if (id === "80mm") return { w: "80mm", h: "auto" };
  return { w: "210mm", h: "297mm" };
}

export function invoiceProCss(
  C: InvoiceTheme,
  pageSize: PrintPageSize,
  margins: PrintMargins,
  fitOne: boolean,
) {
  const slim = pageSize === "80mm";
  const paper = paperBox(pageSize);
  const mg = slim
    ? { t: Math.min(margins.t, 6), r: Math.min(margins.r, 5), b: Math.min(margins.b, 6), l: Math.min(margins.l, 5) }
    : margins;
  return `
:root{
  --inv-bg:${C.bg};--inv-gold:${C.gold};--inv-txt:${C.txt};--inv-mut:${C.mut};
  --inv-row:${C.row};--inv-tot:${C.tot};--inv-grand:${C.grand};
  --inv-gold-a20:${hexA(C.gold, 0.2)};--inv-gold-a25:${hexA(C.gold, 0.25)};
  --inv-gold-a12:${hexA(C.gold, 0.12)};--inv-pattern:${hexA(C.gold, 0.045)};
}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{margin:0;padding:0;background:var(--inv-bg);color:var(--inv-txt);}
body{font-family:"DM Sans",Tajawal,sans-serif;direction:rtl;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.inv-doc{background:var(--inv-bg);color:var(--inv-txt);position:relative;min-height:100vh;}
.inv-pattern{position:absolute;inset:0;pointer-events:none;opacity:1;background:repeating-linear-gradient(-45deg,transparent,transparent 27px,var(--inv-pattern) 27px,var(--inv-pattern) 28px);}
.inv-page{position:relative;z-index:1;max-width:${slim ? "80mm" : "820px"};margin:0 auto;padding:${slim ? "14px 10px 22px" : "52px 44px 68px"};page-break-after:always;break-after:page;${fitOne ? "transform-origin:top center;" : ""}}
.inv-page:last-child{page-break-after:auto;break-after:auto;}
.header{text-align:center;margin-bottom:${slim ? "16px" : "36px"};}
.orn-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px;}
.orn-line{flex:1;max-width:120px;height:1px;background:var(--inv-gold);}
.orn-diamond{width:7px;height:7px;transform:rotate(45deg);flex-shrink:0;background:var(--inv-gold);}
.brand-mono{font-family:"Playfair Display",serif;font-size:${slim ? "28px" : "56px"};font-weight:900;letter-spacing:${slim ? "-1px" : "-4px"};line-height:1;display:block;margin-bottom:4px;color:var(--inv-gold);}
.brand-name{font-family:Syne,sans-serif;font-size:9px;letter-spacing:8px;text-transform:uppercase;display:block;margin-bottom:10px;color:var(--inv-mut);}
.doc-title{font-family:"DM Sans",sans-serif;font-size:11px;letter-spacing:5px;text-transform:uppercase;display:block;color:var(--inv-mut);}
.hb-row{display:flex;align-items:center;gap:8px;justify-content:center;margin-top:14px;}
.hb-line{height:1px;width:70px;background:var(--inv-gold);}
.hb-dot{width:4px;height:4px;border-radius:50%;background:var(--inv-gold);}
.meta-bar{display:grid;grid-template-columns:${slim ? "1fr 1fr" : "1fr 1fr 1fr 1fr"};gap:12px;padding:12px 0;margin-bottom:28px;border-top:1px solid var(--inv-gold-a20);border-bottom:1px solid var(--inv-gold-a20);}
.meta-item{display:flex;flex-direction:column;gap:3px;}
.meta-label{font-size:7px;letter-spacing:2.5px;text-transform:uppercase;color:var(--inv-mut);}
.meta-val{font-size:13px;font-weight:700;font-family:"DM Sans",sans-serif;color:var(--inv-txt);}
.meta-val.ar{font-family:Tajawal,sans-serif;font-size:14px;}
.sec-head{display:flex;align-items:center;gap:12px;margin-bottom:8px;margin-top:24px;}
.sec-icon{font-size:13px;width:24px;text-align:center;flex-shrink:0;}
.sec-title{font-family:Syne,sans-serif;font-size:7px;letter-spacing:4px;text-transform:uppercase;color:var(--inv-mut);}
.sec-line{flex:1;height:1px;opacity:0.3;background:var(--inv-gold);}
.tbl-head{display:flex;align-items:center;gap:8px;padding:0 10px 7px;border-bottom:1px solid var(--inv-gold-a25);margin-bottom:4px;}
.th{font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--inv-mut);}
.th.r{text-align:right;}
.items-list{display:flex;flex-direction:column;gap:3px;}
.item-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:5px;border:1px solid var(--inv-gold-a12);background:var(--inv-row);}
.item-info{flex:1;min-width:0;}
.item-name{font-family:Tajawal,sans-serif;font-size:13px;font-weight:600;color:var(--inv-txt);}
.item-meta-line{display:flex;align-items:center;gap:4px;margin-top:2px;}
.item-pack,.item-weight{font-size:9px;letter-spacing:.5px;color:var(--inv-mut);}
.item-sep{font-size:9px;opacity:0.3;color:var(--inv-mut);}
.item-qty,.item-price{font-family:"DM Sans",sans-serif;font-size:13px;font-weight:700;color:var(--inv-txt);flex-shrink:0;}
.item-qty{width:62px;text-align:center;}
.item-price{width:84px;text-align:right;}
.item-row .subtotal{font-family:"Playfair Display",serif;font-size:15px;font-weight:700;text-align:right;width:90px;flex-shrink:0;color:var(--inv-gold);}
.totals-wrap{display:flex;justify-content:flex-start;margin-top:20px;}
.totals-box{min-width:280px;border-radius:6px;overflow:hidden;border:1px solid var(--inv-gold-a20);background:var(--inv-tot);}
.tot-row{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--inv-gold-a12);gap:20px;}
.tot-row:last-child{border-bottom:none;}
.tot-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--inv-mut);}
.tot-val{font-family:"Playfair Display",serif;font-size:16px;font-weight:700;color:var(--inv-gold);}
.tot-val.grand{font-size:22px;}
.notes-area{margin-top:24px;padding:14px;border-radius:5px;border:1px solid var(--inv-gold-a12);background:var(--inv-row);}
.notes-label{font-size:7px;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;opacity:0.5;font-family:Syne,sans-serif;color:var(--inv-mut);}
.notes-text{font-family:Tajawal,sans-serif;font-size:12px;line-height:1.7;color:var(--inv-txt);white-space:pre-wrap;}
.footer{margin-top:36px;display:flex;flex-direction:column;align-items:center;gap:10px;}
.foot-orn{display:flex;align-items:center;gap:10px;width:100%;max-width:340px;}
.foot-line{flex:1;height:1px;background:var(--inv-gold);}
.foot-star{font-size:10px;color:var(--inv-gold);}
.foot-note{font-size:8px;letter-spacing:2px;text-transform:uppercase;text-align:center;color:var(--inv-mut);}
.foot-web{font-size:10px;letter-spacing:1px;color:var(--inv-mut);}
.divider{display:flex;align-items:center;gap:10px;margin:20px 0 0;}
.div-line{flex:1;height:1px;background:var(--inv-gold);}
.div-orn{display:flex;gap:4px;align-items:center;}
.div-d{width:5px;height:5px;transform:rotate(45deg);background:var(--inv-gold);}
.div-d.sm{width:3px;height:3px;opacity:0.45;}
.print-ret-wrap{margin-top:6px;padding:6px 8px;border-radius:5px;border:1px dashed var(--inv-gold-a25);}
.print-ret-list{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;}
.ret-cell{display:flex;align-items:center;gap:6px;min-width:0;padding:4px 8px;border-radius:4px;border:1px dashed var(--inv-gold-a25);background:var(--inv-row);}
.ret-cell-name{flex:1;min-width:0;font-family:Tajawal,sans-serif;font-size:11px;font-weight:600;color:var(--inv-txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ret-cell-qty{flex-shrink:0;font-family:"DM Sans",sans-serif;font-size:10px;font-weight:700;color:var(--inv-mut);}
.ret-cell-amt{flex-shrink:0;font-family:"DM Sans",sans-serif;font-size:11px;font-weight:700;color:#cc5555;white-space:nowrap;}
.tot-row.ret-deduct .tot-val{color:#cc5555;}
.due-banner{margin:0 0 10px;padding:7px 12px;border-radius:5px;border:1px solid var(--inv-gold-a25);font-family:Tajawal,sans-serif;font-size:12px;font-weight:700;color:var(--inv-txt);text-align:center;}
@page{size:${pageSizeCss(pageSize)};margin:${mg.t}mm ${mg.r}mm ${mg.b}mm ${mg.l}mm;}
@media screen{
  html,body{background:#d4cfc4;}
  .inv-doc{width:${paper.w};min-height:${paper.h === "auto" ? "120mm" : paper.h};margin:16px auto;box-shadow:0 10px 32px rgba(0,0,0,.22);overflow:hidden;}
}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}html,body,.inv-doc{width:auto;min-height:auto;margin:0;box-shadow:none;background:var(--inv-bg);}.inv-page{padding:0;max-width:100%;}}
`;
}

export function buildInvoicePageHtml(opts: {
  draft: InvoiceDraft;
  items: InvoiceLine[];
  theme: InvoiceTheme;
  strings: InvoiceStrings;
  mode: "original" | "net";
  returns: ReturnRecord[];
  invoices: Invoice[];
}) {
  const { draft, items, theme: C, strings: S, mode, returns, invoices } = opts;
  const totals = calcTotals(items, draft.discount);
  const saved = draft.loadedInvoiceId
    ? invoices.find((i) => i.id === draft.loadedInvoiceId)
    : null;
  const enriched = saved ? enrichInvoice(returns, saved) : null;
  const showNet = mode === "net" && enriched && enriched.salesStatus !== "active";
  const due = showNet && enriched ? enriched.net : totals.total;
  const retAmt = showNet && enriched?.returnInfo ? enriched.returnInfo.totalRevenue : 0;
  const cur = S.cur || "EGP";
  const title = showNet ? "تسوية مرتجع · Amount due" : S.docTitle || "فاتورة · Invoice";

  const itemsHtml = items.length
    ? items
        .map((it) => {
          const sub = (it.qty || 0) * (it.price || 0);
          const meta =
            it.packType || it.weight
              ? `<div class="item-meta-line">${
                  it.packType ? `<span class="item-pack">${esc(it.packType)}</span>` : ""
                }${it.packType && it.weight ? `<span class="item-sep">•</span>` : ""}${
                  it.weight ? `<span class="item-weight">${esc(it.weight)}</span>` : ""
                }</div>`
              : "";
          return `<div class="item-row">
            <div class="item-info"><div class="item-name">${esc(it.name || "—")}</div>${meta}</div>
            <div class="item-qty">${esc(fmt(it.qty || 0))}</div>
            <div class="item-price">${esc(fmt(it.price || 0))}</div>
            <div class="subtotal">${esc(fmt(sub))} ${esc(cur)}</div>
          </div>`;
        })
        .join("")
    : `<div class="item-row"><div class="item-info"><div class="item-name">—</div></div></div>`;

  const dueBanner = showNet
    ? `<div class="due-banner">المطلوب سداده: ${esc(fmt(due))} ${esc(cur)} · الأصلي ${esc(fmt(totals.total))} ${esc(cur)}${retAmt > 0.009 ? ` − مرتجع ${esc(fmt(retAmt))} ${esc(cur)}` : ""}</div>`
    : "";

  const retBlock =
    showNet && retAmt > 0.009
      ? `<div class="sec-head"><span class="sec-icon">↩️</span><span class="sec-title">تفاصيل المرتجع</span><div class="sec-line"></div></div>
         <div class="print-ret-wrap"><div class="print-ret-list">
           <div class="ret-cell"><div class="ret-cell-name">مرتجع</div><div class="ret-cell-amt">−${esc(fmt(retAmt))} ${esc(cur)}</div></div>
         </div></div>`
      : "";

  return `<div class="inv-page">
    <div class="header">
      <div class="orn-row"><div class="orn-line"></div><div class="orn-diamond"></div>
      <span class="brand-mono">${esc(S.mono)}</span><div class="orn-diamond"></div><div class="orn-line"></div></div>
      <span class="brand-name">${esc(S.brand)}</span>
      <span class="doc-title">${esc(title)}</span>
      <div class="hb-row"><div class="hb-line"></div><div class="hb-dot"></div><div class="hb-line"></div></div>
    </div>
    ${dueBanner}
    <div class="meta-bar">
      <div class="meta-item"><span class="meta-label">اسم العميل</span><div class="meta-val ar">${esc(draft.customerName || "—")}</div></div>
      <div class="meta-item"><span class="meta-label">رقم الفاتورة</span><div class="meta-val">${esc(draft.invoiceNumber || "—")}</div></div>
      <div class="meta-item"><span class="meta-label">التاريخ</span><div class="meta-val">${esc(draft.date || "—")}</div></div>
      <div class="meta-item"><span class="meta-label">التليفون</span><div class="meta-val" dir="ltr">${esc(draft.customerPhone || "—")}</div></div>
    </div>
    <div class="sec-head"><span class="sec-icon">📦</span><span class="sec-title">تفاصيل الطلب</span><div class="sec-line"></div></div>
    <div class="tbl-head">
      <span class="th" style="flex:1">${esc(S.hItem)}</span>
      <span class="th" style="width:62px;text-align:center">${esc(S.hQty)}</span>
      <span class="th r" style="width:84px">${esc(S.hPrice)}</span>
      <span class="th r" style="width:90px">${esc(S.hSub)}</span>
    </div>
    <div class="items-list">${itemsHtml}</div>
    ${retBlock}
    <div class="totals-wrap"><div class="totals-box">
      <div class="tot-row"><span class="tot-label">${esc(S.lSubtotal)}</span><span class="tot-val">${esc(fmt(totals.subtotal))} ${esc(cur)}</span></div>
      ${
        totals.discount
          ? `<div class="tot-row"><span class="tot-label">${esc(S.discLabel)}</span><span class="tot-val">− ${esc(fmt(totals.discountAmount))} ${esc(cur)} (${esc(String(totals.discount))}%)</span></div>`
          : ""
      }
      <div class="tot-row" style="border-top:1px solid;background:${C.grand};border-color:${hexA(C.gold, 0.3)}">
        <span class="tot-label">${esc(S.lTotal)}${showNet ? " الأصلي" : ""}</span>
        <span class="tot-val${showNet ? "" : " grand"}">${esc(fmt(totals.total))} ${esc(cur)}</span>
      </div>
      ${
        showNet
          ? `<div class="tot-row ret-deduct"><span class="tot-label">مرتجع · Returned</span><span class="tot-val">− ${esc(fmt(retAmt))} ${esc(cur)}</span></div>
             <div class="tot-row" style="border-top:1px solid;background:${C.grand};border-color:${hexA(C.gold, 0.3)}">
               <span class="tot-label">المطلوب سداده</span><span class="tot-val grand">${esc(fmt(due))} ${esc(cur)}</span>
             </div>`
          : ""
      }
    </div></div>
    ${
      draft.notes
        ? `<div class="notes-area"><div class="notes-label">ملاحظات · Notes</div><div class="notes-text">${esc(draft.notes)}</div></div>`
        : ""
    }
    <div class="divider"><div class="div-line"></div><div class="div-orn"><div class="div-d sm"></div><div class="div-d"></div><div class="div-d sm"></div></div><div class="div-line"></div></div>
    <div class="footer">
      <div class="foot-orn"><div class="foot-line"></div><span class="foot-star">✦</span><div class="foot-line"></div></div>
      <span class="foot-note">${esc(S.footNote)}</span>
      <span class="foot-web">${esc(S.web)}</span>
    </div>
  </div>`;
}

export function buildInvoicePrintHtml(opts: {
  draft: InvoiceDraft;
  items: InvoiceLine[];
  theme: InvoiceTheme;
  strings: InvoiceStrings;
  mode: "original" | "net";
  returns: ReturnRecord[];
  invoices: Invoice[];
  pageSize: PrintPageSize;
  margins: PrintMargins;
  fitOne: boolean;
  autoPrint: boolean;
}) {
  const css = invoiceProCss(opts.theme, opts.pageSize, opts.margins, opts.fitOne);
  const body = buildInvoicePageHtml(opts);
  const printScript = opts.autoPrint
    ? `<script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script>`
    : "";
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<title>${esc(opts.strings.brand)} — ${esc(opts.draft.invoiceNumber || "Invoice")}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>${css}</style></head>
<body><div class="inv-doc"><div class="inv-pattern"></div>${body}</div>${printScript}</body></html>`;
}
