# Build journal

Dated notes for later chats. Live behavior still lives in `costs/` HTML. This file is **what we already shipped in the hub**, not a redesign spec.

Production: https://balance-bites-ops.vercel.app  
Repo: https://github.com/Jovo-Jovi/balance-bites-ops  
Firebase: project `balance-bites-ops`, Firestore `(default)` `europe-west3`, Spark (no Storage).  
Binaries: Cloudflare R2 (`label_assets/` imported 2026-08-21; invoice JSON still local until asked).

Related maps:

| File | Use |
|---|---|
| [INVOICES.md](INVOICES.md) | Invoice app file map, keys, UX decisions |
| [DESIGN.md](DESIGN.md) | Design app file map, filtered tools, gaps |
| [PARITY.md](PARITY.md) | Tick-list vs live HTML |
| [DATA.md](DATA.md) | Who writes which `bb_*` key |
| [MODULES.md](MODULES.md) | Live HTML module map (source of truth for remaining Design gaps / Finance) |
| [BRAND-UI.md](BRAND-UI.md) | Linen desk, diamond mark, RTL |
| `.cursor/rules/` | Workflow, responsive chrome, no duplicate modules |

---

## 2026-08-20 — Hub scaffold

Branch: `main` (`e6beb37`, `bc4a45d`).

- Next.js App Router in `hub/` (Vercel Root Directory `hub`).
- Firebase Auth + CloudStore (`tenants/balance-bites/keys/{key}`).
- Hydrate prefers Firestore; empty localStorage cannot wipe cloud.
- Login, three hub cards only, workspace shells for invoices / design / finance.
- Locked staff-only Firestore rules. Clients cannot create `staff/{uid}`.
- Do **not** seed empty catalogs, default products, or HTML color dumps when a cloud key is missing.

---

## 2026-08-20 / 21 — Invoices native app

Merged PR **#1** `feat/invoices` → `main` (`66937a8`).  
Merged PR **#2** `fix/invoices-ux` → `main` (`ecc0534`).

Native React workspace under `hub/src/components/invoices/` — **not** an HTML wrap. Design and Finance stay shells until their own branches.

### Commits (oldest → newest)

| Hash | What |
|---|---|
| `40773d2` | Rebuild invoices as a native hub workspace |
| `70fb3f2` | Print look choice; saved-data catalogs stay read-only |
| `36d3fcd` | Redirect throwaway Vercel hosts for Google login (later dropped) |
| `f3e9fe7` | Drop host redirect; print with saved green `bb_inv2` look |
| `7e7b8ee` | Live invoice preview on Look while colors / print look change |
| `02d5986` | Invoice Pro print texture, BB header, page size |
| `45be123` | Cloudflare R2 for label art + backups (not Firebase Storage) |
| `5d7ef07` | Load invoices from العملاء; shrink print to one page |
| `c99c5fe` | Opaque customer windows; paid vs pending color |
| `3267186` | Center invoice preview; drop COOP header |
| `ea4835e` | Stop toasting our own look saves as another-tab updates |
| `03ceaaa` | Keep save-error toasts when a cloud write is rejected |
| `2462660` | Hover lift on actions; customer cards tinted by unpaid invoices |
| `0af7371` | Glass / ghost tabs keep dark text on hover; drop header pattern |
| `30c3f65` | BB lockup diamond march animation |
| `52b938a` | Viewport dialogs, jump to فاتورة on load, history pay filter, card print, chosen print look |

### Shipped invoice tools

فاتورة · العملاء · الكتالوج (read-only) · الانتظار · السجل · التقارير · المظهر

Pending queue **skips** `kind: 'invoice_draft'` (finance prep). Catalog / returns writes stay finance-owned (`writeInvoiceKey`).

### UX that must not regress

- Dialogs **portal to `document.body`**. `.bb-glass` `backdrop-filter` traps `position: fixed` inside the panel, so customer windows sat at the bottom of a long list.
- Loading a saved invoice switches to `?tab=editor` and scrolls to top (`useWorkspaceTab`). Do not use `window.confirm` on that path (easy to miss on mobile).
- السجل filters: الكل / معلقة / مدفوعة. Cards have **طباعة** (saved look, no picker) and **تحميل**.
- Print look: empty / unknown `bb_inv_print_preset_id` → `__inv2__` (or active color preset if it still exists). Always show a selected value in the dropdown.
- Hub chrome stays linen. Print may use Invoice Pro `bb_inv2`, a stored preset, or hub linen (`__hub__`).
- Customer cards: amber if unpaid invoices, green if none pending.

### Cloud / print extras added as Firestore keys

`bb_inv_print_preset_id`, `bb_inv_print_page_size`, `bb_inv_print_margins`, `bb_print_fit_one` (plus prep keys listed in DATA.md).

Vercel preview toolbar / COOP noise: project `enablePreviewFeedback: false` and `VERCEL_PREVIEW_FEEDBACK_ENABLED=0`.

---

## 2026-08-21 — Design native app (this branch)

Branch: `feat/design`.

Native React workspace under `hub/src/components/design/` — **not** a copy of `balance-bites-sticker.html` and **not** an iframe. Live keys and template JSON round-trip; chrome is three tools instead of the old left-panel dump.

### Tools

Library · Atelier · Print house

Dropped as their own tabs (same result, less duplication): New wizard, Product, Theme, Libraries, Product link. New + product pick live in Library/Atelier. Shared color presets stay on Invoices → Look. `bb_label_open` is consumed in the provider (120s) then cleared.

### Writer / dump rules

`writeDesignKey` allows designer keys only. Catalog and `bb_stickers` are read-only. Missing `bb_label_templates` does **not** seed Jelly Kids, flavor packs, or sample labels. Flavor packs stay in `hub/src/lib/design/colors.ts`. Fat `hx*` / composite `data:` go to R2 as `__asset__:` (placeholders if R2 is off).

### Explicit gaps (do not tick as done)

Freeform composite drawing, PNG cut pack, applying `assets/presets/` folders, Desktop `bbLabel-*.json` folder scan.

---

## 2026-08-21 — Atelier art (backgrounds + icon catalog)

On `feat/design`. Background uploads use live `hxBg*` / `hxCProd` keys and clip to the die-cut on every family. Icon picker lives in Atelier (not a fourth tab): repo catalog with category variants, click to stamp. Catalog is code, not a Firestore dump.

Atelier dump fields (ingredients, nutrition, unused brand lines) were removed. Copy is only what that family draws. Layers control z-order and icon color. Composite preview uses the artboard aspect (crackers oval, not a circle). Taper/rect show wrap + lid instead of a rounded square.

---

## 2026-08-21 — Print house cut stroke + live template seed

On `feat/design`. Print house cut stroke is an editable border on the die-cut (`sCutStrokeMm`, `cCutStroke`; default 0.25 mm magenta). Preview, print, and SVG download include it.

Live `bb_label_templates` (exact Desktop JSON) written to Firestore. 73 `label_assets/{templateId}/` files uploaded to R2. Nothing from `saved data` committed to git. Import path: `npm run import:apply -- --keys bb_label_templates --assets --no-backups`. Invoices and other keys were not overwritten.

---

## Still not done (do not tick as shipped)

- Design follow-up: composite drawing / PNG cut / art-preset folders
- Finance tabs and ledger formulas
- One-shot JSON import of the rest of live `saved data` (invoices, stock, …)
