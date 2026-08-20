import { enrichInvoice, getReturnLineTotal, subtractReturnsFromProdMap } from "./returns";
import { fmt } from "./helpers";
import type {
  EnrichedInvoice,
  Invoice,
  InvoiceStrings,
  Product,
  ReturnRecord,
} from "./types";

export type ReportKind = "total" | "customer" | "topProd" | "product";

export function filterInvoicesByDate(invoices: Invoice[], from: string, to: string) {
  return invoices.filter((inv) => {
    if (from && (inv.date || "") < from) return false;
    if (to && (inv.date || "") > to) return false;
    return true;
  });
}

function salesOnly(enriched: EnrichedInvoice[]) {
  return enriched.filter((e) => e.salesStatus !== "full");
}

export type ReportStat = { value: string; label: string };
export type ReportBar = { label: string; value: number; display: string };
export type ReportTable = { headers: string[]; rows: string[][] };

export type ReportView = {
  empty?: string;
  title?: string;
  stats: ReportStat[];
  sections: { title: string; bars?: ReportBar[]; table?: ReportTable }[];
};

export function buildReport(opts: {
  kind: ReportKind;
  invoices: Invoice[];
  returns: ReturnRecord[];
  products: Product[];
  strings: InvoiceStrings;
  customerId: string;
  customerName: string;
  productId: string;
  sortBy: "qty" | "rev";
}): ReportView {
  const { kind, invoices, returns, strings } = opts;
  const cur = strings.cur || "EGP";

  if (kind === "total") return reportTotal(invoices, returns, cur);
  if (kind === "customer") {
    if (!opts.customerId) {
      return { empty: "اختر عميلاً من القائمة أعلاه", stats: [], sections: [] };
    }
    const scoped = invoices.filter((i) => i.customerId === opts.customerId);
    return reportCustomer(scoped, returns, opts.customerName, cur);
  }
  if (kind === "topProd") return reportTopProducts(invoices, returns, opts.sortBy, cur);
  return reportProduct(invoices, returns, opts.productId, opts.products, cur);
}

function reportTotal(
  invoices: Invoice[],
  returns: ReturnRecord[],
  cur: string,
): ReportView {
  if (!invoices.length) {
    return { empty: "لا يوجد فواتير في هذه الفترة", stats: [], sections: [] };
  }
  const enriched = invoices.map((inv) => enrichInvoice(returns, inv));
  const sold = salesOnly(enriched);
  const fullRetN = enriched.filter((e) => e.salesStatus === "full").length;
  const partRetN = enriched.filter((e) => e.salesStatus === "partial").length;
  const totalRev = sold.reduce((s, e) => s + e.net, 0);
  const avgInv = sold.length ? totalRev / sold.length : 0;
  const custSet = new Set(sold.map((e) => e.inv.customerName).filter(Boolean));

  const stats: ReportStat[] = [
    { value: String(sold.length), label: "فواتير مبيعات" },
    { value: `${fmt(totalRev)} ${cur}`, label: "صافي الإيرادات" },
    { value: `${fmt(avgInv)} ${cur}`, label: "متوسط الفاتورة" },
    { value: String(custSet.size), label: "عملاء نشطون" },
  ];
  if (fullRetN + partRetN) {
    stats.push({
      value: `${fullRetN} كامل · ${partRetN} جزئي`,
      label: "مرتجعات",
    });
  }

  const monthly: Record<string, { count: number; total: number }> = {};
  sold.forEach((e) => {
    const key = (e.inv.date || "").slice(0, 7);
    if (!key) return;
    if (!monthly[key]) monthly[key] = { count: 0, total: 0 };
    monthly[key].count += 1;
    monthly[key].total += e.net;
  });
  const months = Object.keys(monthly).sort().reverse();
  const sections: ReportView["sections"] = [];
  if (months.length) {
    sections.push({
      title: "مبيعات شهرية",
      bars: months.map((m) => ({
        label: m,
        value: monthly[m].total,
        display: `${fmt(monthly[m].total)} ${cur} (${monthly[m].count} فاتورة)`,
      })),
    });
  }

  const custTotals: Record<string, { name: string; total: number; count: number }> = {};
  sold.forEach((e) => {
    const cn = e.inv.customerName || "—";
    if (!custTotals[cn]) custTotals[cn] = { name: cn, total: 0, count: 0 };
    custTotals[cn].total += e.net;
    custTotals[cn].count += 1;
  });
  const topCusts = Object.values(custTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  if (topCusts.length) {
    sections.push({
      title: "أفضل العملاء",
      bars: topCusts.map((c) => ({
        label: c.name,
        value: c.total,
        display: `${fmt(c.total)} ${cur}`,
      })),
    });
  }

  return { title: "نظرة عامة · صافي بعد المرتجعات", stats, sections };
}

function reportCustomer(
  invoices: Invoice[],
  returns: ReturnRecord[],
  customerName: string,
  cur: string,
): ReportView {
  if (!invoices.length) {
    return { empty: "لا يوجد فواتير لهذا العميل", stats: [], sections: [] };
  }
  const enriched = invoices.map((inv) => enrichInvoice(returns, inv));
  const sold = salesOnly(enriched);
  const totalRev = sold.reduce((s, e) => s + e.net, 0);
  const avgInv = sold.length ? totalRev / sold.length : 0;
  const lastDate = sold.length
    ? [...sold].sort((a, b) => (b.inv.date || "").localeCompare(a.inv.date || ""))[0].inv
        .date
    : "—";

  const rows = [...enriched]
    .sort((a, b) => (b.inv.date || "").localeCompare(a.inv.date || ""))
    .map((e) => [
      e.inv.invoiceNumber || "—",
      e.inv.date || "—",
      String(e.inv.items?.length || 0),
      statusCell(e),
      amountCell(e, cur),
    ]);

  return {
    title: `${customerName} · صافي بعد المرتجعات`,
    stats: [
      { value: String(sold.length), label: "طلبات مبيعات" },
      { value: `${fmt(totalRev)} ${cur}`, label: "صافي الإنفاق" },
      { value: sold.length ? `${fmt(avgInv)} ${cur}` : "—", label: "متوسط الطلب" },
      { value: lastDate || "—", label: "آخر طلب" },
    ],
    sections: [
      {
        title: "الفواتير",
        table: {
          headers: ["رقم الفاتورة", "التاريخ", "المنتجات", "الحالة", "الإجمالي"],
          rows,
        },
      },
    ],
  };
}

function reportTopProducts(
  invoices: Invoice[],
  returns: ReturnRecord[],
  sortBy: "qty" | "rev",
  cur: string,
): ReportView {
  if (!invoices.length) {
    return { empty: "لا يوجد فواتير", stats: [], sections: [] };
  }
  const invIds = invoices.map((i) => i.id);
  const prodMap: Record<string, { name: string; qty: number; rev: number; count: number }> =
    {};
  salesOnly(invoices.map((inv) => enrichInvoice(returns, inv))).forEach((e) => {
    (e.inv.items || []).forEach((it) => {
      const key = it.productId || it.name;
      if (!prodMap[key]) {
        prodMap[key] = {
          name: (it.name.split("·")[0] || it.name).trim() || it.name,
          qty: 0,
          rev: 0,
          count: 0,
        };
      }
      prodMap[key].qty += it.qty || 0;
      prodMap[key].rev += (it.qty || 0) * (it.price || 0);
      prodMap[key].count += 1;
    });
  });
  subtractReturnsFromProdMap(returns, prodMap, invIds);
  const sorted = Object.values(prodMap)
    .filter((p) => p.qty > 0.0001 || p.rev > 0.0001)
    .sort((a, b) => b[sortBy] - a[sortBy]);
  if (!sorted.length) {
    return { empty: "لا يوجد بيانات منتجات", stats: [], sections: [] };
  }
  return {
    title: sortBy === "rev" ? "الأعلى إيراداً" : "الأعلى كميةً",
    stats: [],
    sections: [
      {
        title: sortBy === "rev" ? "الأعلى إيراداً" : "الأعلى كميةً",
        bars: sorted.map((p) => ({
          label: p.name,
          value: p[sortBy],
          display: sortBy === "rev" ? `${fmt(p.rev)} ${cur}` : `${p.qty} وحدة`,
        })),
      },
      {
        title: "تفاصيل كاملة",
        table: {
          headers: ["#", "المنتج", "مرات الظهور", "الكمية المباعة", "الإيراد"],
          rows: sorted.map((p, i) => [
            String(i + 1),
            p.name,
            String(p.count),
            String(p.qty),
            `${fmt(p.rev)} ${cur}`,
          ]),
        },
      },
    ],
  };
}

function reportProduct(
  invoices: Invoice[],
  returns: ReturnRecord[],
  productId: string,
  products: Product[],
  cur: string,
): ReportView {
  if (!productId) {
    return { empty: "اختر منتجاً من القائمة أعلاه", stats: [], sections: [] };
  }
  const prod = products.find((p) => p.id === productId);
  const prodName = prod ? prod.name : "";
  const matched: { inv: Invoice; lineQty: number; lineRev: number }[] = [];
  let totalQty = 0;
  let totalRev = 0;

  invoices.forEach((inv) => {
    const e = enrichInvoice(returns, inv);
    if (e.salesStatus === "full") return;
    let hit = false;
    let lineQty = 0;
    let lineRev = 0;
    (inv.items || []).forEach((it) => {
      if (it.productId === productId) {
        lineQty += it.qty || 0;
        lineRev += (it.qty || 0) * (it.price || 0);
        hit = true;
      }
    });
    if (hit) {
      (e.returnInfo?.records || []).forEach((ret) => {
        (ret.items || []).forEach((it) => {
          if (it.productId === productId) {
            lineQty = Math.max(0, lineQty - (parseFloat(String(it.qty)) || 0));
            lineRev = Math.max(0, lineRev - getReturnLineTotal(it));
          }
        });
      });
      if (lineQty > 0) {
        matched.push({ inv, lineQty, lineRev });
        totalQty += lineQty;
        totalRev += lineRev;
      }
    }
  });

  if (!matched.length) {
    return { empty: "لم يُباع هذا المنتج في الفترة المحددة", stats: [], sections: [] };
  }

  return {
    title: prodName.split("·")[0].trim() || prodName,
    stats: [
      { value: String(matched.length), label: "عدد الفواتير" },
      { value: String(totalQty), label: "الكمية المباعة" },
      { value: `${fmt(totalRev)} ${cur}`, label: "إجمالي الإيراد" },
      {
        value: fmt(matched.length ? totalQty / matched.length : 0),
        label: "متوسط الكمية/فاتورة",
      },
    ],
    sections: [
      {
        title: "الفواتير المتضمنة",
        table: {
          headers: ["رقم الفاتورة", "التاريخ", "العميل", "الكمية", "الإجمالي"],
          rows: [...matched]
            .sort((a, b) => (b.inv.date || "").localeCompare(a.inv.date || ""))
            .map((row) => [
              row.inv.invoiceNumber || "—",
              row.inv.date || "—",
              row.inv.customerName || "—",
              String(row.lineQty),
              `${fmt(row.lineRev)} ${cur}`,
            ]),
        },
      },
    ],
  };
}

function statusCell(e: EnrichedInvoice) {
  if (e.salesStatus === "full") return "مرتجع كامل";
  if (e.salesStatus === "partial") return "مرتجع جزئي";
  return "—";
}

function amountCell(e: EnrichedInvoice, cur: string) {
  if (e.salesStatus === "full") return `0 ${cur}`;
  if (e.salesStatus === "partial") return `${fmt(e.net)} ${cur} (${fmt(e.gross)})`;
  return `${fmt(e.gross)} ${cur}`;
}
