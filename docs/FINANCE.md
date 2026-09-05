# Finance app (hub)

Native React. Live behavior: `costs/bb-stock-costs.html`.  
Entry: `/finance` → `FinanceApp` → `FinanceProvider`. Arabic RTL chrome (same linen hub as Invoices). English labels stay as stored names.

This is **not** a paste of the Stock Costs HTML and **not** an iframe. Live’s 18 `switchView` tabs are grouped into the eight workspace tools already in `hub/src/lib/workspace.ts`.

When building later slices, reuse hub chrome and CloudStore. Do **not** duplicate Invoices tools, customer CRUD, or Design studio. Invoice map: [INVOICES.md](INVOICES.md). Design map: [DESIGN.md](DESIGN.md). Waves: [FINANCE-WAVES.md](FINANCE-WAVES.md). Journal: [JOURNAL.md](JOURNAL.md). Parity: [PARITY.md](PARITY.md).

## Tabs (`?tab=`)

| id | Arabic | Component | Live `switchView` inside |
|---|---|---|---|
| `overview` | نظرة عامة | `overview-tool.tsx` | dash, cogs, profit (from/to P&L), investors |
| `invoices` | الفواتير | `invoices-tool.tsx` | invoice cards, paid/pending, customer ledger |
| `stock` | المخزون | `stock-tool.tsx` | stock report, materials, packaging, stickers, catalog, product BOM cards |
| `flow` | التحضير | `flow-tool.tsx` | prep, production |
| `purchases` | المشتريات | `purchases-tool.tsx` | purchases |
| `recipes` | الوصفات | `recipes-tool.tsx` | recipes |
| `returns` | المرتجعات | `returns-tool.tsx` | returns |
| `ops` | التشغيل | `ops-tool.tsx` | op costs, R2 backups |

Inner chips are sections, not extra workspace tools. Print a saved invoice (and a prep draft preview) with Invoices `printInvoiceDocument` (same Look keys). Prep board / combined sheet / BOM print in `print-prep.ts`. No Theme tab.

## Files

```
hub/src/components/finance/
  finance-app.tsx          provider + tab switch (mirrors InvoiceApp)
  finance-busy.tsx         indeterminate bar while stock / product / production persist
  finance-context.tsx      mutations + CloudStore writes
  section-chips.tsx        inner section nav (same chip language as Invoices)
  item-modal.tsx / recipe-modal.tsx / purchase-modal.tsx
  overview-tool.tsx
  invoices-tool.tsx
  stock-tool.tsx
  flow-tool.tsx
  purchases-tool.tsx
  recipes-tool.tsx
  returns-tool.tsx
  ops-tool.tsx
hub/src/lib/finance/       write, types, helpers, ledger, recipes, analytics, reports, prep, print-period, print-prep, customer-ledger, backups, working-capital
hub/src/lib/keys.ts        FINANCE_WRITE_KEYS (templates + color presets stripped)
```

Shared hub (do not fork): `app-workspace.tsx`, `brand-lockup.tsx`, `auth-provider.tsx`, `cloud-store.ts`, `globals.css`, `components/invoices/ui.tsx` (Field / Modal / ActionBtn).

## Writer map (do not invert)

Finance **writes:** materials, packages, stickers, recipes, purchases, production, products, categories, returns, operation costs, investors / target, customer payments, invoice payments, pending (including `invoice_draft`), `bb_label_open`, prep UI keys, `bb_backup_index`.

Finance **reads only:** `bb_invoices` / `bb_inv2` / `bb_customers` (except prep **approve**), `bb_label_templates`, Look print keys (`bb_inv_print_preset_id`, `bb_inv_print_page_size`, `bb_inv_print_margins`). Finance invoices show those as a read-only strip; Invoices → Look writes them.

**Narrow exception:** `commitPrepInvoice` appends `#INV-` then marks the draft completed. Not a second invoice editor. Invoice Pro queue already skips `kind: 'invoice_draft'`.

**Hub Finance does not write:** `bb_label_templates` (Design), `bb_color_presets` / theme keys (Invoices → Look). Sticker SKU stores `templateKey` and may set `bb_label_open`. الملصقات cards tap through to `/design?tab=atelier` (same handshake as the item modal).

Empty cloud must **not** dump default catalogs, recipes, or gold themes.

## Intended formulas

Ported in `hub/src/lib/finance/`. Copy [PARITY.md](PARITY.md), not `costs/report.md` bugs.

1. On-hand = sum(purchase qty) − BOM usage from invoices; if no invoices, usage from production. `currentStock` is a cache.
2. Skip `تسوية جرد` when the typed count equals the ledger.
3. After a real purchase, bump the in-memory ledger immediately.
4. Last purchase `costPerUnit` (including adjustments).
5. Profit = sales − COGS of sold − opex − hawalek. Leftover stock is an asset. Overview → الأرباح can filter that window by from/to (invoices by invoice date; opex / hawalek / purchases by their own date).
6. Shutdown: pending always collected. Stock-as-cash vs stock-as-loss. Words ربح / خسارة.
7. Do not mix prep-approve with production-approve.
8. Investors: peak = max running balance in the working-capital diary (invoice adj COGS out, paid collections in after `collectionLag` days, leftover stock on the live journal window or today, hawalek, opex). Pending invoices never become تحصيل. toward/overflow from capitalAssignment; NAV share = nav × (toward / peak); profit split by join date. «نسخ عجز السيولة» copies `cashHole` into `investorTarget.needed`. «تعيين كرأس مال المستثمرين» uses the diary peak, not spent − sales.
9. Finished goods: **فواتير** (`soldGross`) = approved invoice qty. **مباع** (`sold`) = after invoice-linked returns. On-hand = produced − فواتير + restocked returns − hawalek. Production **ينقص** = max(0, فواتير − produced). Prep board / drafts are not in these columns. Prep **إلى اللوحة** with a customer also writes that customer’s invoice draft and stores their name on the board line.

## Cloud seed

**2026-08-26:** Desktop finance JSON → Firestore (`bb-saved-data-2026-08-26.zip` on Desktop). Catalog, recipes, purchases, production, returns, opex, investors, payments, pending, backup index. Did **not** write templates, Look, invoices, or R2. Do not re-run unless asked.

Hub download: staff button **تحميل نسخة محلية** writes a zip of existing Firestore keys plus R2 `label_assets/` (Desktop `saved data` shape). Named `bb_backups/` stay on R2.

## Do not rebuild here

- Invoice editor, customers, Look, print pipeline — Invoices
- Library / Studio / Print house, `bb_label_templates` drawing — Design
- A second customer book or a Theme tab
