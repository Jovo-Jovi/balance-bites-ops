# Paste this into a new Cursor Agent chat

Workspace must be `C:\Users\Marco\Desktop\balance-bites-ops` with `C:\Users\Marco\Desktop\costs` added as a second folder (and optionally `saved data`).

---

You are building **Balance Bites Ops** from scratch: one HTTPS hub (Next.js on Vercel) with three apps after login — Invoices, Design, Finance & Inventory — sharing one Firebase tenant.

This is a **behavior-accurate rebuild**, not a redesign of the business rules. Read the live HTML and docs **before** writing code. If a screen, formula, or data key exists today, the new system must cover it or you must list it as an explicit gap — never silently drop it.

## Goal

- One URL, Arabic RTL hub, linen-desk brand (ink on paper, teal actions).
- After login, three equal cards only (no KPIs on the hub).
- Same JSON keys as today, stored in Firestore (`tenants/balance-bites/keys/{key}`).
- Label art in Firebase Storage (`label_assets/`).
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

- [ ] Login (email/password; Google optional)
- [ ] Three cards: الفواتير / التصميم / المالية والمخزون
- [ ] Sign out, tenant name in footer
- [ ] Redirect to login if session missing

### Invoices (`balance-bites-invoice-pro.html`)

- [ ] Connect-folder equivalent = CloudStore (no Desktop required in production)
- [ ] New / save invoice, print, editor accordion
- [ ] Customers CRUD + customer list print
- [ ] Categories + products pickers (add one, add whole category, add selected categories)
- [ ] Manual line + catalog line, packs/weights
- [ ] Bundles (save invoice lines, multi-copy invoices)
- [ ] Pending queue — skip `invoice_draft`; complete pending
- [ ] Invoice history, customer history before proceed
- [ ] Color presets / theme
- [ ] Reports: إجمالي، عميل، أفضل منتج، منتج + date filters
- [ ] Price list print
- [ ] Totals: subtotal, discount, grand total
- [ ] Payments flags shared with finance
- [ ] Returns **display** (finance writes returns)

### Design (`balance-bites-sticker.html` + JS)

- [ ] Template library CRUD (`bb_label_templates`)
- [ ] Legacy `bbLabel-*.json` import if still present
- [ ] `label_assets/{templateId}/` binary/text assets → Storage
- [ ] Prepress (`bb-prepress.js`), composite (`bb-composite-label.js`)
- [ ] Icon library, Jelly Kids, art presets in `assets/presets/`
- [ ] Deep link `bb_label_open` from finance stickers
- [ ] Product select from `bb_products` / `bb_stickers`

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

1. Scaffold Next.js App Router in this repo (TypeScript). RTL layout, fonts from BRAND-UI.
2. Firebase client: Auth + CloudStore (`get`/`set`/`onSnapshot` per `bb_*` key).
3. Hub `/` + `/invoices` `/design` `/finance` routes (stubs OK).
4. **Import script** that reads `saved data\*.json` → Firestore (run only when user says; zip backup first).
5. Port finance first (hardest rules), then invoices, then designer — **or** Phase 1 wrap: copy HTML into `public/` on the same origin and swap FileStore for CloudStore, if that is faster to reach parity. Prefer wrap-then-rewrite over dropping features.
6. Do not create a Vercel production deploy until Auth + locked Firestore rules exist.

## Constraints

- Do not commit secrets or live JSON.
- Do not change git remotes.
- Do not rewrite `costs` live files as part of this project unless the user asks.
- When unsure, open the HTML function (`getDisplayStock`, `buildLinkedState`, `PendingInvoiceMgr`, FileStore `WRITE_KEYS` / `READ_KEYS`) and match it.
- After each slice, list remaining unchecked parity items.

Start by: (1) confirming the workspace folders, (2) scaffolding Next.js + Firebase CloudStore, (3) a short parity backlog file in this repo generated from the live tabs/modules — then implement hub + store.
