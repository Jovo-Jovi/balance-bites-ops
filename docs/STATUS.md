# Weekly church status

Native hub app at `/status`. English LTR sheet that matches `BalanceBytes_Weekly_Church_Status_Report.xlsx` (Weekly Status Report + RAG Legend). Not an HTML wrap and not a second invoice list.

## Tools

One tool: **Report**. Print and Excel use the same sections, column order, Calibri-like type, and fills (`#0B4F3B` headers, mint / yellow / red RAG rows).

| Section | Live source |
|---|---|
| Reporting week | Monday–Sunday (editable) |
| Overall status | Auto from church RAG / outstanding, or override |
| Prepared by | Staff email local-part, editable |
| 1. Executive KPI | Invoices this week vs previous week; outstanding from the customer ledger |
| 2. Church-level status | Customers as churches; units / sales / payment / delivery from invoices, returns, payments, pending queue |
| 3. Risks | Auto from outstanding + missed orders until staff edit the table |
| 4. Executive update | Auto bullets until staff type; then saved |
| RAG legend | Fixed copy from the Excel |

## Writer

`writeStatusKey` allows `bb_church_status` only. Reads `bb_invoices`, `bb_customers`, `bb_returns`, `bb_invoice_payments`, `bb_customer_payments`, `bb_pending_invoices`. Does **not** write those.

Missing `bb_church_status` stays local defaults. Save is the first cloud write. No Church A–D seed.

## Formulas

- **Active churches** — distinct customers with a non-fully-returned invoice in the last 8 weeks (or the customer book if none).
- **Churches served / units / sales** — this week’s invoices after returns (`enrichInvoice`). Previous week is the seven days before week start.
- **Outstanding** — `buildCustomerLedger` remaining (invoice flags + customer payments + returns). Same remaining as Finance.
- **Payment** — this week’s remaining on that church: Paid / Pending / —.
- **Delivery** — Delivered if invoiced this week; Pending if the invoice queue has an open card (not `invoice_draft`); else —.
- **RAG** — red if they were active last week or still owed and had no distribution this week; yellow if payment or delivery pending; else green. Row fill matches the Excel.

Default church list is the exception set (this week, last week, outstanding, pending delivery, or a saved note). **All churches** includes the whole book.

## Files

```
hub/src/app/status/page.tsx
hub/src/components/status/status-app.tsx
hub/src/lib/status/        types, week, parse, report, html, xlsx, print, write, sheet-css
```
