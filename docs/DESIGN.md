# Design app (hub)

Native React. Live behavior: `costs/balance-bites-sticker.html` plus `bb-composite-label.js` / `bb-prepress.js` / `bb-icon-library.js`.  
Entry: `/design` → `DesignApp` → `DesignProvider`. English chrome. Arabic product names stay as stored.

This is **not** a paste of the sticker HTML and **not** an iframe. Tools are filtered to the work that belongs in this app.

When building **Finance**, reuse hub chrome and CloudStore. Do **not** duplicate this library, studio, print house, or `bb_label_templates` writer. Invoice map: [INVOICES.md](INVOICES.md). Journal: [JOURNAL.md](JOURNAL.md). Parity ticks: [PARITY.md](PARITY.md).

**Studio waves:** [DESIGN-STUDIO.md](DESIGN-STUDIO.md). Waves A–B are on `main` (PR #4). **Wave C confirmed.** **Wave D** (blank die + user-named wrap sections) is in test on `feat/design-c`.

Branch while Wave C is open: `feat/design-c`. Live templates were seeded 2026-08-21 (Desktop `bb_label_templates.json` → Firestore; 73 files on R2). Do **not** re-seed or run `import:apply` unless asked.

## Tabs (`?tab=`)

| id | Label | Component | Notes |
|---|---|---|---|
| `library` | Library | `library-tool.tsx` | Default. List, search, new, import JSON, duplicate, delete |
| `atelier` | Studio | `atelier-tool.tsx` (`StudioTool`) | Canvas first; Composite die-cut bar; face-aware inspector. Keep `?tab=atelier` |
| `print` | Print house | `print-tool.tsx` | Bleed / DPI / editable cut-stroke / SVG / Cut PNG / Exact PNG / Bleed PNG / JSON |

Old ids still resolve: `templates` → library, `prepress` → print, `libraries` / `link` → atelier.

Deep link: `bb_label_open` (ts within 120s, then **removed**) or `?template=` / `?id=`. Sticker `templateKey` is used when the payload has a sticker id but no template id. Finance owns `bb_stickers` writes.

## Studio sections (not workspace tabs)

Inspector tabs depend on the **open face**. A control that does not change this face is hidden. Flavor packs tint the sticker, not linen chrome. No Theme tab.

| id | Wrap / taper | Circle / outlines | Top lid | Composite |
|---|---|---|---|---|
| Copy | Logo disc + brand names (separate), ingredients, tips, dates, weight, custom, **named `_blocks`**, badges | Logo, brand, product, flavor, weight, dates | Logo, titles, subtitles | Zones already on the die-cut |
| Nutrition | Serving, calories, macros, DV, row on/off | — | — | — |
| Layout | `chkS*`, named section width, `eSecOrd`, `sw*`, badge toggles | — | — | — (Layers) |
| Type | Wrap font/size sliders | Circle font/size keys | Lid sizes | — |
| Size | `sW`×`sH` **or** cup Ø / `tpCupH` / `tpLblH` / wrap % / `tpOffsetBot`; screen zoom `sScale` | `cW`×`cH`; `sScale` | `tSz`; `sScale` | `cW`×`cH`; `sScale` |
| Color | Label / ink / logo circle (packs in Libraries → Brand) | Flavor ink | Ink | Part colors via Layers |
| Libraries rail | Shapes (Composite) · wrap recipes + named section · Icons · Uploads · Brand · Characters | same | Icons · Uploads · Brand | Shapes · named section · composite blocks (`addZone`) · Characters |
| Layers | Print cut + section boxes (logo disc ≠ brand names) | Print cut + front boxes | Print cut + lid boxes | Parts / zones / stamps / Print cut |

No fourth Design workspace tool.

## Families and preview faces

Live `labelMode` is used only if that family allows it (`DESIGN_SPECS.modes`). Circular / outline families always show the **front sticker**, even if the saved JSON last had `labelMode: back`.

| Family (`designType`) | Face | Live formula | Artboard |
|---|---|---|---|
| `composite` | composite | `_composite` parts / zones / `unionPath` | `_composite.artboard` or `cW`×`cH` (default 6×6 cm) |
| `circular`, `square`, `rounded_sq`, `pentagon`, `hexagon`, `octagon`, `diamond`, `star` | circle | `buildCircleLabel` (logo, brand, flavor, photo, weight, dates). Clip from `cShape` or spec outline | `cW`×`cH` (default 6×6) |
| `rect_top` | back or top | Back: `buildLabel` sections. Top: `buildTopLabel` | Back `sW`×`sH` (live default 17×4.5, saved often 18×4.5). Top `tSz`×`tSz` |
| `taper_top` | taper or top | Taper: live `buildTaperedLabel` pixel viewBox (`minX minY vbW vbH`), rotate around apex, section HTML. Top: `buildTopLabel` | Taper **padded SVG** `vbW/PPC`×`vbH/PPC` (same as live `wrapTapered`, not the print bbox). Top `tSz` |

Rect / taper Studio shows **Back wrap** (or **Taper wrap**) / **Top lid** so the saved wrap and lid can both be checked.

Family faces emit a complete SVG with native pixel `viewBox` and `preserveAspectRatio="xMidYMid meet"`. Do **not** remap them to `viewBox="0 0 100 100"` `preserveAspectRatio="none"` (that squash is why taper looked wrong). Composite stays 0–100.

## Files

```
hub/src/components/design/
  design-app.tsx
  design-context.tsx
  library-tool.tsx
  atelier-tool.tsx  StudioTool (chrome label Studio; tab id atelier)
  studio-rail.tsx   Wave C libraries: Shapes / Blocks / Icons / Uploads / Brand / Characters; Wave D named section
  studio-cut-bar.tsx Composite merge / group / trim / cut (shapes live in the rail)
  inspector-panel.tsx face-aware Copy / Nutrition / Layout / Type / Size / Color / Layers
  flavor-packs.tsx  Brand rail packs (code only)
  art-panel.tsx     Uploads + Icons (inside the rail, not inspector tabs)
  copy-panel.tsx    copy + nutrition/layout/type/size/color fields
  layers-panel.tsx  z-order, shift multi-select, color, rotate, print-cut stroke
  print-tool.tsx
  label-preview.tsx tap / drag / rotate / resize overlay; shift multi-select
  design-busy.tsx   indeterminate bar + message while Save / Delete / snap run
hub/src/lib/design/
  write.ts          writeDesignKey / removeDesignKey
  types.ts
  specs.ts          DESIGN_SPECS (code only)
  layout.ts         previewFace, artboard cm, family hit-boxes, move/resize/rotate offsets
  section-html.ts   wrap/taper section bodies (live getSectionHTML, hub field names)
  family-preview.ts circle / top / back wrap / taper SVG (pixel viewBox)
  templates.ts      normalize, starter, import/export, safe delete; blank die vs starter recipes
  blocks.ts         user-named wrap sections (`state._blocks`, `eSecOrd`)
  assets.ts         strip/hydrate `__asset__:` / `__r2__:`; reuse existing R2 objects
  colors.ts         flavor packs (code only) + Loaded snapshot
  icons.ts          repo catalog + LETTER_STYLES. Not Firestore.
  icon-catalog.json
  art.ts            bg slots, stamps, addProductPhotos, fill-cut-with-paper
  art-presets.ts    artref: / assets/presets/ → /design-presets/*.svg
  product-match.ts  template name → current bb_products when productId is empty
  layers.ts         layer list / move / rotate / recolor / drag; grouped parts move together
  part-types.ts     live PART_TYPES + add-shape factory
  boolean-cut.ts    live raster union / intersect / Moore contour
  studio-ops.ts     merge / group / trim / cut / addZone / named text zone / library character drop
  studio-library.ts wrap recipe block ids + named-section rail copy
  character-library.ts DiceBear style/seed catalog (not product stickers)
  preview.ts        composite SVG or family face; cut stroke overlay
  prepress.ts       1.5 mm bleed, 300 DPI, SVG print/download
  png-pack.ts       Cut / Exact / Bleed PNG (300 DPI, pHYs, die clip, extendBleedNN); FO overlay; nested preset SVG→PNG
  library-thumb.ts  Raster Library snap (WebP/PNG on R2 `library_thumb.webp`)
hub/src/app/api/design/character/route.ts  staff proxy for DiceBear PNG
hub/src/app/api/storage/list/route.ts   list R2 prefix for Images → Storage
hub/src/lib/storage.ts                  listLabelAssets
hub/src/lib/storage-paths.ts            parseLabelAssetKey
hub/src/lib/server/r2.ts                Get / Put / Delete / ListObjectsV2
hub/src/lib/keys.ts                     DESIGN_WRITE_KEYS
hub/public/design-presets/              repo character SVGs (not Firestore)
```

Shared hub (do not fork): `app-workspace.tsx`, `brand-lockup.tsx`, `auth-provider.tsx`, `cloud-store.ts`, `globals.css`, invoice `ui.tsx` primitives.

## Writer map (do not invert)

Hub Design **writes:** `bb_label_templates`, and **consumes/clears** `bb_label_open`. Binaries go to Cloudflare R2 `label_assets/{templateId}/` (Spark — **not** Firebase Storage).

Hub Design **reads only:** `bb_products`, `bb_stickers`.

This slice does **not** write `bb_color_presets` / `bb_active_theme` / `bb_active_color_preset_id` (Invoices → Look owns the shared list). Live HTML designer *could* write those keys; the hub must not invert the map by adding a second theme editor here.

`writeDesignKey` rejects catalog and stickers. Empty cloud must **not** dump flavor packs, Jelly Kids, sample templates, or `assets/presets/` into Firestore.

Finance later **writes** `bb_stickers` and may set `bb_label_open` to open a template. Finance **links** a SKU to a template id; it does not own studio drawing.

## Assets

| Prefix / path | Meaning |
|---|---|
| `__asset__:field` | Bytes live at `label_assets/{templateId}/{field}` on R2; hydrate to a URL/data URL in memory |
| `__r2__:tenants/…/label_assets/{id}/{file}` | Reuse an object already on R2 (Images → Storage). Save must not upload a second copy |
| `data:` / blob | Device upload; strip to `__asset__:` on save when storage is on |
| `artref:` / `assets/presets/…` | Repo file under `hub/public/design-presets/`. Not a tenant dump |

`NEXT_PUBLIC_BB_USE_STORAGE=true` is required for R2 hydrate. If storage is off, placeholders stay refs. Opening a template **batch-signs** R2 keys (up to 40 per request) and hydrates in parallel. Images → Storage **lists keys only**; each tile signs when it is on screen. Library cards are a **raster snap** (`libraryThumb`: WebP/PNG, max 256 px, stored as `__r2__:…/library_thumb.webp` on save/create). Never `data:image/svg+xml` and never `/design-presets/*.svg` in the grid. Studio keeps the full live SVG/FO preview. Existing templates without a snap paint a **cheap Path2D die** (no FO, no preset SVG fetch) until the next Save. Design workspace uses a solid sheet (not glass blur) so scrolling stays light.

Popcorn-blue / popcorn-red stay in Library and Studio. They are excluded from the commercial print pack (`PRINT_PACK_EXCLUDE`) because of licensed likeness.

## Canvas

- Tap a layer (preview or Layers list) to select. Selected text sections open an in-place field.
- Drag the gold border to **move** (a short click does not nudge). Round handle (and Layers slider −180°…180°) to **rotate**. Corner to **resize**.
- Taper / wrap **QR** and **weight** are separate from dates (`sQrPosX/Y`, `sQrSz`, `sWtPosX/Y`). Taper boxes follow the fan so inner items move in the sector.
- Composite: `rot` on parts, zones, stamps. Family faces: live offset keys (`sCLogoX` / `sCBrandX` / …) plus `sC*Rot` / `sT*Rot` / `sSec*Rot`. Composite Studio maps 0–100 onto the artboard rectangle (`preserveAspectRatio="none"`), matching live percent boxes, so Layers Size scales a part about its center without sliding on portrait dies.
- **Print cut** (`__cut__`) is listed and can show the overlay; it is not draggable. The black rim on character art (popcorn) is this die, not a decorative part stroke. Each layer has a **size** control plus an **outward** border (wrap Dates / QR / Weight are separate; not the whole column).
- Wrap / taper Layers **Up / Down** reorder `eSecOrd` columns. Composite Up / Down still restack z-order.
- Studio inspector Copy / Nutrition follow the selected wrap column only while you are already on a content tab. **Layers / Layout / Type / Size / Color stay put** until the designer clicks another inspector tab.
- Composite Size / resize / move of a sole silhouette **rebuilds Print cut from `pathLocal`** (same mapping as the art). Do not scale a raster-traced `unionPath` — that halo sits outside the sticker. Multi-part unions still recompute; Size slider pointer-up calls `syncCutPath`.
- Character preset SVGs (`/design-presets/`) have a square `viewBox` inside a tall or wide canvas, so default SVG meet letterboxes the kernels. Studio / print paint those files with `preserveAspectRatio="xMidYMid slice"` so the art fills the part and Print cut sits on the silhouette. Device photos still use `none` (live fill). PNG cut uses the same `compositeDiePath` as the overlay.
- Opening a template `setCurrent` immediately, then hydrates R2 only if `wantedId` still matches. Character stickers (`showImage` + `artref:` / `artKey`) do not paint or hydrate `hxCProd`, so a cheese photo cannot cover pretzel / china crackers.
- Save / Delete / New / Duplicate / Import show a Design-wide progress bar (`busyMessage`) so the raster snap + Firestore + R2 wait is not a frozen screen.
- Library snaps for wrap / taper / circle / lid paint `foreignObject` copy (html-to-image of a real HTML clone, not the 0×0 FO box). Composite stays SVG-as-image. Save still writes the 256 px WebP. Re-save a family card to replace a colour-only die.
- **Libraries rail (Wave C)** sits left of the canvas: Shapes, Blocks, Icons, Uploads, Brand, Characters. Tap to add. Inspector no longer has Images / Icons tabs. Dropped blocks can be removed (rail Remove, Layers, canvas ×, Delete). Characters are an online DiceBear people library, not `design-presets/` product stickers. Fetched PNG inlines on the template; Save still strips fat data URLs to R2. Existing popcorn templates keep `artref:` / `artKey`. A character (or icon stamp) dropped on the wrap stays on wrap/taper — it does not copy onto the top lid. Layers **Border** draws a ring on that PNG.
- **Blank die + named sections (Wave D).** New template defaults to die only (Library checkbox **Include starter recipes** is off). Wrap/taper: `chkS1–6` false. Composite: empty zones. **Named section** on wrap/taper writes `state._blocks` and extends `eSecOrd`; Copy edits title / fields / width; Remove deletes it. Recipes stay `chkS*`. Legacy Custom column still opens. Composite named section is a text zone. No new `bb_*` key.

## Print house

- 1.5 mm bleed, 300 DPI.
- Cut stroke: `sCutStrokeMm` (default 0.25 mm) and `cCutStroke` (default magenta). Same fields as Layers → Print cut. The millimetre value is the **outside** band (SVG stroke is drawn at 2× under the fill so increasing mm grows outward, not into the art). Print / SVG expand the page by that band so it is not clipped.
- SVG preview / download / print window.
- **PNG pack (Wave B, one open label):** Cut PNG (transparent outside the die, `{Name}_{w}x{h}cm_cut.png`), Exact PNG (full artboard), Bleed PNG (`extendBleedNN`, 1.5 mm). 300 DPI + pHYs. Studio has Cut PNG. Licensed popcorn-blue / popcorn-red warn, they still download. Not a zip of every character.
- Print preview and Download SVG use the **physical artboard** (`width`/`height` in cm, `@page` size matching, `print-color-adjust: exact`, Montserrat / DM Sans / Tajawal loaded in the print window). Default file name is `{Name}_{w}x{h}cm` (SVG, PDF title, JSON).
- Family fills (die + logo discs) are SVG geometry so Chrome Save-as-PDF does not drop CSS backgrounds. Wrap/taper HTML still uses `print-color-adjust` on section roots.

## Cloud seed (2026-08-21)

Firestore `tenants/balance-bites/keys/bb_label_templates` from Desktop JSON (~32 templates). 73 files on R2 `label_assets/{templateId}/`. Nothing from `saved data` is in git. Re-import templates with `node scripts/import-saved-data.mjs --apply --only=bb_label_templates --assets --no-backups`. **2026-08-22:** other Desktop `bb_*` JSON (including invoices) was written to Firestore; zip kept on Desktop.

## What we filtered out (on purpose)

| Live HTML | Hub |
|---|---|
| New / Templates / Product / Theme left tabs | New + product live inside Library / Studio |
| Theme / `bb_color_presets` editor | Invoices → Look (one list) |
| Icon library, Jelly Kids, `assets/presets/` dump | Studio icon picker (repo catalog). No fourth tab. Flavor packs stay code-only |
| Folder-connect, `bbLabel-*` disk scan | Import a JSON file the user picks |
| Full BBComposite drawing + PNG cut pack | Wave A die-cut tools. Wave B: one-label Cut / Exact / Bleed PNG. Wave C: Studio libraries rail. Wave D: blank die + named wrap sections |

## Explicit gaps

- Zip of every commercial character (Print pack exclude still applies) — not this wave
- Scanning Desktop `bbLabel-*.json` (import the file instead)
- Auto-seed of any template or gold theme when Firestore is empty
- Jelly Kids as a dumped catalog

## UX that must not regress

1. Dialogs portal to `document.body` (shared `Modal`).
2. Open template → `?tab=atelier&id=`. The claimed template id wins over a stale URL. Deep link consumes `bb_label_open` then clears it.
3. Delete refuses to wipe a multi-template library if one id would empty the array (live `LabelTemplateMgr.remove` guard).
4. Hub chrome stays linen. Flavor packs tint the label, not the workspace.
5. Family preview uses live formulas in **pixel** artboard space (see table). Taper uses the padded SVG viewBox, not a stretched print bbox.
6. Library cards are compact **raster** thumbs (WebP/PNG snap; no SVG in the grid). Full preview lives in Studio.
7. Uploads live in the Studio libraries rail (not a fourth workspace tool). Device or `__r2__:`; do not store the same PNG twice.
8. A–Z letters use live `LETTER_STYLES` (Fatty / Bubble / Jelly / Candy / Curvy / Block).
9. Flavor pack **Loaded** is the colors already on this template. Listed packs only highlight after you apply one.
10. Layers include **Print cut**; mm + colour match Print house.
11. Character art fills the part box with path stroke; clip is `unionPath`. White full-canvas fills were stripped from repo preset SVGs.
12. Empty `productId` matches `bb_products` by template name (e.g. popcorn-yellow → فشار بالكراميل). Saving writes that link.
13. Print / SVG / PDF stay at artboard centimetres (not A4 with margins). File names include `{w}x{h}cm`.
14. Do not ship a Canva clone or a commercial editor SDK. Studio libraries stay label-scoped ([DESIGN-STUDIO.md](DESIGN-STUDIO.md)).

## Do not rebuild here

- Invoice editor, customers, catalog CRUD, print look — Invoices
- Stock ledger, prep approve, P&L, sticker SKU writes — Finance
- A second invoice list, customer book, or theme editor inside Design
- Copy sticker HTML into `public/` or iframe it
