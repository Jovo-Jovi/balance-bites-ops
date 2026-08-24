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
- [x] Staff allowlist live in Firebase (`staff/{uid}` created in Console — not in the app)
- [x] Vercel production https://balance-bites-ops.vercel.app (Firebase Auth still gates data)

---

## CloudStore / data

- [x] Same `bb_*` keys → `tenants/balance-bites/keys/{key}` (`data`, `updatedAt`, `updatedBy`, `clientWriteId`)
- [x] Firestore preferred on hydrate (empty localStorage cannot wipe cloud)
- [x] `Store.set` / `CloudStore.set` surfaces write errors (no silent fail)
- [x] `onSnapshot` + `clientWriteId` so another tab toasts instead of silent clobber
- [x] Prep / print keys that were localStorage-only now listed as Firestore keys
- [x] One-shot import of `saved data` JSON (re-run with `--apply` when Desktop files change)
- [x] Cloudflare R2 wiring for `label_assets/` and `bb_backups/` (not Firebase Storage)
- [x] Create the R2 bucket + API token, then `npm run storage:init` and `npm run import:assets`
- [ ] HTML wrap for Design / Finance (`public/bb-cloud-store.js` exists; invoices were rebuilt as React instead)

### Keys imported from disk today

`bb_invoices`, `bb_inv2`, `bb_customers`, `bb_products`, `bb_categories`, `bb_invoice_payments`, `bb_customer_payments`, `bb_pending_invoices`, `bb_invoice_bundles`, `bb_returns`, `bb_materials`, `bb_packages`, `bb_stickers`, `bb_recipes`, `bb_purchases`, `bb_production`, `bb_operation_costs`, `bb_investors`, `bb_investor_target`, `bb_label_templates`, `bb_label_open`, `bb_color_presets`, `bb_active_color_preset_id`, `bb_active_theme`, `bb_backup_index`

### Keys localStorage-only on Desktop — now CloudStore keys

`bb_prep_lines`, `bb_prep_ing_view`, `bb_prep_prod_mode`, `bb_prep_print_mode`, `bb_inv_print_preset_id`, `bb_print_fit_one`, `bb_ret_last_customer`

---

## Invoices (`balance-bites-invoice-pro.html` → Next.js modules)

Native React workspace (not an HTML wrap). Merged `feat/invoices` + `fix/invoices-ux` (21 Aug 2026). File map and UX rules: [INVOICES.md](INVOICES.md). Journal: [JOURNAL.md](JOURNAL.md). Catalog is read-only. No default products / categories / presets written on empty cloud.

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
- [x] السجل filter معلقة / مدفوعة; print from invoice cards
- [x] Load invoice jumps to فاتورة; customer dialogs portal to the viewport
- [x] Print look always has a chosen preset (`__inv2__` fallback)

---

## Design (`balance-bites-sticker.html` + JS)

Native hub app (`docs/DESIGN.md`). Three tools: Library, Studio (`?tab=atelier`), Print house. Not an HTML wrap. Branch `feat/design`.

- [x] Template library CRUD (`bb_label_templates`)
- [x] Import/export template JSON (`bb_label_template_v2`); user-picked file
- [x] `label_assets/{templateId}/` strip/hydrate on Cloudflare R2 (`__asset__:` / reuse `__r2__:`)
- [x] Deep link `bb_label_open` from finance stickers (120s TTL, then clear)
- [x] Product select from `bb_products`; linked SKUs from `bb_stickers` (read-only)
- [x] Print house constants (1.5 mm bleed, 300 DPI) + SVG preview/download
- [x] Print / PDF / SVG at exact artboard cm (no A4 scale, `print-color-adjust`, print fonts). File name `{Name}_{w}x{h}cm`
- [x] Print house cut stroke as an editable border around the die-cut (size mm + colour; grows **outside** the die)
- [x] Studio Layers Up / Down restack composite shapes, logo, and text in one z-order (live interact list)
- [x] Studio background uploads (`hxBg*` / `hxCProd`) on any family — Studio **Images** tab
- [x] Composite extra photos as image zones (live `addProductPhotos`); pick from R2 or the device
- [x] Images → Storage picker: linen tile grid with R2 previews (PNG/JPEG and stored `.txt` data URLs)
- [x] Flavor pack **Loaded** chip for the colors already on the open template
- [x] Icon library in Studio (repo catalog + live A–Z letter fonts; wrap / taper / circle / lid / composite)
- [x] `artref:` / `assets/presets/` character art (popcorn, chicopon, …) from repo SVGs; photo fill + path stroke like live (not clip-to-path)
- [x] Studio select + drag of parts, zones, stamps, and uploaded images
- [x] Studio rotate handle + Layers rotate slider (`rot` on composite; family offsets keep live `sC*` / `sT*` / section keys)
- [x] Circular / outline families use live front layout (logo, brand, flavor, photo, weight, dates) in **pixel** `cW`×`cH` (ellipse clip, not a stretched 0–100 square)
- [x] Rect + top uses live back wrap (`buildLabel` sections + `getSectionHTML`) and top lid (`buildTopLabel`) in pixel boxes
- [x] Taper + top uses live `calcTaper` fan: pixel viewBox, rotate around apex, section HTML — **not** remapped to `0 0 100 100` / `preserveAspectRatio="none"`
- [x] Studio inspector is face-aware (Copy / Nutrition / Layout / Type / Size / Color). Canvas first. Flavor packs tint the sticker only
- [x] Select a section to type in it; wrap/taper QR and weight move separately from dates; wrap logo disc and brand names are separate boxes
- [x] Compact Library thumbs (cheap die silhouette for every family; no `/design-presets` files in the grid; no live FO). Design scroll uses a solid sheet, not glass blur
- [x] Wrap / taper Layers Up / Down reorder columns (`eSecOrd`); per-layer size + **outward** border (Dates / QR / Weight are separate); popcorn black rim is Print cut
- [x] Rect wrap Nutrition fits the column (no transform-scale clip); left Ingredients stay as stored
- [ ] Legacy Desktop scan of `bbLabel-*.json` (import the file instead)
- [x] Composite Studio Wave A: add shape (`PART_TYPES`), shift multi-select, merge / group / ungroup / trim (group clip), preview cut / approve / cut = selected, undo — native raster union from live `BBComposite`
- [x] PNG cut pack (Wave B) — exact cm + transparent outside die-cut; one label, not a zip; Cut / Exact / Bleed PNG
- [x] Family print / SVG / PNG match Studio hit-boxes (top lid, circle, wrap). Delete template removes the R2 art folder
- [ ] Studio libraries rail (Wave C)
- [ ] User-named sections + blank-from-scratch (Wave D)
- [ ] Applying `assets/presets/` folders into tenant templates (repo, not tenant dump)

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

- **Invoices is done** (native React). **Design** is a native three-tool workspace (library / studio / print). Finance is still a **tool shell**.
- Design does **not** wrap `balance-bites-sticker.html`. Wave B PNG cut pack is in test; libraries rail, generic sections, icon/Jelly Kids/art-preset application, and Desktop `bbLabel-*` folder scan are listed above — not silently dropped.
- Design does **not** seed flavor packs, Jelly Kids, or sample templates when `bb_label_templates` is missing.
- Shared `bb_color_presets` stay on Invoices → Look. Design flavor packs are code-only.
- Import script is dry-run by default. **2026-08-21:** `bb_label_templates` + `label_assets/` imported. **2026-08-22:** Desktop `saved data` JSON keys were written to Firestore (zip on Desktop, not git). Use `--only=` for a subset; npm steals `--keys`.
- `bb_backup_locals` (last 2 browser snapshots) stays out of Firestore. Restore from Desktop `bb_backups/`.
- Cloud Storage is **not used** (Spark / free tier). Label art lives on Cloudflare R2.
- On-screen invoice chrome is the linen hub. Print asks: **Invoice Pro** (saved white/green `bb_inv2`), any stored color preset, or **web-app linen**.
- Invoice app does **not** seed DEFAULT_PRODUCTS / DEFAULT_CATEGORIES / color-preset dumps when cloud keys are missing.

---

## Suggested next slice

1. **Wave C after Wave B is tested:** libraries rail in [DESIGN-STUDIO.md](DESIGN-STUDIO.md). Then D (generic sections). Do not start the next wave until the current one is confirmed.
2. Finance (stock ledger, prep, P&L) from `bb-stock-costs.html`.
3. Import remaining keys only when asked (`node scripts/import-saved-data.mjs --apply --only=…`). Full folder already applied 2026-08-22.
