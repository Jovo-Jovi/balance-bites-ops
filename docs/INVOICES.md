# Invoices app (hub)

Native React. Live behavior: `costs/balance-bites-invoice-pro.html`.  
Entry: `/invoices` → `InvoiceApp` → `InvoiceProvider`.

When building **Design** or **Finance**, reuse this chrome and CloudStore. Do **not** duplicate these tools, keys, or print pipelines.

## Tabs (`?tab=`)

| id | Arabic | Component | Notes |
|---|---|---|---|
| `editor` | فاتورة | `editor-tool.tsx` | Default tab. Draft in `bb_inv2`. |
| `customers` | العملاء | `customers-tool.tsx` | CRUD, list print, customer brief |
| `catalog` | الكتالوج | `catalog-tool.tsx` | **Read** products/categories. Writes blocked. |
| `queue` | الانتظار | `queue-tool.tsx` | Skip `kind: 'invoice_draft'`. Bundles. |
| `history` | السجل | `history-tool.tsx` | Pay filter + load/print/duplicate |
| `reports` | التقارير | `reports-tool.tsx` | إجمالي / عميل / أفضل منتج / منتج + dates |
| `look` | المظهر | `look-tool.tsx` | Print theme, page size, margins, preview |

Workspace ids live in `hub/src/lib/workspace.ts`. Switching tabs: `useWorkspaceTab` (scrolls to top).

## Files

```
hub/src/components/invoices/
  invoice-app.tsx          provider + tab switch
  invoice-context.tsx      all invoice mutations
  ui.tsx                   Field, inputs, ActionBtn, Accordion, Modal (portal)
  customer-brief.tsx       customer window (load + print)
  editor-tool.tsx          editor + print chooser
  customers-tool.tsx
  catalog-tool.tsx
  queue-tool.tsx
  history-tool.tsx
  reports-tool.tsx
  look-tool.tsx
  print-look-picker.tsx
  invoice-preview.tsx
hub/src/lib/invoices/      helpers, look, print, payments, returns, write, types
hub/src/hooks/use-workspace-tab.ts
hub/src/lib/keys.ts        INVOICE_WRITE_KEYS (returns stripped)
hub/src/lib/bb-keys.json   manifest + writers
```

Shared hub (do not fork): `app-workspace.tsx`, `brand-lockup.tsx`, `auth-provider.tsx`, `cloud-store.ts`, `globals.css`.

## Writer map (do not invert)

Invoice **writes:** `bb_invoices`, `bb_inv2`, `bb_customers`, `bb_pending_invoices` (complete pending, not prep drafts), `bb_invoice_payments`, `bb_invoice_bundles`, color presets / active id, print keys (`bb_inv_print_*`, `bb_print_fit_one`).

Invoice **reads only:** `bb_products`, `bb_categories`, `bb_returns`, prep drafts, inventory.

`writeInvoiceKey` rejects catalog and returns. Empty cloud must **not** dump DEFAULT_PRODUCTS / DEFAULT_CATEGORIES / default presets.

## UX rules learned on this app

1. **Modal** must `createPortal(..., document.body)`. Fixed overlay inside `.bb-glass` is not the viewport.
2. Load-from-history / customer brief → `loadInvoice` then `openTab("editor")`. No confirm.
3. Card **طباعة** uses `printSavedInvoice` (original + saved print look). Editor print still opens the look chooser.
4. Unknown print preset id → `__inv2__`. Keep a visible selected option on mobile.
5. `.bb-btn.bb-glass` / `data-tone="ghost"` keep **dark text** on hover. Filled teal buttons go teal/white.
6. Customer card tint: unpaid → amber (`bb-card-pending`), none pending → green (`bb-card-clear`).

## Print looks

| id | Meaning |
|---|---|
| `__inv2__` | Saved Invoice Pro colors/strings (`bb_inv2`) — default |
| `{preset id}` | Row from `bb_color_presets` |
| `__hub__` | Linen hub theme (print only; workspace chrome stays linen) |

## Do not rebuild here

- Label atelier, prepress, `bb_label_templates` — Design
- Stock ledger, prep approve, P&L, catalog writes, returns write — Finance
- A second customer database or a second invoice list
