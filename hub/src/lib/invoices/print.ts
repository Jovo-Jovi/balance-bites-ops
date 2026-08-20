import { calcTotals, esc, fmt } from "./helpers";
import { hexA } from "./look";
import { enrichInvoice } from "./returns";
import type {
  Category,
  Customer,
  EnrichedInvoice,
  Invoice,
  InvoiceDraft,
  InvoicePayments,
  InvoiceStrings,
  InvoiceTheme,
  Product,
  ReturnRecord,
} from "./types";

export function openPrintWindow(title: string, css: string, body: string) {
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;600&family=Syne:wght@700&family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${body}
<script>window.onload=function(){window.print();};<\/script></body></html>`;
  const w = window.open("", "_blank", "width=820,height=960");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

function paymentStatus(payments: InvoicePayments, invoiceId: string) {
  return payments[invoiceId]?.status === "paid" ? "paid" : "pending";
}

export function printInvoiceDocument(opts: {
  draft: InvoiceDraft;
  theme: InvoiceTheme;
  strings: InvoiceStrings;
  mode: "original" | "net";
  returns: ReturnRecord[];
  invoices: Invoice[];
  fitOne: boolean;
}) {
  const { draft, theme: C, strings: S, mode, returns, invoices, fitOne } = opts;
  const totals = calcTotals(draft.items, draft.discount);
  const saved = draft.loadedInvoiceId
    ? invoices.find((i) => i.id === draft.loadedInvoiceId)
    : null;
  const enriched = saved ? enrichInvoice(returns, saved) : null;
  const showNet = mode === "net" && enriched && enriched.salesStatus !== "active";
  const due = showNet && enriched ? enriched.net : totals.total;

  const rows = draft.items
    .map((it) => {
      const line = (it.qty || 0) * (it.price || 0);
      const meta = [it.packType, it.weight].filter(Boolean).join(" · ");
      return `<tr>
        <td><div class="name">${esc(it.name)}</div>${meta ? `<div class="meta">${esc(meta)}</div>` : ""}</td>
        <td class="c">${esc(fmt(it.qty))}</td>
        <td class="n">${esc(fmt(it.price))} ${esc(S.cur)}</td>
        <td class="n">${esc(fmt(line))} ${esc(S.cur)}</td>
      </tr>`;
    })
    .join("");

  let retHtml = "";
  if (showNet && enriched?.returnInfo) {
    retHtml = `<div class="tot"><span>${esc("مرتجع · Returned")}</span><span>− ${esc(fmt(enriched.returnInfo.totalRevenue))} ${esc(S.cur)}</span></div>
      <div class="tot grand"><span>${esc("المطلوب سداده · Due")}</span><span>${esc(fmt(due))} ${esc(S.cur)}</span></div>`;
  }

  const body = `<div class="doc">
    <div class="orn"><i></i><b></b><i></i></div>
    <div class="mono">${esc(S.mono)}</div>
    <div class="brand">${esc(S.brand)}</div>
    <div class="title">${esc(S.docTitle)}</div>
    <div class="meta-bar">
      <div><label>اسم العميل</label><div>${esc(draft.customerName || "—")}</div></div>
      <div><label>رقم الفاتورة</label><div>${esc(draft.invoiceNumber || "—")}</div></div>
      <div><label>التاريخ</label><div>${esc(draft.date || "—")}</div></div>
      <div><label>التليفون</label><div dir="ltr">${esc(draft.customerPhone || "—")}</div></div>
    </div>
    <table><thead><tr>
      <th>${esc(S.hItem)}</th><th>${esc(S.hQty)}</th><th>${esc(S.hPrice)}</th><th>${esc(S.hSub)}</th>
    </tr></thead><tbody>${rows || `<tr><td colspan="4">—</td></tr>`}</tbody></table>
    <div class="totals">
      <div class="tot"><span>${esc(S.lSubtotal)}</span><span>${esc(fmt(totals.subtotal))} ${esc(S.cur)}</span></div>
      ${
        totals.discount
          ? `<div class="tot"><span>${esc(S.discLabel)}</span><span>− ${esc(fmt(totals.discountAmount))} ${esc(S.cur)} (${esc(String(totals.discount))}%)</span></div>`
          : ""
      }
      <div class="tot grand"><span>${esc(S.lTotal)}</span><span>${esc(fmt(totals.total))} ${esc(S.cur)}</span></div>
      ${retHtml}
    </div>
    ${draft.notes ? `<div class="notes">${esc(draft.notes)}</div>` : ""}
    <div class="foot">${esc(S.footNote)}${S.web ? `<div class="web">${esc(S.web)}</div>` : ""}</div>
  </div>`;

  const css = invoiceCss(C, fitOne);
  return openPrintWindow(`${S.brand} — ${draft.invoiceNumber || "Invoice"}`, css, body);
}

function invoiceCss(C: InvoiceTheme, fitOne: boolean) {
  return `
@page{size:A4;margin:${fitOne ? "8mm" : "12mm 14mm"};}
html,body{margin:0;padding:0;background:${C.bg};color:${C.txt};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:Tajawal,sans-serif;direction:rtl;}
.doc{max-width:720px;margin:0 auto;padding:28px 32px 36px;background:${C.bg};color:${C.txt};${fitOne ? "transform-origin:top center;" : ""}}
.orn{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.orn i{flex:1;height:1px;background:${C.gold};opacity:.55;}
.orn b{width:8px;height:8px;background:${C.gold};transform:rotate(45deg);}
.mono{font-family:Syne,sans-serif;font-size:10px;letter-spacing:5px;color:${C.gold};text-align:center;}
.brand{font-family:"Playfair Display",serif;font-size:32px;font-weight:900;text-align:center;line-height:1.1;color:${C.txt};}
.title{font-family:Syne,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-align:center;color:${C.mut};margin-top:8px;}
.meta-bar{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin:22px 0;padding:14px;background:${C.row};border:1px solid ${hexA(C.gold, 0.25)};}
.meta-bar label{display:block;font-size:10px;color:${C.mut};margin-bottom:4px;letter-spacing:.4px;}
table{width:100%;border-collapse:collapse;font-size:12px;}
th,td{padding:10px 8px;text-align:right;border-bottom:1px solid ${hexA(C.txt, 0.1)};}
th{font-family:Syne,sans-serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:${C.mut};background:${hexA(C.gold, 0.08)};}
.name{font-weight:700;} .meta{font-size:10px;color:${C.mut};margin-top:2px;}
.c{text-align:center;} .n{direction:ltr;text-align:left;white-space:nowrap;}
.totals{margin:18px 0 8px;margin-inline-start:auto;width:min(320px,100%);background:${C.tot};padding:12px 16px;border:1px solid ${hexA(C.gold, 0.25)};}
.tot{display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:13px;}
.tot.grand{border-top:1px solid ${C.gold};margin-top:6px;padding-top:10px;font-family:"Playfair Display",serif;font-size:18px;font-weight:700;background:${C.grand};}
.notes{margin-top:18px;padding:12px;border:1px dashed ${hexA(C.gold, 0.35)};white-space:pre-wrap;font-size:12px;}
.foot{margin-top:28px;text-align:center;color:${C.mut};font-size:11px;}
.web{color:${C.gold};margin-top:6px;font-family:"DM Sans",sans-serif;}
`;
}

export function groupProducts(
  prods: Product[],
  categories: Category[],
  otherLabel: string,
) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const groups: { categoryId: string; name: string; color: string; items: Product[] }[] =
    [];
  const map: Record<string, (typeof groups)[number]> = {};
  const uncat: Product[] = [];
  prods.forEach((p) => {
    if (p.categoryId && catMap.has(p.categoryId)) {
      if (!map[p.categoryId]) {
        const cat = catMap.get(p.categoryId)!;
        map[p.categoryId] = {
          categoryId: p.categoryId,
          name: cat.name,
          color: cat.color,
          items: [],
        };
        groups.push(map[p.categoryId]);
      }
      map[p.categoryId].items.push(p);
    } else {
      uncat.push(p);
    }
  });
  groups.sort((a, b) => a.name.localeCompare(b.name));
  groups.forEach((g) => g.items.sort((a, b) => a.name.localeCompare(b.name)));
  uncat.sort((a, b) => a.name.localeCompare(b.name));
  if (uncat.length) {
    groups.push({ categoryId: "", name: otherLabel, color: "#888", items: uncat });
  }
  return groups;
}

export function printPriceList(opts: {
  products: Product[];
  categories: Category[];
  strings: InvoiceStrings;
  note: string;
}) {
  const S = opts.strings;
  const groups = groupProducts(opts.products, opts.categories, S.plLblOther || "أخرى");
  const dateStr = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const priceHdr = `${S.plHPrice || "السعر"}${S.cur ? ` · ${S.cur}` : ""}`;
  let cats = "";
  groups.forEach((g) => {
    cats += `<div class="cat"><div class="cat-hdr" style="border-color:${esc(g.color)}">
      <span class="dot" style="background:${esc(g.color)}"></span>
      <span class="cat-name">${esc(g.name)}</span>
      <span class="count">${g.items.length} ${esc(S.plCatSuffix)}</span>
    </div><table><thead><tr>
      <th>${esc(S.plHProduct)}</th><th>${esc(S.plHPack)}</th><th>${esc(S.plHWeight)}</th>
      <th style="text-align:left">${esc(priceHdr)}</th>
    </tr></thead><tbody>`;
    g.items.forEach((p) => {
      cats += `<tr><td class="name">${esc(p.name)}</td><td>${esc(p.packType || "—")}</td>
        <td>${esc(p.weight || "—")}</td><td class="price">${esc(fmt(p.unitPrice))} ${esc(S.cur)}</td></tr>`;
    });
    cats += `</tbody></table></div>`;
  });

  const body = `<div class="doc">
    <div class="orn"><i></i><b></b><i></i></div>
    <div class="mono">${esc(S.mono)}</div>
    <div class="brand">${esc(S.brand)}</div>
    <div class="title">${esc(S.plTitle)}</div>
    <div class="date">${esc(dateStr)}</div>
    ${opts.note ? `<div class="note">${esc(opts.note)}</div>` : ""}
    <div class="sum">
      <div><strong>${opts.products.length}</strong><span>${esc(S.plLblProducts)}</span></div>
      <div><strong>${groups.length}</strong><span>${esc(S.plLblCategories)}</span></div>
    </div>
    ${cats}
    <div class="foot">${esc(S.plFootNote || S.footNote)}${S.web ? `<div class="web">${esc(S.web)}</div>` : ""}</div>
  </div>`;
  return openPrintWindow(`${S.brand} — Price List`, listCss(), body);
}

export function printCustomerList(opts: {
  customers: Customer[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  payments: InvoicePayments;
  strings: InvoiceStrings;
  note: string;
  includeInvDate: boolean;
  includeInvVal: boolean;
  includePayStatus: boolean;
  includePendingList: boolean;
}) {
  const S = opts.strings;
  const dateStr = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const customerInvoices = (id: string) =>
    opts.invoices
      .filter((inv) => inv.customerId === id)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const pendingOf = (id: string) =>
    customerInvoices(id).filter((inv) => {
      if (paymentStatus(opts.payments, inv.id) === "paid") return false;
      return enrichInvoice(opts.returns, inv).salesStatus !== "full";
    });

  const formatAmt = (inv: Invoice) => {
    const e = enrichInvoice(opts.returns, inv);
    if (e.salesStatus === "full") {
      return `<span style="opacity:.55;text-decoration:line-through">${esc(fmt(e.gross))} ${esc(S.cur)}</span>`;
    }
    if (e.salesStatus === "partial") {
      return `${esc(fmt(e.net))} ${esc(S.cur)} <span style="opacity:.5;text-decoration:line-through;font-size:10px">${esc(fmt(e.gross))}</span>`;
    }
    return `${esc(fmt(e.gross))} ${esc(S.cur)}`;
  };

  const withInv = opts.customers.filter((c) => customerInvoices(c.id).length).length;
  const pendingTotal = opts.customers.reduce((n, c) => n + pendingOf(c.id).length, 0);

  let head =
    `<th>${esc(S.clHNum)}</th><th>${esc(S.clHName)}</th><th>${esc(S.clHPhone)}</th><th>${esc(S.clHAddress)}</th><th>${esc(S.clHNotes)}</th>`;
  if (opts.includeInvDate) head += `<th>${esc(S.clHLatestInv)}</th>`;
  if (opts.includeInvVal) head += `<th>${esc(S.clHLatestVal)}</th>`;
  if (opts.includePayStatus) head += `<th>${esc(S.clHPayStatus)}</th>`;
  if (opts.includePendingList) head += `<th>${esc(S.clHPendingList)}</th>`;

  const rows = opts.customers
    .map((c, idx) => {
      const invs = customerInvoices(c.id);
      const latest = invs[0] || null;
      const pending = pendingOf(c.id);
      let pay = S.clNoInv;
      if (latest && opts.includePayStatus) {
        const st = paymentStatus(opts.payments, latest.id);
        pay = `<span class="badge ${st}">${esc(st === "paid" ? S.clPaid : S.clPending)}</span>`;
      }
      const pendingHtml = pending.length
        ? pending
            .map(
              (inv) =>
                `<div>${esc(inv.date || "—")} · <strong>${esc(inv.invoiceNumber || "—")}</strong> · ${formatAmt(inv)}</div>`,
            )
            .join("")
        : esc(S.clNoInv);
      let row = `<tr><td>${idx + 1}</td><td class="name">${esc(c.name)}</td>
        <td dir="ltr">${esc(c.phone || "—")}</td><td>${esc(c.address || "—")}</td>
        <td>${esc(c.notes || "—")}</td>`;
      if (opts.includeInvDate) row += `<td>${esc(latest?.date || S.clNoInv)}</td>`;
      if (opts.includeInvVal)
        row += `<td>${latest ? formatAmt(latest) : esc(S.clNoInv)}</td>`;
      if (opts.includePayStatus) row += `<td>${pay}</td>`;
      if (opts.includePendingList) row += `<td>${pendingHtml}</td>`;
      return `${row}</tr>`;
    })
    .join("");

  const body = `<div class="doc">
    <div class="orn"><i></i><b></b><i></i></div>
    <div class="mono">${esc(S.mono)}</div>
    <div class="brand">${esc(S.brand)}</div>
    <div class="title">${esc(S.clTitle)}</div>
    <div class="date">${esc(dateStr)}</div>
    ${opts.note ? `<div class="note">${esc(opts.note)}</div>` : ""}
    <div class="sum">
      <div><strong>${opts.customers.length}</strong><span>${esc(S.clLblCustomers)}</span></div>
      <div><strong>${withInv}</strong><span>${esc(S.clLblWithInv)}</span></div>
      ${opts.includePendingList ? `<div><strong>${pendingTotal}</strong><span>${esc(S.clLblPendingCount)}</span></div>` : ""}
    </div>
    <table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
    <div class="foot">${esc(S.clFootNote || S.footNote)}${S.web ? `<div class="web">${esc(S.web)}</div>` : ""}</div>
  </div>`;
  return openPrintWindow(`${S.brand} — Customer List`, listCss(), body);
}

function listCss() {
  return `
@page{size:A4;margin:12mm 14mm;}
html,body{margin:0;padding:0;background:#faf8f3;color:#1a1508;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:Tajawal,sans-serif;direction:rtl;}
.doc{max-width:720px;margin:0 auto;padding:28px 32px 36px;}
.orn{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.orn i{flex:1;height:1px;background:#c9a84c;}
.orn b{width:6px;height:6px;background:#c9a84c;transform:rotate(45deg);}
.mono{font-family:Syne,sans-serif;font-size:10px;letter-spacing:5px;color:#c9a84c;text-align:center;}
.brand{font-family:"Playfair Display",serif;font-size:32px;font-weight:900;text-align:center;}
.title{font-family:Syne,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-align:center;color:#6b5e3a;margin-top:8px;}
.date{font-size:10px;text-align:center;color:#888;margin-top:6px;font-family:"DM Sans",sans-serif;}
.note{margin:16px 0 0;padding:10px 14px;border:1px solid rgba(201,168,76,.25);background:rgba(201,168,76,.06);text-align:center;font-size:12px;}
.sum{display:flex;justify-content:center;gap:24px;margin:18px 0;flex-wrap:wrap;text-align:center;}
.sum strong{display:block;font-family:"Playfair Display",serif;font-size:18px;}
.sum span{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#888;font-family:Syne,sans-serif;}
table{width:100%;border-collapse:collapse;font-size:12px;}
th,td{padding:10px 12px;text-align:right;border-bottom:1px solid rgba(26,21,8,.08);vertical-align:middle;}
th{font-family:Syne,sans-serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#6b5e3a;background:rgba(201,168,76,.06);}
.name{font-weight:700;}
.price{font-family:"Playfair Display",serif;font-size:16px;font-weight:700;color:#9a7b2f;text-align:left;direction:ltr;}
.cat{margin-top:22px;}
.cat-hdr{display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #c9a84c;}
.dot{width:10px;height:10px;border-radius:50%;}
.cat-name{font-family:Syne,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;}
.count{margin-right:auto;font-size:10px;color:#888;}
.foot{margin-top:28px;padding-top:14px;border-top:1px solid rgba(201,168,76,.25);text-align:center;font-size:11px;color:#666;}
.web{color:#c9a84c;margin-top:6px;}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;}
.badge.paid{background:rgba(76,175,80,.12);color:#2e7d32;}
.badge.pending{background:rgba(255,152,0,.12);color:#e65100;}
`;
}

export function amountLabel(e: EnrichedInvoice, cur: string) {
  if (e.salesStatus === "full") return { text: `${fmt(e.gross)} ${cur}`, struck: true };
  if (e.salesStatus === "partial") {
    return { text: `${fmt(e.net)} ${cur}`, struckText: `${fmt(e.gross)} ${cur}` };
  }
  return { text: `${fmt(e.gross)} ${cur}` };
}
