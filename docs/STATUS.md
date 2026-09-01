# Weekly operations status

Native hub app at `/status`. English LTR sheet matching `Report_Upgraded.xlsx` (Weekly Status Report + RAG Legend + Update Guide). Not an HTML wrap and not a second invoice or stock editor.

## Tools

One tool: **Report**. Print and Excel use the same sections, column order, Calibri-like type, and fills (`#0B4F3B` headers, mint / yellow / red RAG rows).

| Section | Live source |
|---|---|
| Reporting week | Mon–Sun. Defaults to last week on Monday/Tuesday so a new week is not marked Critical |
| Overall status | Auto from church / inventory / packing RAG, or override |
| Prepared by | Staff email local-part, editable |
| Management focus | Default end-to-end chain; editable |
| 1. Executive KPI | Churches, sourced units (purchases), distributed units, closing stock, sales, outstanding, on-time delivery |
| 2. Church-level distribution | Customers as churches; units / sales / payment / delivery from invoices, returns, payments, pending queue |
| 3. Inventory & supply | Opening / received / distributed / closing from the finance ledger. Closing = opening + received − distributed |
| 4. Sourcing / partners | Purchases this week (stock adjustments skipped) |
| 5. Packing & labeling | Invoice units + production + open prep / drafts |
| 6. Delivery execution | Same churches as section 2 with scheduled vs actual |
| 7. Risks | Auto from outstanding, missed orders, low stock, packing gaps until staff edit |
| 8. Executive update | Auto bullets until staff type; then saved |
| RAG legend + trend arrows | Fixed copy from the Excel |
| Update guide | Fixed copy from the Excel |

## Writer

`writeStatusKey` allows `bb_church_status` only. Reads invoices, customers, payments, returns, pending, materials, packages, stickers, recipes, products, purchases, production. Does **not** write those.

Missing `bb_church_status` stays local defaults. Save is the first cloud write. No Church A–D / Item 1–3 seed.

## Formulas

- **Active churches** — distinct customers with a non-fully-returned invoice in the last 8 weeks (or the customer book if none).
- **Churches served / units / sales** — this week’s invoices after returns (`enrichInvoice`). Previous week is the seven days before week start.
- **Units sourced** — purchase qty this week, excluding `تسوية جرد` / `رصيد افتتاحي`.
- **Closing inventory** — ledger at week start + purchases in week − BOM usage from invoices in week (production usage if there are no invoices). Same `computeItemLedger` idea as Finance.
- **Outstanding** — `buildCustomerLedger` remaining. Same remaining as Finance.
- **On-time delivery** — delivered rows / delivery rows (invoiced this week or still pending).
- **Payment** — this week’s remaining on that church: Paid / Pending / —.
- **Delivery** — Delivered if invoiced this week; Pending if the invoice queue has an open card (not `invoice_draft`); else —.
- **RAG (church)** — red if they were active last week or still owed and had no distribution this week; yellow if payment or delivery pending; else green.
- **RAG (stock)** — Finance `stockStatus` vs `minStock` (OK / Low / Critical).

Default church and stock lists are exception sets. **All churches & stock** includes the whole book.

## Files

```
hub/src/app/status/page.tsx
hub/src/components/status/   status-app.tsx, status-sheet.tsx
hub/src/lib/status/          types, week, parse, report, ops, html, xlsx, print, write, sheet-css
```
