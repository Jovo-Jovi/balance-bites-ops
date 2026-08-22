# Paste this into a new Cursor Agent chat

Workspace must be `C:\Users\Marco\Desktop\balance-bites-ops` with `C:\Users\Marco\Desktop\costs` added as a second folder (and optionally `saved data`).

---

You are building **Balance Bites Ops** from scratch: one HTTPS hub (Next.js on Vercel) with three apps after login — Invoices, Design, Finance & Inventory — sharing one Firebase tenant.

This is a **behavior-accurate rebuild**, not a redesign of the business rules. Read the live HTML and docs **before** writing code. If a screen, formula, or data key exists today, the new system must cover it or you must list it as an explicit gap — never silently drop it.

## Goal

- One URL, Arabic RTL hub, linen-desk brand (ink on paper, teal actions).
- After login, three equal cards only (no KPIs on the hub).
- Same JSON keys as today, stored in Firestore (`tenants/balance-bites/keys/{key}`).
- Label art in Cloudflare R2 (`label_assets/`). Not Firebase Storage (Spark).
- GitHub is code only. Live invoices stay on Desktop until a one-shot import.

## Repo and accounts (already decided)

- Write all new code in this repo: `C:\Users\Marco\Desktop\balance-bites-ops`
- Git remote: `https://github.com/Jovo-Jovi/balance-bites-ops` (private)
- Vercel team: `jiovanny's projects` / `team_axcyEdkIz5RpW3pHt9gtuWuq`
- Database: **Firebase** (Auth + Firestore + Storage), not Supabase for v1
- Do not use Cursor Origin (unsupported on native Windows)

## Reference files — READ THESE FIRST

Treat these as the specification. Search inside them; do not guess modules.

### Cloud docs (this repo)

| File | Why |
|---|---|
| `C:\Users\Marco\Desktop\balance-bites-ops\docs\ARCHITECTURE.md` | Layers, CloudStore vs FileStore, Firestore shape |
| `C:\Users\Marco\Desktop\balance-bites-ops\docs\CLOUD-PLAN.md` | Phases, Auth, import, risks (1 MB doc limit) |
| `C:\Users\Marco\Desktop\balance-bites-ops\docs\MODULES.md` | Module map for all three apps |
| `C:\Users\Marco\Desktop\balance-bites-ops\docs\DATA.md` | Who writes which `bb_*` key; derived vs stored |
| `C:\Users\Marco\Desktop\balance-bites-ops\docs\BRAND-UI.md` | Hub UX, fonts, colors, language |
| `C:\Users\Marco\Desktop\balance-bites-ops\README.md` | Product summary |
| `C:\Users\Marco\Desktop\balance-bites-ops\docs\DESIGN.md` | Design app map (library / studio / print) |
| `C:\Users\Marco\Desktop\balance-bites-ops\docs\DESIGN-STUDIO.md` | Proposed studio waves — **confirm before coding** |
| `C:\Users\Marco\Desktop\balance-bites-ops\SETUP.md` | Firebase/Vercel human steps |
| `C:\Users\Marco\Desktop\balance-bites-ops\.env.example` | Env var names |

### Live apps — feature + logic source (do not modify unless asked)

| File | Hub card | What to extract |
|---|---|---|
| `C:\Users\Marco\Desktop\costs\bb-stock-costs.html` | Finance & Inventory | Tabs, ledger, prep, P&L, shutdown, investors |
| `C:\Users\Marco\Desktop\costs\balance-bites-invoice-pro.html` | Invoices | Editor, customers, catalog pickers, print, pending, reports |
| `C:\Users\Marco\Desktop\costs\balance-bites-sticker.html` | Design | Artboard, templates, FileStore assets, deep link |
| `C:\Users\Marco\Desktop\costs\bb-prepress.js` | Design | Print-house export |
| `C:\Users\Marco\Desktop\costs\bb-composite-label.js` | Design | Composite layout |
| `C:\Users\Marco\Desktop\costs\bb-icon-library.js` | Design | Icon stamps |
| `C:\Users\Marco\Desktop\costs\bb-jelly-kids.js` | Design | Jelly Kids preset |
| `C:\Users\Marco\Desktop\costs\assets\presets\bb-art-preset-data.js` | Design | Art presets |
| `C:\Users\Marco\Desktop\costs\assets\presets\meta.json` | Design | Preset index |
| `C:\Users\Marco\Desktop\costs\assets\presets\templates\` | Design | Repo templates (not tenant data) |
| `C:\Users\Marco\Desktop\costs\report.md` | Finance | Save races, duplicate formulas, accounting review — **do not copy bugs blindly**; copy **intended** rules from §2–§4 and keep formulas that users rely on |

### Live database — schema + migrate later (never commit)

Folder: `C:\Users\Marco\Desktop\BALANCE BITES\invoices customers\saved data`

Read a sample of each `bb_*.json` to learn **field names and shapes**. Also note:

- `label_assets/` (if present) and `bbLabel-*.json` legacy template files
- `bb_backups/` snapshots

JSON keys in use today (import all of these):

`bb_invoices`, `bb_inv2`, `bb_customers`, `bb_products`, `bb_categories`, `bb_invoice_payments`, `bb_customer_payments`, `bb_pending_invoices`, `bb_invoice_bundles`, `bb_returns`, `bb_materials`, `bb_packages`, `bb_stickers`, `bb_recipes`, `bb_purchases`, `bb_production`, `bb_operation_costs`, `bb_investors`, `bb_investor_target`, `bb_label_templates`, `bb_label_open`, `bb_color_presets`, `bb_active_color_preset_id`, `bb_active_theme`, `bb_backup_index`

Keys that exist only in browser localStorage today (must still exist in the new app, and should be synced to Firestore so they are not lost):

`bb_prep_lines`, `bb_prep_ing_view`, `bb_prep_prod_mode`, `bb_prep_print_mode`, print/theme extras listed in `report.md` §2.2

### Desktop copies (often stale — prefer `costs\` for code)

`C:\Users\Marco\Desktop\bb-stock-costs.html`  
`C:\Users\Marco\Desktop\balance-bites-invoice-pro.html`

Do not treat Desktop HTML as newer than `costs` unless the user says so.

## Writer map (do not invert)

| Key | Invoice Pro | Stock Costs | Designer |
|---|---|---|---|
| `bb_invoices`, `bb_inv2`, `bb_customers` | write | **read** (except prep-approve `writeAnyKey`) | — |
| `bb_products`, `bb_categories` | read / some catalog | write | read products |
| `bb_invoice_payments`, `bb_pending_invoices`, `bb_returns`, color presets | write | write | color presets |
| Inventory, purchases, recipes, production, opex, investors | — | write | — |
| `bb_label_templates`, `label_assets/` | — | link / `bb_label_open` | write |

## Non-negotiable business rules (verify in HTML, then implement)

1. **On-hand is derived**, not a typed master field.  
   `getDisplayStock` / ledger: **sum(purchases) − BOM usage from invoices**.  
   If there are **no invoices**, usage falls back to production.  
   Typing a count writes a purchase (`رصيد افتتاحي` / `تسوية جرد`). Saving an item card **without** changing stock must **not** write a counteracting adjustment.

2. **Profit (الأرباح / صافي الربح)** = sales − COGS of **sold** − opex − hawalek.  
   **Does not include leftover stock.** Stock is an asset (`قيمة المخزون`). Dashboard / investor NAV **does** include stock.

3. **Shutdown card (إغلاق المشروع الآن)** — two scenarios, pending always treated as collected:  
   - Stock → cash: liquid = paid + pending + stock **at cost**; P&L = liquid − spent  
   - Stock → loss: liquid = paid + pending; P&L = liquid − spent

4. **Prep invoices (🥣 التحضير · فواتير التحضير)**  
   Not “clone the same items to many customers.”  
   Flow: pick **customer** → add **that customer’s items** → another customer, etc. Drafts until per-customer اعتماد.  
   Drafts: `kind: 'invoice_draft'`. Invoice Pro pending cards **skip** those.  
   Approve writes real `#INV-` invoices. Combined sheet / print uses **component** (BOM) totals.  
   Prep **شراء** opens purchase modal with item + shortfall qty (needed − stock; user may increase).

5. **Prep vs production**  
   Do not mix approve buttons. `invoice_draft` is not a production job.

6. **CloudStore**  
   `Store.set` must not silent-fail. Prefer Firestore as source of truth on load (do not let empty localStorage wipe the cloud). Surface write errors. Use `updatedAt` / snapshots so two tabs do not silently clobber.

7. **UI language**  
   Hub + invoices + finance: Arabic RTL. Designer: English chrome, Arabic product names. Docs in this repo: English.

8. **Brand**  
   Playfair Display 900 ink `#1f2930` on linen `#f4f0ea`. Teal `#0f6e6b` on buttons only. Diamond (rotated square) mark. No second logo. Hub: three cards only. Semi-glass on hub cards.

## Feature parity checklist (build or track every item)

Before calling a module “done”, grep the live HTML and tick these.

### Hub

- [x] Login (email/password; Google optional)
- [x] Three cards: الفواتير / التصميم / المالية والمخزون
- [x] Sign out, tenant name in footer
- [x] Redirect to login if session missing

### Invoices (`balance-bites-invoice-pro.html`)

Shipped as native React (PRs #1 + #2, 21 Aug 2026). See `docs/INVOICES.md` and `docs/JOURNAL.md`. Do not rebuild this app when starting Design.

- [x] Connect-folder equivalent = CloudStore (no Desktop required in production)
- [x] New / save invoice, print, editor accordion
- [x] Customers CRUD + customer list print
- [x] Categories + products pickers (add one, add whole category, add selected categories)
- [x] Manual line + catalog line, packs/weights
- [x] Bundles (save invoice lines, multi-copy invoices)
- [x] Pending queue — skip `invoice_draft`; complete pending
- [x] Invoice history, customer history before proceed
- [x] Color presets / theme
- [x] Reports: إجمالي، عميل، أفضل منتج، منتج + date filters
- [x] Price list print
- [x] Totals: subtotal, discount, grand total
- [x] Payments flags shared with finance
- [x] Returns **display** (finance writes returns)

### Design (`balance-bites-sticker.html` + JS)

Shipped as native React on `feat/design` (21–22 Aug 2026). See `docs/DESIGN.md` and `docs/JOURNAL.md`. Do not wrap the sticker HTML. Do not start Finance until asked.

- [x] Template library CRUD (`bb_label_templates`)
- [x] Import/export JSON (`bb_label_template_v2`)
- [x] `label_assets/{templateId}/` strip/hydrate → Cloudflare R2 (not Firebase Storage); reuse `__r2__:`
- [x] Deep link `bb_label_open` from finance stickers
- [x] Product select from `bb_products`; sticker SKUs read-only
- [x] Print house bleed/DPI + SVG preview + editable cut stroke
- [x] Studio Copy / Images / Icons / Layers; drag, rotate, resize
- [x] Live faces: composite `_composite`; circular `buildCircleLabel`; rect wrap / top lid; taper `calcTaper`
- [x] Icon picker in Studio (repo catalog + live A–Z letters; not a Firestore dump)
- [x] Character art from repo `public/design-presets/` (`artref:`)
- [x] Composite Studio Wave A (add shape / merge / group / trim / preview+approve cut)
- [ ] PNG cut pack (Wave B) / libraries rail (Wave C) / user-named sections (Wave D) — [DESIGN-STUDIO.md](docs/DESIGN-STUDIO.md)
- [ ] Applying `assets/presets/` folders into tenant templates / Jelly Kids dump
- [ ] Desktop folder scan of `bbLabel-*.json` (pick a file instead)

### Finance (`bb-stock-costs.html` tabs — all of them)

- [ ] لوحة التحكم — including shutdown two scenarios
- [ ] الفواتير — read invoices; paid/pending; customer ledger
- [ ] COGS
- [ ] الأرباح — P&L rule above
- [ ] المستثمرون
- [ ] المخزون — ledger qty × cost + finished goods
- [ ] المشتريات
- [ ] المواد الخام / التغليف / الملصقات
- [ ] الكتالوج + بطاقات المنتج
- [ ] الوصفات (BOM)
- [ ] التحضير + فواتير التحضير + شراء shortfall
- [ ] الإنتاج
- [ ] المرتجعات (restock vs expired / hawalek)
- [ ] تكاليف التشغيل
- [ ] Backups (`bb_backups`)
- [ ] Theme / color presets shared with other apps
- [ ] Item modal: fill stock from ledger; skip تسوية if stock field unchanged
- [ ] After real purchase, bump ledger immediately

## Suggested build order

1. ~~Scaffold Next.js + CloudStore + hub.~~ Done.
2. ~~Port invoices as native React.~~ Done (`docs/INVOICES.md`).
3. ~~Port Design as native React.~~ On `feat/design` (`docs/DESIGN.md`). Do not wrap the sticker HTML. Merge when asked.
4. Finance (hardest formulas) from `bb-stock-costs.html`.
5. **Import script** (`saved data` → Firestore) only when the user says; zip backup first.
6. Production is live at https://balance-bites-ops.vercel.app — still staff-only Auth + Firestore rules. Do not dump empty catalogs.

## Constraints

- Do not commit secrets or live JSON.
- Do not change git remotes.
- Do not rewrite `costs` live files as part of this project unless the user asks.
- When unsure, open the HTML function (`getDisplayStock`, `buildLinkedState`, `PendingInvoiceMgr`, FileStore `WRITE_KEYS` / `READ_KEYS`) and match it.
- After each slice, list remaining unchecked parity items.

Start from `docs/JOURNAL.md` + `docs/INVOICES.md` + `docs/DESIGN.md`. Hub and invoices are on `main`. Design is native on `feat/design`. Studio PNG/composite is **proposed** (`docs/DESIGN-STUDIO.md`) — confirm waves before coding. Next app slice is Finance unless asked — grep `costs/bb-stock-costs.html`, do not duplicate invoice or design modules, do not dump empty keys.
