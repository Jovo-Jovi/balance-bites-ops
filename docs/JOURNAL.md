# Build journal

Dated notes for later chats. Live behavior still lives in `costs/` HTML. This file is **what we already shipped in the hub**, not a redesign spec.

Production: https://balance-bites-ops.vercel.app  
Repo: https://github.com/Jovo-Jovi/balance-bites-ops  
Firebase: project `balance-bites-ops`, Firestore `(default)` `europe-west3`, Spark (no Storage).  
Binaries: Cloudflare R2 (`label_assets/` imported 2026-08-21). Desktop `saved data` JSON was imported to Firestore 2026-08-22 (full set) and **2026-08-26** (finance keys only). Zips stay on Desktop, not git.

Related maps:

| File | Use |
|---|---|
| [INVOICES.md](INVOICES.md) | Invoice app file map, keys, UX decisions |
| [DESIGN.md](DESIGN.md) | Design app file map, filtered tools, gaps |
| [FINANCE.md](FINANCE.md) | Finance app file map, eight tools, writers |
| [FINANCE-WAVES.md](FINANCE-WAVES.md) | Finance waves A–E |
| [PARITY.md](PARITY.md) | Tick-list vs live HTML |
| [DATA.md](DATA.md) | Who writes which `bb_*` key |
| [MODULES.md](MODULES.md) | Live HTML module map (Finance source; Design gaps) |
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

## 2026-08-21 / 22 — Design native app (`feat/design`)

Full map: [DESIGN.md](DESIGN.md). Parity ticks: [PARITY.md](PARITY.md). Live HTML stays the formula source (`costs/balance-bites-sticker.html` + composite / prepress / icon JS).

Native React under `hub/src/components/design/` + `hub/src/lib/design/` — **not** a copy of the sticker HTML and **not** an iframe. Production `main` is still invoices-only until this branch merges.

### Tools

Library · Atelier · Print house

Dropped as their own workspace tabs (same result, less duplication): New wizard, Product, Theme, Libraries, Product link. New + product pick live in Library / Atelier. Shared color presets stay on Invoices → Look. `bb_label_open` is consumed in the provider (120s) then cleared.

Atelier inspector (not a fourth hub tool): face-aware **Copy** · **Nutrition** · **Layout** · **Type** · **Size** · **Color** · **Images** · **Icons** · **Layers**. Canvas is first; inspector is the side column.

### Writer / dump / assets

`writeDesignKey` allows designer keys only. Hub Design writes `bb_label_templates` and clears `bb_label_open`. Catalog and `bb_stickers` are read-only. This slice does **not** write `bb_color_presets`. Missing `bb_label_templates` does **not** seed Jelly Kids, flavor packs, or sample labels. Flavor packs stay in `hub/src/lib/design/colors.ts`.

Fat `hx*` / composite `data:` go to Cloudflare R2 as `__asset__:`. Images → Storage reuses `__r2__:` so save does not copy the same PNG twice. `artref:` / `assets/presets/…` resolve from `hub/public/design-presets/` (git, not Firestore). Spark — no Firebase Storage.

### Preview (why composites matched Desktop and others did not)

Composite families paint `state._composite` (parts, zones, `unionPath`) — that already looked like saved JSON.

Non-composite families now use the **live face**, not a 4-line silhouette:

| Family | What Atelier draws |
|---|---|
| Circular / outline (`circular`, `rounded_sq`, …) | Front sticker in pixel `cW`×`cH`: `buildCircleLabel`. Clip from `cShape`. |
| Rect + top | Back wrap `buildLabel` + `getSectionHTML`, or top lid `buildTopLabel`. Size `sW`×`sH` or `tSz` |
| Taper + top | Cup fan `buildTaperedLabel` (pixel viewBox, rotate around apex) or top lid. Artboard = padded SVG `vbW`×`vbH`, not the print bbox |

Rect / taper switch **Back wrap** / **Taper wrap** / **Top lid**. Circular families stay on the front face even if saved `labelMode` was `back`.

### Canvas

Tap to select. Drag to move. Round handle + Layers slider to rotate (−180°…180°). Corner to resize. Print cut is listed and can show the overlay; it is not draggable. Opening a template paints immediately, then hydrates R2 only if that id is still wanted (no leftover cheese photo).

### Print house

1.5 mm bleed, 300 DPI. Editable cut stroke `sCutStrokeMm` / `cCutStroke` (default 0.25 mm magenta) on preview, print, and SVG download. Same fields on Layers → Print cut. Cut / Exact / Bleed PNG for the open label (Wave B). Popcorn-blue / popcorn-red stay in Library; they are excluded from the commercial print pack (warn, still download).

### Cloud seed (do not repeat unless asked)

2026-08-21: Firestore `tenants/balance-bites/keys/bb_label_templates` from Desktop JSON (~32 templates). 73 files on R2 `label_assets/{templateId}/`. Nothing from `saved data` in git.

2026-08-22: Desktop `saved data` JSON keys were written to Firestore after a private zip (`C:\Users\Marco\Desktop\bb-saved-data-2026-08-22.zip`). npm stole `--keys`, so the run was the full JSON set (invoices plus catalog/stock/design keys from that folder), not invoices-only. The script now requires `--only=` or `--all`. R2 `label_assets/` were not re-uploaded.

### Commits on `feat/design` (oldest → newest, before this docs push)

| Hash | What |
|---|---|
| `9c53c4a` | Native Design workspace (library / atelier / print house) |
| `9defde0` | Atelier background uploads + categorized icon catalog |
| `a77b251` | Print house cut stroke as an editable die-cut border |
| `4e775ec` | Keep the opened template; Atelier layers drag |
| `d7119a7` | Compact Library thumbs; Images / letter fonts / popcorn cut |

Later commits on this branch add Images Storage reuse, Loaded flavor pack, Print-cut layer, live family faces, and rotate.

### UX that must not regress

- Claimed template id wins over a stale `?id=` so Atelier does not snap back.
- Delete guard: do not wipe a multi-template library if removing one id would empty the array.
- Hub chrome stays linen. Flavor **Loaded** is the open template; listed packs highlight only after apply.
- Icon picker tiles use hub linen / gold, not `cLabel`.
- Character art: fill + path stroke, clip `unionPath`. Repo preset SVGs had full-canvas white fills stripped.
- Empty `productId` matches `bb_products` by name (popcorn-yellow → فشار بالكراميل). Saving writes that link.

### Explicit gaps (do not tick as done)

Freeform composite drawing, PNG cut pack, applying `assets/presets/` folders into tenant templates, Desktop `bbLabel-*.json` folder scan, Jelly Kids dump, auto-seed when Firestore is empty.

---

## 2026-08-21 — Atelier art (backgrounds + icon catalog)

Background uploads use live `hxBg*` / `hxCProd` keys. Icon picker lives in Atelier (not a fourth tab): repo catalog, click to stamp. Catalog is code, not a Firestore dump. Copy is only what that family / face draws.

---

## 2026-08-21 — Print house cut stroke + live template seed

Cut stroke is an editable border on the die-cut. Live templates + R2 assets seeded (see Cloud seed above).

---

## 2026-08-22 — Open, layers, popcorn, Library, Images, letters

Opening a Library card no longer snaps back. Character stickers resolve `artref:` from `public/design-presets/`. Library cards are a compact 4-column grid (lazy character art; lite thumbs for other families). Images tab matches live Typography → Background images plus composite `addProductPhotos`. A–Z letters use live `LETTER_STYLES`.

---

## 2026-08-22 — Loaded pack, cut layer, R2 reuse, family preview, rotate

Template paints immediately, then R2 hydrates in place. Images slots can pick Device or existing Storage (`__r2__:`). Flavor pack **Loaded** chip. Layers include **Print cut**. Non-composite families use live circle / wrap / taper formulas. Selected layers rotate as well as move and resize.

---

## 2026-08-22 — Invoice JSON import + Storage picker previews

Private zip of Desktop `saved data` on the Desktop (not git). Firestore `tenants/balance-bites/keys/*` refreshed from that folder. Images → **Choose from storage** is a linen tile grid with signed R2 thumbs (PNG/JPEG plus `.txt` data URLs). Hydrate of `__r2__:` image files uses the signed URL instead of `res.text()`.

---

## 2026-08-22 — Family pixel preview + face inspector

Taper (and the other families) were remapped into `viewBox="0 0 100 100"` with `preserveAspectRatio="none"`, then stretched to the print bbox — the fan squashed and section text sat wrong. Family SVGs now keep live pixel viewBoxes (`xMidYMid meet`). Taper artboard is the padded SVG (`vbW`×`vbH`), same as live `wrapTapered`. Wrap/taper section bodies follow live `getSectionHTML` (hub field names). Circle / outlines / top lid use live px boxes. Atelier is canvas-first with a face-aware inspector (Copy / Nutrition / Layout / Type / Size / Color). `tpCupH` and `tpOffsetBot` are on Size. Flavor packs still tint the sticker only.

---

## 2026-08-22 — Print cm, wrap colors, in-place edit

Print preview and Save as PDF were scaling onto A4 (`@page size: auto` + 10 mm margin) and dropping CSS backgrounds in `foreignObject`. Print / SVG now use the artboard in centimetres, `print-color-adjust: exact`, and the same Google fonts as Atelier. Logo discs are SVG, not HTML `background`. Downloaded files are `{Name}_{w}x{h}cm.svg` (print PDF title matches). Rectangular wrap SVG had `width="100%"` so viewers stretched it — physical cm + SVG fill. Taper/wrap QR and weight are their own hit-boxes; selecting a text section opens an in-place field.

---

## 2026-08-22 — Design Studio plan (not built)

Proposed follow-up, waiting for confirm: [DESIGN-STUDIO.md](DESIGN-STUDIO.md). Atelier would become a label **studio** (Canva-shaped libraries rail, live composite join/trim/cut/merge, Isolated PNG cut packs, user-named sections). Not a Canva/Polotno clone. Not implemented in this note.

---

## 2026-08-22 — Studio Wave A (composite die-cut)

Confirmed waves A→D; chrome label **Studio** (`?tab=atelier`). Wave A only: live `BBComposite` add-shape, shift multi-select, merge, group/ungroup, trim (group clip), preview/approve cut, cut = selected, undo. Raster union/intersect ported in `boolean-cut.ts` — not Paper.js. Wrap/taper starters kept.

Layers Up / Down now restack composite shapes, logo, and text in one z-order (live `getInteractList`). The preview used to paint every shape first and every logo after, so sending a logo behind a die did nothing on the sticker.

---

## 2026-08-22 — Studio Wave B (PNG cut pack)

Print house: **Cut PNG**, **Exact PNG**, **Bleed PNG** for the open label (not a zip). Studio has **Cut PNG**. Same print SVG at 300 DPI; die clip is `unionPath` (composite), wrap rectangle, taper fan, or circle outline; PNG pHYs from live Isolated Output; bleed is live `extendBleedNN` (1.5 mm, 0.5 mm sample inset). Family wrap/taper/circle HTML in `foreignObject` is painted after SVG raster (Chrome drops FO when SVG is used as an image). Bytes download in the browser — not R2. Print-pack exclude warns, does not refuse.

Do not start Wave C (libraries rail) until this is tested.

---

## 2026-08-22 — Print match, split logo/brand, full delete, PNG fonts

Studio gold boxes and print SVG now use the same placements: top lid at 32/58/78%, circle photo/weight/dates at overlay %, wrap last column fills leftover width, wrap text is one full-sticker `foreignObject` so columns are not clipped. Wrap/taper **Logo** (disc) and **Brand** (names) are separate hit-boxes. Delete removes `bb_label_templates` plus R2 `label_assets/{id}/` (Finance SKUs are not rewritten). PNG pack inlines Google Fonts CSS and sets `skipFonts` so `html-to-image` does not read cross-origin `cssRules`.

---

## 2026-08-22 — Print logo pin, outer cut stroke, PNG taint

Wrap / top-lid print used `left:50%` + `translate(-50%)` inside SVG `foreignObject` on a hub page that is `dir="rtl"`, so the disc sat a half-width to the right of the Studio gold box. Paint now uses pixel `left`/`top` and `direction:ltr` on FO roots. Cut stroke was a centred SVG stroke clipped to the artboard, so raising mm ate the label; it is now a 2× under-stroke with the fill covering the inner half (visible band outside). Cut PNG stays — it is the transparent die file. PNG export strips leftover `https:` hrefs and skips a tainted html-to-image overlay so Bleed `getImageData` does not toast.

---

## 2026-08-24 — Library thumbs, clip zoom, lid flex, icons on every family

Library cards were rendering full family SVGs (foreignObject + fonts) for every tile, which made load and scroll feel heavy. Cards now paint a cheap die silhouette and only when on screen. Hub functions prefer Frankfurt (`fra1`) next to Firestore `europe-west3`. R2 stays `R2_JURISDICTION=default` (not EU) — moving the bucket is a Cloudflare change, not a code flip. Wrap/taper zoom no longer scales the clip with the photo. Top lid print matches live flex-center (same for rect and taper lids). Icons tab is on every face; non-composite stamps paint in the family SVG.

---

## 2026-08-24 — Library lite thumbs, R2 sign, wrap QR, lid pin

Silhouette Library cards were fast but empty. Cards now paint a **lite** family SVG (type + layout, no R2 photos), only when on screen, cached, with the artboard aspect ratio. `/api/storage/list` returns keys/sizes only; thumbs sign on view. Opening a template batch-signs and hydrates R2 in parallel (not one key at a time). Wrap/taper QR and weight are pinned at the Studio 70%/90% rest points with explicit pixel size (FO `height:100%` was painting the PNG at intrinsic size and drifting). Top lid paint uses the same rest points as the gold boxes, HTML disc (not nested SVG in flex), LTR pin — same problem as the zoomed QR.

---

## 2026-08-24 — Library popcorn, wrap layers, wrap print logo

Library lite thumbs now include repo `/design-presets/` art (popcorn and the other character SVGs) and keep the card aspect, so icons are not stretched. Black rims on those silhouettes are Print cut, not a second black part stroke; Layers has a decorative border on each layer. Wrap / taper Up / Down reorder `eSecOrd` columns. Wrap print logo uses the same HTML disc as the lid (nested SVG in FO was vanishing). Top lid paint was not changed.

Wrap print side columns were clipped by FO/`overflow:hidden` plus an inward column shadow. Borders now grow **outside** each layer (Dates / QR / Weight separately). Wrap HTML is not clipped to the die, so the outer columns can finish painting.

Design scrolling was heavy because Library injected live wrap SVGs (foreignObject) into every glass card, and the Design shell used backdrop-filter. Cards are now `<img>` thumbs on a solid sheet.

Library character cards (popcorn-yellow included) use the repo preset image — a data-URL SVG cannot load nested `/design-presets/` art, so yellow-on-white silhouettes vanished. Wrap/circle thumbs follow the artboard shape. Rect Nutrition no longer double-scales and clips; it shrinks to the column. Layers has a size slider on each component.

---

## 2026-08-24 — Library scroll, remaining families, Size in place

Loading full popcorn / china / jelly preset SVGs as Library `<img>` src made the grid too heavy, so wrap / taper / circle cards below the first row never painted. Cards are cheap `pathLocal` / artboard silhouettes again (yellow popcorn uses `#FECE00` when the saved fill is white). Composite Studio stretches 0–100 onto the artboard rectangle like live, so Layers Size on popcorn (and other non-square dies) grows about the center instead of sliding. Character art in the part box uses `preserveAspectRatio="none"` (live `object-fit:fill`). Rect wrap Nutrition was left as the fitted column (print preview already correct).

---

## 2026-08-25 — Raster Library snaps, cut follows Size, Layers stays open

Library cards are no longer SVG silhouettes. Save / New / Duplicate / Save as new rasterize a small WebP (PNG fallback) of that one sticker, upload `label_assets/{id}/library_thumb.webp`, and store `libraryThumb` on the template. Studio still paints the full live SVG. Existing templates without a snap generate a blob URL when the card is on screen; the next Save writes R2. No `/design-presets` files and no `data:image/svg+xml` in the grid.

Popcorn (and other composites) Size / resize now scales `unionPath` about the part centre so Print cut matches the art. `syncCutPath` also rebuilds when the saved JSON has a union but empty `cutSourceIds`.

Rect wrap inspector no longer jumps to Nutrition and traps Layers: auto-focus only runs from Copy/Nutrition, and the effect depends on the selected layer id, not a new `focus` object every render. Layout / Type / Size / Color / Images / Icons / Layers stay until the designer clicks another inspector tab.

---

## 2026-08-25 — Popcorn Size halo, cheap Library, no cheese on characters

Sizing popcorn scaled a raster-traced `unionPath`, so clip/cut sat outside the character (outer ring). Sole silhouettes now clip and cut from `pathLocal` in the part box; Size pointer-up still runs `syncCutPath`.

Library first-open was rasterizing every on-screen card (html-to-image + multi-MB presets). Cards without a saved `libraryThumb` now paint a cheap Path2D die. Full snaps still write on Save / New / Duplicate / Save as new.

`hxCProd` was painting on composite character stickers (pretzel, china crackers). Character art (`showImage` + `artref:` / `artKey`) skips that overlay and does not hydrate the leftover cheese file.

---

## 2026-08-25 — Popcorn cut hug + Save/Delete wait bar

Preset character SVGs (popcorn especially) use `viewBox="0 0 100 100"` inside a tall `width`×`height`, so default meet letterboxes the kernels. Stretching that canvas with `preserveAspectRatio="none"` left empty bands inside the part while Print cut followed `pathLocal` (full silhouette). Character art now uses `xMidYMid slice` so the kernels fill the die. Cut PNG uses the same `compositeDiePath` as Studio (sole `pathLocal`, not a stale halo `unionPath`).

Save rasterizes a Library snap then writes Firestore + R2; Delete writes then clears the art folder — both felt frozen. Design shows a gold indeterminate bar and a short status (`Saving…` / `Deleting…` / `Preparing library snap…`) over the workspace, including over the delete dialog.

---

## 2026-08-25 — Family Library snaps match Studio

Composite Save already rasterized SVG art (popcorn). Wrap / taper / circle / lid put copy in `foreignObject`, which `<img>` SVG cannot paint, and html-to-image saw those nodes as 0×0 — Library stored only the die colour (white / yellow / brown / orange). Save now clones FO XHTML into a real HTML box before snapshot, rasterizes at 720 px, then stores the 256 px WebP. Re-save each family card once.

FO overlay used `getScreenCTM` (often null in an iframe) so wrap/circle/taper still saved as a colour die. Copy is now snapshotted in an LTR HTML frame and mapped by SVG `getCTM` / viewBox; full-bleed faces stretch onto the canvas. Each Save writes a new `library_thumb_{stamp}.webp` so the old colour file is not reused from cache.

---

## 2026-08-25 — Taper sector copy + popcorn kernels on snaps

Circular and rect wrap snaps already showed copy (full-bleed FO stretch). Taper sectors still saved colour + photo only: off-screen `getCTM` looked valid while the iframe had no layout, so sector text was mapped off-canvas. Overlay now uses viewBox scale plus ancestor `rotate(mid, cx, cy)` only (no `clientWidth`). The snapshot iframe sits at `left:-width` instead of `translateX(-100vw)`.

Popcorn (and other character stickers) saved a white card with only the exp plate: parent SVG-as-`<img>` does not paint nested `/design-presets/*.svg` images. Save/print now flatten those hrefs to a PNG data URL (direct `Image` load, cap 1024 px) before rasterizing the parent. Re-save taper and popcorn once (new `library_thumb_{stamp}` file).

---

## 2026-08-25 — `feat/design` merged; Wave C libraries rail

PR **#4** merged `feat/design` → `main` (`e4471fa`). Production Design is Waves A–B plus Library snaps.

**Wave C** (built on `feat/design-c`, **confirmed**, on `main` via PR #5): Studio left rail Shapes / Blocks / Icons / Uploads / Brand / Characters. Inspector Images / Icons tabs folded into the rail. Composite `addZone` (text, logo disc, expiry, photo). Wrap taps turn on existing `chkS*` recipes (Custom column stays a starter). **Remove** turns wrap recipes off and deletes composite text/logo/exp/photo layers (rail, Layers, canvas ×, Delete). Characters are a DiceBear people catalog (Open Peeps / Adventurer / Lorelei / Notionists) — not popcorn / pretzels / china crackers. PNG is fetched via `/api/design/character` (staff) and inlined; Save still strips to R2. Flavor packs under Brand. Merge / Trim / Cut stay on the composite bar.

---

## 2026-08-25 — Wave D blank die + named sections

PR **#5** merged `feat/design-c` → `main` (`f0be93a`). New template is a blank die unless Library **Include starter recipes** is on. Wrap/taper start with all `chkS*` off. Composite starts with a circle part and no default logo/brand/flavor zones. **Named section** stores `{ title, fields[], widthPct }` on `state._blocks` and appends the id to `eSecOrd`. Paint, Layers, Copy (title / EN / AR / width), rail Remove, canvas ×, Delete. Recipes stay Ingredients / Nutrition / Dates+QR+weight / Logo / Tips. Legacy Custom column still opens. Composite named section is a text zone. No new Firestore key. Saved wrap JSON without `_blocks` is unchanged. Wrap characters stay off the lid; Layers Border paints a ring on character PNGs.

---

## 2026-08-25 — Design closeout

Design Waves A–D are on `main`. Feature branches `feat/design` and `feat/design-c` deleted. Next slice is Finance (`docs/MODULES.md` §C, `costs/bb-stock-costs.html`). Do not start Finance until asked. Design stays the only `bb_label_templates` writer.

---

## 2026-08-25 — Finance native app (`feat/finance`)

Waves A–E on `feat/finance` (not merged). Native eight tools under `hub/src/components/finance/` — **not** an HTML wrap. Same linen chrome and Invoices UI kit (portal Modal, ActionBtn). `writeFinanceKey` rejects `bb_label_templates` and color presets. Prep approve is the only `bb_invoices` write. Ledger, purchases, prep/production, returns, opex, dashboard shutdown pair, COGS, P&L, investors, R2 backups. Map: [FINANCE.md](FINANCE.md).

UX polish vs live Stock Costs: purchases as a compact filtered table; stock report in accordion sections (summary / all SKUs / FG / materials / packaging); invoice cards with live fields + customer account modal + confirm on دفعة / سدّد الكل + multi-select print; investor peak / toward / join-date profit instead of splitting NAV equally.

**Wave F1 (overview + period P&L):** اللوحة mix bars (spent / sales / stock) and formula hover on StatCard + shutdown columns; تنبيهات المخزون moved to المخزون → دفتر الكميات; الأرباح from/to window (invoices by invoice date, opex/hawalek/purchases by their date) + monthly CSS bars + print; unmatched-recipe hint on Overview / Recipes (same `findRecipeForItem` matcher). Invoices catalog hub copy is pick / print prices only. Follow-up: tap profit/COGS cards for a number brief; CSS column charts on اللوحة/الأرباح; per-section invoice print selection; confirm on payment delete and stock qty edits; larger BOM card numbers.

**Wave F2 (live leftovers):** المخزون filters ok / low / crit and usage (active / unused / shared / inactive) on materials, packaging, and stickers. الملصقات are compact swatch cards (template colors); tap or استوديو writes `bb_label_open` and opens Design Studio. كشف عميل has «تراجع عن آخر دفعة» (newest by date then id) while per-row حذف stays. المستثمرون «نسخ عجز السيولة» copies `cashHole` into `investorTarget.needed` when cash is negative.

---

## 2026-08-26 — Wave F3 (prep print + Look readout)

On `feat/finance`. التحضير prints the current calculator board (`bb_prep_print_mode`: both / total / each) and invoice-draft sheet + aggregated BOM (`findRecipeForItem`, full qty). Draft «طباعة» previews with Invoices Look keys (does not approve). Finance الفواتير shows the current Look name, page size, and margins as read-only — no Theme tab, no writes to `bb_inv_print_*`.

Print uses an in-app overlay with **إغلاق** so mobile can leave the preview after the system print sheet. Production lists can **حذف** unsent and awaiting prep orders (live ✕).

---

## 2026-08-26 — Wave F4 (working-capital diary + leftover prep)

On `feat/finance`. نظرة عامة → المستثمرون uses the live working-capital event diary for peak / still-out / تعيين: invoice adj COGS out, paid collections in after `collectionLag` (default 30), leftover stock placed on the live journal window (15 Jul–14 Aug 2026) or today, hawalek and opex. Pending invoices never become تحصيل. Compact weekly CSS bars + a collapsible event list (not a dump of live rewind filters). Spent−sales stays as a tap-brief estimate.

Prep leftovers that were real workflow gaps: **حفظ طلب** (pending, clears the board), **تحميل للتحضير** on unsent/awaiting orders, **اعتماد الكل** on invoice drafts, production **مباع / مُنتَج / ينقص** + **تجهيز الناقص**. Skipped on purpose: COGS/stock-value print, on-screen `bb_prep_ing_view`, `splitSharedStickersToProducts`, Finance writing Look keys.

Kitchen polish: التحضير board sits under the add row (save/send/print, then BOM, unsent list, drafts). Send-to-production uses the same stock confirm and clears the board as save. Production demand table defaults to ينقص with a الكل chip. Investor diary layout left dense on purpose.

---

## 2026-08-26 — Finance JSON import (live Firestore)

Private zip: `C:\Users\Marco\Desktop\bb-saved-data-2026-08-26.zip`. Wrote 16 finance keys from Desktop `saved data` (mostly 25 Aug) into `tenants/balance-bites/keys/`: `bb_materials`, `bb_packages`, `bb_stickers`, `bb_recipes`, `bb_purchases`, `bb_production`, `bb_products`, `bb_categories`, `bb_returns`, `bb_operation_costs`, `bb_investors`, `bb_investor_target`, `bb_customer_payments`, `bb_invoice_payments`, `bb_pending_invoices`, `bb_backup_index`.

**Not written:** Design (`bb_label_templates`, `bb_label_open`, `bbLabel-*`, R2 `label_assets/`), Look / theme (`bb_color_presets`, `bb_active_color_preset_id`, `bb_active_theme`), invoices (`bb_invoices`, `bb_inv2`, `bb_customers`, `bb_invoice_bundles`, `bb_inv_print_*`). No `--assets`. Prep UI keys have no Desktop files (live drafts left as-is).

---

## 2026-08-26 — Local zip backup (hub)

Staff can download live Firestore keys **and** R2 `label_assets/` as `bb-saved-data-YYYY-MM-DD.zip` (`{key}.json` plus `label_assets/{templateId}/…`). Button on the hub home footer, every workspace footer, and Finance → التشغيل → نسخ احتياطية. Existing cloud docs only — no empty dumps. Named R2 backups in ops are unchanged.

---

## 2026-08-27 — Restore original design-preset SVGs (T12 quality rollback)

Studio and Print house both load `/design-presets/*.svg` again (original polygon traces: jelly-fruit 22,443 paths). The T12 spline re-trace and 512px WebP preview folder are gone — quality in Studio and print was the requirement.

---

## 2026-08-27 — T14 bb_invoices sharding (deferred)

Not this round. `bb_invoices` remains one document (~730 typical 6-line Arabic invoices before the 1 MiB ceiling). `formatWriteError` already shows the failure. When it is time: year keys `bb_invoices_2026`, extend `isKnownKey`, migrate `enrichInvoice` plus `invoices/reports.ts` and `finance/analytics.ts`. After T7 only — sharding multiplies CAS documents; doing it without `prevWriteId` multiplies the clobber. Quotas are not the reason (~68 hydrate/watch reads per sign-in).

---

## 2026-08-27 — Finance save wait overlay

Stock qty (product + materials), product save, and production-run persist show Design’s indeterminate bar with Arabic copy (`جاري الحفظ…` / `قد يستغرق ثوانٍ.`) until Firestore accepts and the toast appears. Toasts sit above the overlay (`z-[100]`).

---

## 2026-08-27 — Classify permission-denied with a read probe

`formatWriteError` no longer treats a non-empty CAS token as “another device”. On `permission-denied` persist, a `getDoc` probe tells staff/rules vs missing doc vs genuine CAS vs unpublished/stale rules (`القواعد غير منشورة أو قديمة`). `persistDelete` stays a sync formatter. Ignored Finance/Invoices writes use `fireAndForget` so the toast is not followed by `Uncaught (in promise)`.

---

## 2026-08-27 — Drop tautological prep-append guard

`commitPrepInvoice` keeps `satisfies FINANCE_PREP_APPEND_KEYS` (compile-time). The runtime `includes` check and unused `isFinancePrepAppendKey` are gone. `bb_invoices` stays off `FINANCE_WRITE_KEYS`.

---

## 2026-08-27 — Firestore rules tests in CI

CI runs `firebase emulators:exec --only firestore "npm run test:rules"` after `npm ci` (Temurin 17 + `firebase-tools@15`). The seven CAS cases cannot regress with a green build.

---

## 2026-08-27 — T13 cleanup batch

Deleted `public/bb-cloud-store.js` and unauthenticated `/api/firebase-config`. Dropped deprecated `preferredRegion` (Vercel `regions: [fra1]` stays). `--bb-warn` `#9a5a26` for AA on `--bb-panel`. Local zip download passes the existing `Uint8Array` to `Blob` (no second copy). Error boundary shows a fixed Arabic line + `digest`; raw `error.message` only in development. `npm update firebase-admin` stays at 14.3.0; six moderate advisories remain in the `uuid@9` tree under `@google-cloud/storage` (GHSA-w5hq-g745-h8pq). `npm audit fix --force` would install firebase-admin@10.3.0. Zero high/critical; import script only, not the deployed bundle.

---

## 2026-08-27 — T12 design-preset re-trace

Polygon vtracer dumps in `hub/public/design-presets/` (≈18 MB, up to 22k `<path>`s) re-traced spline + speckle 12. Studio / Library on-screen preview loads `/design-presets/preview/*.webp` (512px). Prepress + PNG pack still embed the SVG (`physical: true`). Popcorn-blue / popcorn-red stay print-pack excluded. Same 12 `PRESET_FILES` keys. **Rolled back the same day** — original SVGs restored for Studio and print.

---

## 2026-08-27 — Composite round-square borders

Round sq on a tall artboard (Chicopon 6.3×7) was a percent-square, so the die stretched, corners used `rx = 0.22 × half` (11%) instead of live’s 18% cut polygon, and the die `clip-path` ate the outer half of a centered stroke. Hub now compensates `w%`/`h%` like live `syncEqualAspectPart`, draws fill/stroke from `partFillPathLocal` in the part box, and paints the border outside the clip.

---

## 2026-08-27 — Text-box borders sit outside the fill

Composite text / logo / image Layers Border used a centered SVG stroke inside the die clip, so half the rim covered the fill. Preview now paints an outset stroke (centerline at `bw/2` outside the box) after the clip. Wrap Nutrition’s outward `box-shadow` is on an overflow-visible wrapper. Taper foreignObject wrappers are `overflow:visible` so those rings are not clipped to the fan cell. Studio hit-boxes use outline, not inset `border`.

---

## 2026-08-27 — Text rim hugs type; shape stroke stays on its layer

Unfilled text Layers Border followed the drag frame while type overflowed a 10% cap. Hub now fits type like live `zoneTextFontPx` and rings the glyph block. Part/zone fill is still clipped to the die; each decorative stroke is painted with that item’s z so jelly-blob on jelly-new stays under later icons and “A FRUITY ADVENTURE!”.

---

## 2026-08-27 — Pack art for three new stickers

Dropped original kawaii assets for المقرمشات / سوداني ألوان / شوكولاتة حجر. Studio **Pack art** rail drops trimmed RGBA PNGs (BB lockup, sudani beans, stone chocolate, surprise toys, pizza / chicken / ketchup faces, toy cup, roll toy, pebble) as a named Composite image zone with `artref:` — not a circle plate, not the crude Kids icons. Corner white is knocked out; chicken fill stays. Family must be Composite. Layers shows the pack name (BB lockup, Pizza face, …) instead of truncated `circ…`. Not vtracer dumps, not Firestore. Popcorn stays off the Characters rail. No templates seeded.

---

## Still not done (do not tick as shipped)

- Zip of every commercial character; Jelly Kids Firestore dump
- Merge `feat/finance` → `main` when Waves A–E are confirmed
- **T14** year-shard `bb_invoices` when the 1 MiB document is near (~730 invoices) — after T7 CAS; not Spark quotas
