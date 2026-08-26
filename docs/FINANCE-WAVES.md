# Finance waves — plan

**Status:** Waves A–E on `feat/finance` (in test). Live source: `costs/bb-stock-costs.html`. App map: [FINANCE.md](FINANCE.md).

This is the Finance slice, not a fourth hub app. Keep **eight** workspace tools. Do **not** wrap the HTML.

## Confirm checklist

- [x] **Wave A** — shell + catalog / recipes / stickers + template link + `bb_label_open`
- [x] **Wave B** — ledger + purchases + stock value; skip empty تسوية; bump after real buy
- [x] **Wave C** — prep drafts, approve → `#INV-`, production separate, شراء shortfall
- [x] **Wave D** — returns writes, finance invoices / payments / ledger, opex
- [x] **Wave E** — dashboard shutdown pair, COGS, P&L, investors, R2 backups
- [x] **Wave F1** — overview mix / period P&L / unmatched-recipe hint
- [x] **Wave F2** — stock filters, sticker swatch cards → Studio, undo last payment, copy cash hole
- [x] Reuse Invoices chrome (`bb-glass`, portal Modal, ActionBtn) — no second UI kit
- [x] No Theme tab; no `bb_label_templates` writer; no empty catalog dumps

## Wave notes

### Wave A — Shell + catalog

`FinanceApp` replaces Soon cards. CRUD for materials, packages, stickers, products, categories, recipes. Item / recipe modals. Sticker → template picker (read-only templates) + `bb_label_open`. Product BOM cards live on Stock. Invoices catalog stays read-only.

### Wave B — Ledger + purchases

`computeItemLedger` matches live `computeItemLedgerSync`. Purchases log (real buy, `رصيد افتتاحي`, `تسوية جرد`). Stock report RM + FG at last cost. Inline qty writes an adjustment only when the number changes.

### Wave C — Prep + production

Prep per customer → `invoice_draft`. Combined sheet uses BOM totals. شراء opens the purchase modal with shortfall (user may increase). Approve writes `#INV-`. Production is a different button (`kind` / status, not `invoice_draft`).

### Wave D — Money writes

Returns (`restock` / `expired` / `mixed`). Finance invoices tab: paid/pending, customer ledger, `bb_customer_payments`. Opex (negative compensation allowed).

### Wave E — Reports + backups

Dashboard (project cost, sales, stock, two shutdown columns), COGS, P&L, investors (NAV includes stock). Named backups to R2 `bb_backups/`. `bb_backup_locals` stays out of Firestore.

## Explicitly out

- HTML wrap, Theme tab, second invoice list / customer CRUD, Design studio.
- Dumping default products, recipes, or presets.
- GAAP / weighted-average “fixes” unless asked.
- Jelly Kids dump, Desktop `bbLabel-*` scan, `import:apply`.

## UX polish (after Waves A–E)

Purchases table + date filters. Stock report in accordion sections. Invoice cards match live fields; customer tap opens an account modal; دفعة / سدّد الكل confirm; multi-select print original/net. Investor table uses peak ≈ spent−sales, toward/overflow, and join-date profit — not a raw NAV split. **Wave F1:** overview mix bars + formula hover; stock alerts on المخزون not اللوحة; date-window P&L print on الأرباح; unmatched-recipe hint. **Wave F2:** stock ok/low/crit + usage filters; sticker swatch cards open Studio; undo last payment; copy cash shortfall into المطلوب. Working-capital event diary stays an approve-point.
