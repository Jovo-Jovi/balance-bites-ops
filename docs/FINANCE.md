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

Inner chips are sections, not extra workspace tools. Print a saved invoice with Invoices `printInvoiceDocument` (same looks). No Theme tab.

## Files

```
hub/src/components/finance/
  finance-app.tsx          provider + tab switch (mirrors InvoiceApp)
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
hub/src/lib/finance/       write, types, helpers, ledger, recipes, analytics, reports, prep, customer-ledger, backups
hub/src/lib/keys.ts        FINANCE_WRITE_KEYS (templates + color presets stripped)
```

Shared hub (do not fork): `app-workspace.tsx`, `brand-lockup.tsx`, `auth-provider.tsx`, `cloud-store.ts`, `globals.css`, `components/invoices/ui.tsx` (Field / Modal / ActionBtn).

## Writer map (do not invert)

Finance **writes:** materials, packages, stickers, recipes, purchases, production, products, categories, returns, operation costs, investors / target, customer payments, invoice payments, pending (including `invoice_draft`), `bb_label_open`, prep UI keys, `bb_backup_index`.

Finance **reads only:** `bb_invoices` / `bb_inv2` / `bb_customers` (except prep **approve**), `bb_label_templates`.

**Narrow exception:** `commitPrepInvoice` appends `#INV-` then marks the draft completed. Not a second invoice editor. Invoice Pro queue already skips `kind: 'invoice_draft'`.

**Hub Finance does not write:** `bb_label_templates` (Design), `bb_color_presets` / theme keys (Invoices → Look). Sticker SKU stores `templateKey` and may set `bb_label_open`.

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
8. Investors: peak ≈ max(0, spent − sales); toward/overflow from capitalAssignment; NAV share = nav × (toward / peak); profit split by join date (dated invoice net − adj COGS − hawalek − opex). Working-capital event book (collection lag, stock placement journal) is an explicit gap.

## Do not rebuild here

- Invoice editor, customers, Look, print pipeline — Invoices
- Library / Studio / Print house, `bb_label_templates` drawing — Design
- A second customer book or a Theme tab
