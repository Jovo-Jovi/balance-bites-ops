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
- [x] HTML wrap dropped — three native React apps; deleted `public/bb-cloud-store.js` (localStorage-only `Store.remove`) and unauthenticated `/api/firebase-config`

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

Native hub app (`docs/DESIGN.md`). Three tools: Library, Studio (`?tab=atelier`), Print house. Not an HTML wrap. Waves A–D on `main` (PR #4 A–B, PR #5 C–D).

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
- [x] `artref:` / `assets/presets/` character art (popcorn, chicopon, …) from repo SVGs; Studio and print use the same `/design-presets/*.svg` files. Photo fill + path stroke like live (not clip-to-path). Preset files letterbox a square viewBox in a tall canvas — hub slices that into the part so Print cut hugs the kernels
- [x] Studio select + drag of parts, zones, stamps, and uploaded images
- [x] Studio rotate handle + Layers rotate slider (`rot` on composite; family offsets keep live `sC*` / `sT*` / section keys)
- [x] Circular / outline families use live front layout (logo, brand, flavor, photo, weight, dates) in **pixel** `cW`×`cH` (ellipse clip, not a stretched 0–100 square)
- [x] Rect + top uses live back wrap (`buildLabel` sections + `getSectionHTML`) and top lid (`buildTopLabel`) in pixel boxes
- [x] Taper + top uses live `calcTaper` fan: pixel viewBox, rotate around apex, section HTML — **not** remapped to `0 0 100 100` / `preserveAspectRatio="none"`
- [x] Studio inspector is face-aware (Copy / Nutrition / Layout / Type / Size / Color). Canvas first. Flavor packs tint the sticker only
- [x] Inspector Layers / Layout / Type / Size / Color stay open when a wrap column is selected; Nutrition does not trap Layers. Images / Icons live in the Libraries rail
- [x] Select a section to type in it; wrap/taper QR and weight move separately from dates; wrap logo disc and brand names are separate boxes
- [x] Compact Library thumbs (saved raster WebP/PNG snap of the live design, including wrap/taper/circle FO copy, character kernels, and Composite **pack PNG** zones; missing snap = Path2D die plus on-screen pack PNGs, no FO / no popcorn SVG fetch). Design scroll uses a solid sheet, not glass blur
- [x] Wrap / taper Layers Up / Down reorder columns (`eSecOrd`); per-layer size + **outward** border (Dates / QR / Weight are separate); popcorn black rim is Print cut
- [x] Composite Size / resize keeps Print cut on the silhouette (`pathLocal` for a sole character, not a scaled raster trace); seeded characters without `cutSourceIds` still rebuild on drag-end
- [x] Composite Round sq / Round rect borders match live: physical square on non-square boards (`syncEqualAspectPart`), cut-polygon corners (`partFillPathLocal`, 18% not 11%), stroke outside the die clip so it is not eaten inward
- [x] Composite text / logo / image Layers Border sits fully outside the fill (outset stroke); unfilled text rings hug the type, not the drag frame; wrap Nutrition ring is on an overflow-visible wrapper; taper FO does not clip `box-shadow` rings
- [x] Composite fill + decorative stroke share Layers z (jelly-blob rim no longer paints above later icons / type)
- [x] Design Save / Delete / New / Duplicate show an indeterminate progress bar (snap + cloud wait)
- [x] Rect wrap Nutrition fits the column (no transform-scale clip); left Ingredients stay as stored
- [ ] Legacy Desktop scan of `bbLabel-*.json` (import the file instead)
- [x] Composite Studio Wave A: add shape (`PART_TYPES`), shift multi-select, merge / group / ungroup / trim (group clip), preview cut / approve / cut = selected, undo — native raster union from live `BBComposite`
- [x] PNG cut pack (Wave B) — exact cm + transparent outside die-cut; one label, not a zip; Cut / Exact / Bleed PNG
- [x] Family print / SVG / PNG match Studio hit-boxes (top lid, circle, wrap). Delete template removes the R2 art folder
- [x] Studio libraries rail (Wave C) — Shapes / Pack art / Blocks / Icons / Uploads / Brand / Characters inside Studio; Images / Icons inspector tabs folded in; wrap recipe `chkS*` with Remove; composite `addZone` removable; Characters = DiceBear people library (not product stickers). Pack art is Kids / Adults (trimmed RGBA), named in Layers
- [x] Layers list drag-reorder (⋮⋮) plus Up / Down; wrap columns via `eSecOrd`, composite via z
- [x] User-named sections + blank-from-scratch (Wave D) — new template die-only unless starter recipes; wrap `_blocks` + `eSecOrd`; legacy `chkS*` / Custom column still open
- [ ] Dumping `assets/presets/` / Jelly Kids catalogs into Firestore (product art stays `artref:` on saved templates; Characters rail does not list them)

---

## Finance (`bb-stock-costs.html` — every tab)

| Tab | Live purpose | Status |
|---|---|---|
| لوحة التحكم | Project cost, sales, stock, **shutdown two scenarios**, mix bars, formula hover | [x] |
| الفواتير | Read invoices; paid/pending; customer account modal; multi-print; undo last payment; read-only Look strip | [x] |
| COGS | Recipe unit cost vs sell / margin | [x] |
| الأرباح | P&L = sales − COGS of **sold** − opex − hawalek (not leftover stock); from/to window + print | [x] |
| المستثمرون | WC diary peak (lag / journal placement); join-date profit; NAV × toward/peak; copy cash shortfall | [x] |
| المخزون | Ledger qty × cost + finished goods | [x] |
| المشتريات | Buy-ins; ledger source of qty | [x] |
| المواد الخام | Catalog + inline qty; ok/low/crit + usage filters | [x] |
| التغليف | Catalog + inline qty; ok/low/crit + usage filters | [x] |
| الملصقات | Swatch cards; tap opens Studio via `bb_label_open`; ok/low/crit + usage filters | [x] |
| الكتالوج | Products, categories, inactive | [x] |
| بطاقات المنتج | BOM cards | [x] |
| الوصفات | BOM, batch, product link | [x] |
| التحضير | Board first (save/send/print); unsent list; drafts; شراء; BOM print; اعتماد الكل | [x] |
| الإنتاج | Runs; gap table defaults to ينقص; تجهيز الناقص; load/delete unsent / awaiting | [x] |
| المرتجعات | Restock vs expired / hawalek | [x] |
| تكاليف التشغيل | Rent, wages, compensation (negative OK) | [x] |

Also:

- [x] Backups (`bb_backups` + `bb_backup_index`)
- [x] Local zip download of existing Firestore `bb_*` keys plus R2 `label_assets/` (hub / workspace footer / Finance ops)
- [ ] Theme / color presets shared (Invoices → Look owns; Finance does not write them)
- [x] Item modal: fill stock from ledger; skip `تسوية جرد` if stock field unchanged
- [x] After real purchase, bump ledger immediately (`bumpLedgerAfterPurchaseQty`)

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
| `bb_investor_target` | object | `needed`, `split`, `projectStart`, `collectionLag`, `stockPlacement`, `includeResidual` |
| `bb_label_templates` | array | `id`, `name`, `designType`, `labelMode`, `libraryThumb` (R2 WebP/PNG ref), large `state` |
| `bb_label_open` | object | `stickerId`, `templateId`, `productId`, `ts` |
| `bb_color_presets` | array | `id`, `name`, `bg`, `gold`, `txt`, `mut`, `row`, `tot`, `grand` |
| `bb_backup_index` | array | `id`, `createdAt`, `label` |

Also on disk, **not** Firestore key docs: `label_assets/**`, `bb_backups/*.json`, `bbLabel-*.json`.

---

## Explicit gaps (this slice)

- **Invoices is done** (native React). **Design** is a native three-tool workspace (library / studio / print). **Finance** is a native eight-tool workspace on `feat/finance` (not merged). Finance invoices: customer tap opens an account modal; multi-select print original/net; undo last payment restores remaining; Look name / page / margins shown read-only (Invoices → Look still writes those keys). Investor table uses the working-capital event diary for peak / تعيين (collection lag, leftover stock on the live journal window 15 Jul–14 Aug or today, pending invoices never become تحصيل). Overview mix bars + formula hover; stock alerts live on المخزون; الأرباح has a from/to P&L window and print; unmatched invoice lines (no recipe) hinted on Overview / Recipes. Stock catalogs filter ok/low/crit and usage; sticker swatch cards tap through to Design Studio. Prep prints the current board plus draft sheet / BOM. Prep can save an unsent order, load it back onto the board, approve all drafts, and fill the board from production gaps.
- Look editing stays on Invoices (Finance does not write `bb_inv_*` print keys). Not ported on purpose: COGS / stock-value print (on-screen reports stay); on-screen `bb_prep_ing_view` total-vs-each (print mode already has both); `splitSharedStickersToProducts` (live button hidden unless shared stickers).
- Design does **not** wrap `balance-bites-sticker.html`. Wave D generic sections are on `main`. Jelly Kids dump and Desktop `bbLabel-*` folder scan are listed above — not silently dropped.
- Design does **not** seed flavor packs, Jelly Kids, or sample templates when `bb_label_templates` is missing.
- Shared `bb_color_presets` stay on Invoices → Look. Design flavor packs are code-only.
- Import script is dry-run by default. **2026-08-21:** `bb_label_templates` + `label_assets/` imported. **2026-08-22:** full Desktop JSON set. **2026-08-26:** finance keys only (`bb-saved-data-2026-08-26.zip` on Desktop; no templates, Look, invoices, or R2). Use `--only=` for a subset; npm steals `--keys`.
- `bb_backup_locals` (last 2 browser snapshots) stays out of Firestore. Restore from Desktop `bb_backups/`.
- Cloud Storage is **not used** (Spark / free tier). Label art lives on Cloudflare R2.
- On-screen invoice chrome is the linen hub. Print asks: **Invoice Pro** (saved white/green `bb_inv2`), any stored color preset, or **web-app linen**.
- Invoice app does **not** seed DEFAULT_PRODUCTS / DEFAULT_CATEGORIES / color-preset dumps when cloud keys are missing.
- **T14 deferred:** `bb_invoices` stays one document. Year shards when the 1 MiB ceiling is near (~730 typical invoices). CAS (`prevWriteId`) is already in; do not shard on top of an unenforced conflict token. Reports (`reports.ts`) and finance analytics must read across shards when that work starts. Spark read/write quotas are not the reason.

---

## Suggested next slice

1. Merge `feat/finance` → `main` when Waves A–E are confirmed.
2. Import remaining keys only when asked (`node scripts/import-saved-data.mjs --apply --only=…`). Full folder 2026-08-22; finance-only refresh 2026-08-26.
