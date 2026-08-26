import { esc, fmt } from "@/lib/invoices/helpers";
import { openPrintWindow } from "@/lib/invoices/print";
import type { PeriodProfit } from "./analytics";

const CSS = `body{font-family:Tajawal,Arial,sans-serif;padding:18px;color:#111;}
h2{margin:0 0 8px;font-size:20px;}
.muted{color:#555;font-size:13px;margin:0 0 16px;}
table{border-collapse:collapse;width:100%;}
th,td{border:1px solid #999;padding:6px 8px;text-align:right;}
th{background:#eee;}
.ok{color:#2e7d32;}
.bad{color:#b42318;}
@media print{@page{size:A4 portrait;margin:12mm;}}`;

export function periodRangeLabel(from: string, to: string) {
  if (!from && !to) return "كل الفترة";
  return `${from || "…"} → ${to || "…"}`;
}

export function printPeriodProfit(period: PeriodProfit) {
  const range = periodRangeLabel(period.from, period.to);
  const netCls = period.net >= -0.009 ? "ok" : "bad";
  const body = `<h2>تقرير الأرباح · Balance Bites</h2>
<p class="muted">${esc(range)} · ${period.invoiceCount} فاتورة · المخزون المتبقي أصل وليس في صافي الربح</p>
<table>
<thead><tr><th>البند</th><th>المبلغ EGP</th></tr></thead>
<tbody>
<tr><td>مبيعات</td><td dir="ltr">${fmt(period.sales)}</td></tr>
<tr><td>مدفوع</td><td dir="ltr">${fmt(period.paid)}</td></tr>
<tr><td>معلق</td><td dir="ltr">${fmt(period.pending)}</td></tr>
<tr><td>تكلفة المباع (COGS)</td><td dir="ltr">${fmt(period.cogs)}</td></tr>
<tr><td>تشغيل</td><td dir="ltr">${fmt(period.opex)}</td></tr>
<tr><td>حوالك</td><td dir="ltr">${fmt(period.hawalek)}</td></tr>
<tr><td>مشتريات (أصل — ليست في الصافي)</td><td dir="ltr">${fmt(period.purchases)}</td></tr>
<tr><td><strong>صافي الربح</strong></td><td class="${netCls}" dir="ltr"><strong>${fmt(period.net)}</strong></td></tr>
</tbody>
</table>
<p class="muted">صافي = مبيعات − تكلفة المباع − تشغيل − حوالك. الفواتير بتاريخ الفاتورة؛ التشغيل والحوالك والمشتريات بتاريخها.</p>`;
  return openPrintWindow("تقرير الأرباح", CSS, body);
}
