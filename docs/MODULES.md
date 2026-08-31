# Modules

Three entry HTML files share `Store` + `FileStore` and a common JSON tenant. Invoices, Design, and Finance are native hub apps; this map is the live-behavior source.

---

## A. Invoice Pro — `balance-bites-invoice-pro.html`

Hub card: **Invoices** — **ported** to native React. Do not wrap this HTML again. Map and rules: [INVOICES.md](INVOICES.md). Journal: [JOURNAL.md](JOURNAL.md).

| Module | Role |
|---|---|
| 1a FileStore | Connect Desktop `saved data`; read/write JSON |
| 1b Store | localStorage + file mirror |
| 2 State | Open invoice editor (`C`, `S`, line items) |
| 2b Color presets | Shared themes with the other apps |
| 3 Helpers | Dates, money, ids |
| 4 Customers | Customer records |
| 4b Categories | Product categories (reads catalog) |
| 5 Products | Catalog / price list (mostly reads Stock Costs writes) |
| 5a Price list print | Printable price lists |
| 5a2 Customer list print | Printable customer list |
| 5b Pending invoices | Drafts sent from finance prep → become real invoices |
| 5c Bundles | Saved item bundles on an invoice |
| 6 Invoice manager | `bb_invoices` list, create, totals |
| Returns (read) | Shows returns written by Stock Costs |
| 7 Theme engine | Applies gold/charcoal (or preset) to the document |
| 8 Pattern canvas | Background ornament |
| 9 Item renderer | Line rows, packs, weights |
| 10 Totals | Subtotal, discount, grand total |
| 11 Sync and save | Persist invoice + editor snapshot `bb_inv2` |
| 12 Editor / pickers | Accordion, customer pick, product pick |
| 13 Presets | Backward-compatible invoice look presets |
| 13a Reports | Invoice-side reports |
| 13b Folder connection | UI to bind `saved data` |
| 14 Init | Load folder, restore `bb_inv2`, paint |

**Do not** add `bb_invoices` to Stock Costs `WRITE_KEYS` except the explicit prep-approve path.

---

## B. Label Designer — `balance-bites-sticker.html` + JS

Hub card: **Design** — **ported** to native React (filtered tools). Do not wrap this HTML. Map: [DESIGN.md](DESIGN.md).

| File | Role in live HTML | Hub |
|---|---|---|
| `balance-bites-sticker.html` | Shell, left panel, artboard, FileStore | Native Library + Studio + Print house ([DESIGN.md](DESIGN.md)) |
| `bb-prepress.js` | Print-house export (bleed, crop, color) | Constants + SVG + Cut / Exact / Bleed PNG (`png-pack.ts`) |
| `bb-composite-label.js` | Composite label layout | Wave A die-cut + Wave B PNG clip from `unionPath` |
| `bb-icon-library.js` | Icon stamps on labels | Studio **Icons** tab (repo catalog + live A–Z letters). Not dumped into Firestore |
| `bb-jelly-kids.js` | Jelly Kids preset behavior | Gap — do not dump into Firestore |
| `assets/presets/` | Art preset payloads (repo, not tenant) | Preview via `hub/public/design-presets/`. Do not dump folders into Firestore |

Designer **writes** `bb_label_templates` and clears `bb_label_open`. Stock Costs **links** a sticker SKU to a template and can deep-link via `bb_label_open`. Design **reads** `bb_products` / `bb_stickers`. Hub Design does **not** write `bb_color_presets` (Invoices → Look).

---

## C. Stock & Costs — `bb-stock-costs.html`

Hub card: **Finance & Inventory** — **ported** to native React (eight grouped tools). Do not wrap this HTML. Map: [FINANCE.md](FINANCE.md).

| Module | Role |
|---|---|
| 1 FileStore | Shared folder; write inventory keys; read invoices/customers |
| 2 Store | localStorage + folder mirror |
| 2a Backups | Named restore points → `bb_backups/` |
| 2b Color presets | Same as Invoice Pro |
| 4 Inventory managers | Materials, packaging, stickers (`currentStock` is a cache) |
| 5 Recipe manager | BOM, COGS per batch, prep aggregate |
| 6 Purchases | Buy-ins; ledger source of qty |
| 7 Production | Production runs (usage fallback if no invoices) |
| 8 Payments | Paid/pending flags on invoices |
| 8b Pending invoices | Prep drafts (`invoice_draft`) and production queue |
| 8c Investors | Capital, shares, timeline |
| 9 Returns | Returns / hawalek |
| 9a Return calculator | Build a return from invoices or loose items |
| 9b Customer ledger | Per-customer billed / paid / remaining |
| 9b Op costs | Rent, wages, etc. |
| 9c Invoice analytics | Sales, COGS from invoices, product summary |
| 10 Invoice cards | Finance view of invoices |
| 10b Invoice print | Reuses Invoice Pro page template |
| 11 Dashboard | Project cost, sales, stock, **shutdown two scenarios** |
| 12 Stock value | Ledger qty × cost + finished goods |
| 12 Item modal | Add/edit material, pack, sticker |
| 13 Recipe modal | Edit BOM |
| 13 Profit | P&amp;L (sales − COGS − opex − hawalek) + shutdown card |
| 14 Purchase actions | Log / edit buy; prep **شراء** opens this with shortfall qty |
| 15 Folder connection | Bind `saved data` |
| 16 Op-cost modal | Add operating cost |

Prep (🥣 التحضير) is a **view** on recipes + pending invoices, not a separate file. Catalog, product BOM cards, and production approval live in this HTML.

### Shutdown (dashboard)

Two possibilities, pending always collected:

1. **Stock as cash:** liquid = paid + pending + stock value; P&amp;L = liquid − spend  
2. **Stock as loss:** liquid = paid + pending; P&amp;L = liquid − spend  

Stock value is **cost**, not retail.

---

## Shared concepts

**FileStore** — Chrome/Edge directory picker; IndexedDB remembers the handle.

**Store.set** — Always localStorage; folder write is async and can fail silently today. CloudStore must surface write errors.

**Color presets** — One list; switching theme in any app should follow the user after cloud sync.

**Prep → invoice** — Finance builds per-customer drafts; approve writes `bb_invoices` for Invoice Pro.

**Prep → production** — Different from invoice drafts (`kind` flag). Do not mix approve buttons.

---

## D. Weekly church status — hub `/status`

Not in the Desktop HTML. Native Report tool matching `BalanceBytes_Weekly_Church_Status_Report.xlsx`. Map: [STATUS.md](STATUS.md). Writes `bb_church_status` only.

---

## What not to delete

Protected live tools: the three HTML files, sticker JS listed above, `assets/presets` art, print pack. Analysis-only: `report.md` (finance review, not runtime).
