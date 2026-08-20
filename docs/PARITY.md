# Feature parity backlog

Generated from live HTML/JS (20 Aug 2026), not from memory.

Sources:

- `costs/bb-stock-costs.html` — tabs at lines 788–804; FileStore WRITE/READ keys ~1878–1880; `getDisplayStock` / ledger ~7098–7145; shutdown card ~8240–8266
- `costs/balance-bites-invoice-pro.html` — MODULE comments 1091–4378; pending skip `invoice_draft` ~2237
- `costs/balance-bites-sticker.html` + `bb-prepress.js`, `bb-composite-label.js`, `bb-icon-library.js`, `bb-jelly-kids.js`, `assets/presets/`
- `costs/report.md` §2.2 localStorage-only keys
- Live folder `saved data` — field names below

**Rule:** a module is not done until its live screens and formulas exist here, or the gap is listed in [Explicit gaps](#explicit-gaps).

Legend: `[x]` this slice · `[ ]` not built yet.

---

## Hub

- [x] Login (email/password; Google optional)
- [x] Three cards only: الفواتير / التصميم / المالية والمخزون (no KPIs)
- [x] Sign out, tenant name in footer
- [x] Redirect to login if session missing
- [ ] Staff allowlist live in Firebase (`staff/{uid}` created in Console — not in the app)
- [ ] Vercel deploy (blocked until Auth + rules are on the project)

---

## CloudStore / data

- [x] Same `bb_*` keys → `tenants/balance-bites/keys/{key}` (`data`, `updatedAt`, `updatedBy`, `clientWriteId`)
- [x] Firestore preferred on hydrate (empty localStorage cannot wipe cloud)
- [x] `Store.set` / `CloudStore.set` surfaces write errors (no silent fail)
- [x] `onSnapshot` + `clientWriteId` so another tab toasts instead of silent clobber
- [x] Prep / print keys that were localStorage-only now listed as Firestore keys
- [ ] One-shot import of `saved data` (script exists; **do not run** until asked; zip first)
- [ ] Label binaries stay in Desktop `label_assets/` (no Cloud Storage on Spark)
- [ ] Backup snapshots stay in Desktop `bb_backups/`
- [ ] HTML wrap for Design / Finance (`public/bb-cloud-store.js` exists; invoices were rebuilt as React instead)

### Keys imported from disk today

`bb_invoices`, `bb_inv2`, `bb_customers`, `bb_products`, `bb_categories`, `bb_invoice_payments`, `bb_customer_payments`, `bb_pending_invoices`, `bb_invoice_bundles`, `bb_returns`, `bb_materials`, `bb_packages`, `bb_stickers`, `bb_recipes`, `bb_purchases`, `bb_production`, `bb_operation_costs`, `bb_investors`, `bb_investor_target`, `bb_label_templates`, `bb_label_open`, `bb_color_presets`, `bb_active_color_preset_id`, `bb_active_theme`, `bb_backup_index`

### Keys localStorage-only on Desktop — now CloudStore keys

`bb_prep_lines`, `bb_prep_ing_view`, `bb_prep_prod_mode`, `bb_prep_print_mode`, `bb_inv_print_preset_id`, `bb_print_fit_one`, `bb_ret_last_customer`

---

## Invoices (`balance-bites-invoice-pro.html` → Next.js modules)

Native React workspace (not an HTML wrap). Live modules mapped to hub tabs: editor, customers, catalog, queue (pending skip `kind === 'invoice_draft'` + bundles), history, reports (إجمالي / عميل / أفضل منتج / منتج + dates), look (print theme). Catalog is read-only. No default products / categories / presets written on empty cloud.

- [x] CloudStore instead of Desktop folder
- [x] New / save invoice, print, editor
- [x] Customers CRUD + customer list print
- [x] Categories + products pickers (one / whole category / selected categories)
- [x] Manual line + catalog line, packs/weights
- [x] Bundles (save lines, multi-copy invoices)
- [x] Pending queue — skip `invoice_draft`; complete pending
- [x] Invoice history, customer history before proceed
- [x] Color presets / theme (print look; no seed of HTML defaults)
- [x] Reports: إجمالي، عميل، أفضل منتج، منتج + date filters
- [x] Price list print
- [x] Totals: subtotal, discount, grand total
- [x] Payments flags shared with finance
- [x] Returns display (finance writes)

---

## Design (`balance-bites-sticker.html` + JS)

- [ ] Template library CRUD (`bb_label_templates`)
- [ ] Legacy `bbLabel-*.json` import (files still present in `saved data`)
- [ ] `label_assets/{templateId}/` → Firebase Storage
- [ ] Prepress (`bb-prepress.js`)
- [ ] Composite (`bb-composite-label.js`)
- [ ] Icon library, Jelly Kids, art presets in `assets/presets/` (repo, not tenant)
- [ ] Deep link `bb_label_open` from finance stickers
- [ ] Product select from `bb_products` / `bb_stickers`

---

## Finance (`bb-stock-costs.html` — every tab)

| Tab | Live purpose | Status |
|---|---|---|
| لوحة التحكم | Project cost, sales, stock, **shutdown two scenarios** | [ ] |
| الفواتير | Read invoices; paid/pending; customer ledger | [ ] |
| COGS | Recipe unit cost vs sell / margin | [ ] |
| الأرباح | P&L = sales − COGS of **sold** − opex − hawalek (not leftover stock) | [ ] |
| المستثمرون | Capital, shares, NAV includes stock | [ ] |
| المخزون | Ledger qty × cost + finished goods | [ ] |
| المشتريات | Buy-ins; ledger source of qty | [ ] |
| المواد الخام | Catalog + inline qty | [ ] |
| التغليف | Catalog + inline qty | [ ] |
| الملصقات | Catalog + template link + `bb_label_open` | [ ] |
| الكتالوج | Products, categories, inactive | [ ] |
| بطاقات المنتج | BOM cards | [ ] |
| الوصفات | BOM, batch, product link | [ ] |
| التحضير | Per-customer items; drafts; شراء shortfall | [ ] |
| الإنتاج | Runs; usage fallback if **no invoices**; not `invoice_draft` | [ ] |
| المرتجعات | Restock vs expired / hawalek | [ ] |
| تكاليف التشغيل | Rent, wages, compensation (negative OK) | [ ] |

Also:

- [ ] Backups (`bb_backups` + `bb_backup_index`)
- [ ] Theme / color presets shared
- [ ] Item modal: fill stock from ledger; skip `تسوية جرد` if stock field unchanged
- [ ] After real purchase, bump ledger immediately (`bumpLedgerAfterPurchaseQty`)

### Intended formulas (do not “fix” unless asked)

1. **On-hand** (`getDisplayStock` / `computeItemLedgerSync`): `sum(purchase qty) − BOM usage from invoices`. If `bb_invoices` is empty, usage is from **production**. `currentStock` is a cache.
2. **Profit / صافي الربح:** sales − COGS of sold − opex − hawalek. Leftover stock is `قيمة المخزون` (asset). Dashboard / investor NAV **includes** stock.
3. **Shutdown** (pending always collected):  
   - Stock → cash: liquid = paid + pending + stock **at cost**; P&L = liquid − spent  
   - Stock → loss: liquid = paid + pending; P&L = liquid − spent  
   Keep the words ربح / خسارة (not color alone).
4. **Prep invoices:** pick customer → that customer’s items → another customer. Drafts `kind: 'invoice_draft'`. Approve writes `#INV-`. Combined sheet uses BOM component totals. شراء opens purchase modal with shortfall (needed − stock; user may increase).
5. Do not mix prep-approve with production-approve.

`report.md` documents duplicate formulas and save races — copy **intended** rules, not the silent FileStore fail.

---

## Live JSON shapes (sample)

Do not commit these files. Field names to preserve:

| Key | Shape | Sample fields |
|---|---|---|
| `bb_customers` | array | `id`, `name`, `phone`, `address`, `notes`, `createdAt` |
| `bb_products` | array | `id`, `name`, `packType`, `weight`, `unitPrice`, `categoryId` |
| `bb_categories` | array | `id`, `name`, `color` |
| `bb_invoices` | array | `id`, `customerId`, `invoiceNumber`, `date`, `customerName`, `customerPhone`, `items[]` (`productId`, `name`, `packType`, `weight`, `categoryId`, `qty`, `price`) |
| `bb_inv2` | object | editor snapshot `C` (print colors), `S` (strings, discount, labels) |
| `bb_invoice_payments` | map id→ | `status` (`paid`/`pending`), `updatedAt` |
| `bb_customer_payments` | array | `id`, `date`, `customerId`, `customerName`, `amount`, `mode`, `notes`, `invoiceId`, `prevStatuses` |
| `bb_pending_invoices` | array | `kind` (`invoice_draft`), `status`, `title`, `customerId`, `items[]`, dates |
| `bb_invoice_bundles` | array | `id`, `name`, `items[]` |
| `bb_returns` | array | `disposition` (`restock`/`expired`/`mixed`), `items[]`, `amount`, `customerId` |
| `bb_materials` / `bb_packages` | array | `id`, `name`, `unit`, `costPerUnit`, `currentStock` (cache), `minStock`, `supplier`, `notes` |
| `bb_stickers` | array | same + `productId`, `recipeId`, `templateKey` |
| `bb_recipes` | array | `id`, `name`, `batchSize`, `ingredients[]` (`itemId`, `itemType`, `qty`), `productId`, `unitPrice` |
| `bb_purchases` | array | `itemType`, `itemId`, `qty`, `costPerUnit`, `totalCost`, `supplier` (`تسوية جرد` / `رصيد افتتاحي` / real) |
| `bb_production` | array | `recipeId`, `unitsProduced`, `deductions[]`, `isAdjustment` |
| `bb_operation_costs` | array | `date`, `name`, `category`, `amount` (compensation may be negative) |
| `bb_investors` | array | (live file currently empty `[]`) |
| `bb_investor_target` | object | `needed`, `split`, `projectStart` |
| `bb_label_templates` | array | `id`, `name`, `designType`, `labelMode`, large `state` |
| `bb_label_open` | object | `stickerId`, `templateId`, `productId`, `ts` |
| `bb_color_presets` | array | `id`, `name`, `bg`, `gold`, `txt`, `mut`, `row`, `tot`, `grand` |
| `bb_backup_index` | array | `id`, `createdAt`, `label` |

Also on disk, **not** Firestore key docs: `label_assets/**`, `bb_backups/*.json`, `bbLabel-*.json`.

---

## Explicit gaps (this slice)

- Design and Finance are still **stubs**. Invoices is a native React app on the same keys.
- Import script is dry-run by default and was **not executed**.
- `bb_backup_locals` (last 2 browser snapshots) stays out of Firestore. Restore from Desktop `bb_backups/`.
- Cloud Storage is **not used** (Spark / free tier). Designer assets and finance backup files stay on Desktop.
- On-screen invoice chrome is the linen hub. Print asks: **Invoice Pro** (saved white/green `bb_inv2`), any stored color preset, or **web-app linen**.
- Invoice app does **not** seed DEFAULT_PRODUCTS / DEFAULT_CATEGORIES / color-preset dumps when cloud keys are missing.

---

## Suggested next slice

1. Import `saved data` only after a zip backup, when you say so — invoices will then show live customers/catalog.
2. Build Finance (stock ledger, prep, P&L) or wrap `bb-stock-costs.html`.
3. Build Design or wrap `balance-bites-sticker.html`.
