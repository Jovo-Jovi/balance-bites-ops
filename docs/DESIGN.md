# Design app (hub)

Native React. Live behavior: `costs/balance-bites-sticker.html` plus `bb-composite-label.js` / `bb-prepress.js` / `bb-icon-library.js`.  
Entry: `/design` → `DesignApp` → `DesignProvider`. English chrome. Arabic product names stay as stored.

This is **not** a paste of the sticker HTML and **not** an iframe. Tools are filtered to the work that belongs in this app.

When building **Finance**, reuse hub chrome and CloudStore. Do **not** duplicate this library, atelier, print house, or `bb_label_templates` writer. Invoice map: [INVOICES.md](INVOICES.md). Journal: [JOURNAL.md](JOURNAL.md). Parity ticks: [PARITY.md](PARITY.md).

Branch while this slice is open: `feat/design`. Live templates were seeded 2026-08-21 (Desktop `bb_label_templates.json` → Firestore; 73 files on R2). Do **not** re-seed or run `import:apply` unless asked.

## Tabs (`?tab=`)

| id | Label | Component | Notes |
|---|---|---|---|
| `library` | Library | `library-tool.tsx` | Default. List, search, new, import JSON, duplicate, delete |
| `atelier` | Atelier | `atelier-tool.tsx` | Canvas first; face-aware inspector; name / family / product / lock / Save at the top |
| `print` | Print house | `print-tool.tsx` | Bleed / DPI / editable cut-stroke / SVG / JSON |

Old ids still resolve: `templates` → library, `prepress` → print, `libraries` / `link` → atelier.

Deep link: `bb_label_open` (ts within 120s, then **removed**) or `?template=` / `?id=`. Sticker `templateKey` is used when the payload has a sticker id but no template id. Finance owns `bb_stickers` writes.

## Atelier sections (not workspace tabs)

Inspector tabs depend on the **open face**. A control that does not change this face is hidden. Flavor packs tint the sticker, not linen chrome. No Theme tab.

| id | Wrap / taper | Circle / outlines | Top lid | Composite |
|---|---|---|---|---|
| Copy | Brand, names EN/AR, ingredients, tips, dates, weight, custom, badges | Logo, brand, product, flavor, weight, dates | Logo, titles, subtitles | Zones already on the die-cut |
| Nutrition | Serving, calories, macros, DV, row on/off | — | — | — |
| Layout | `chkS*`, order, `sw*`, badge toggles | — | — | — (Layers) |
| Type | Wrap font/size sliders | Circle font/size keys | Lid sizes | — |
| Size | `sW`×`sH` **or** cup Ø / `tpCupH` / `tpLblH` / wrap % / `tpOffsetBot`; screen zoom `sScale` | `cW`×`cH`; `sScale` | `tSz`; `sScale` | `cW`×`cH`; `sScale` |
| Color | Packs + label / ink / logo circle | Packs + flavor ink | Packs + ink | Packs + part colors via Layers |
| Images | `hxBg*` / `hxCProd` / `hxQr` | Product photo + paper | — | Same + composite photos |
| Icons | — | — | — | Repo catalog + A–Z stamps |
| Layers | Print cut + section boxes | Print cut + front boxes | Print cut + lid boxes | Parts / zones / stamps / Print cut |

No fourth Design workspace tool.

## Families and preview faces

Live `labelMode` is used only if that family allows it (`DESIGN_SPECS.modes`). Circular / outline families always show the **front sticker**, even if the saved JSON last had `labelMode: back`.

| Family (`designType`) | Face | Live formula | Artboard |
|---|---|---|---|
| `composite` | composite | `_composite` parts / zones / `unionPath` | `_composite.artboard` or `cW`×`cH` (default 6×6 cm) |
| `circular`, `square`, `rounded_sq`, `pentagon`, `hexagon`, `octagon`, `diamond`, `star` | circle | `buildCircleLabel` (logo, brand, flavor, photo, weight, dates). Clip from `cShape` or spec outline | `cW`×`cH` (default 6×6) |
| `rect_top` | back or top | Back: `buildLabel` sections. Top: `buildTopLabel` | Back `sW`×`sH` (live default 17×4.5, saved often 18×4.5). Top `tSz`×`tSz` |
| `taper_top` | taper or top | Taper: live `buildTaperedLabel` pixel viewBox (`minX minY vbW vbH`), rotate around apex, section HTML. Top: `buildTopLabel` | Taper **padded SVG** `vbW/PPC`×`vbH/PPC` (same as live `wrapTapered`, not the print bbox). Top `tSz` |

Rect / taper Atelier shows **Back wrap** (or **Taper wrap**) / **Top lid** so the saved wrap and lid can both be checked.

Family faces emit a complete SVG with native pixel `viewBox` and `preserveAspectRatio="xMidYMid meet"`. Do **not** remap them to `viewBox="0 0 100 100"` `preserveAspectRatio="none"` (that squash is why taper looked wrong). Composite stays 0–100.

## Files

```
hub/src/components/design/
  design-app.tsx
  design-context.tsx
  library-tool.tsx
  atelier-tool.tsx
  inspector-panel.tsx face-aware Copy / Nutrition / Layout / Type / Size / Color
  art-panel.tsx     Images tab + Icons tab
  copy-panel.tsx    copy + nutrition/layout/type/size/color fields
  layers-panel.tsx  z-order, select, color, rotate, print-cut stroke
  print-tool.tsx
  label-preview.tsx tap / drag / rotate / resize overlay
hub/src/lib/design/
  write.ts          writeDesignKey / removeDesignKey
  types.ts
  specs.ts          DESIGN_SPECS (code only)
  layout.ts         previewFace, artboard cm, family hit-boxes, move/resize/rotate offsets
  section-html.ts   wrap/taper section bodies (live getSectionHTML, hub field names)
  family-preview.ts circle / top / back wrap / taper SVG (pixel viewBox)
  templates.ts      normalize, starter, import/export, safe delete
  assets.ts         strip/hydrate `__asset__:` / `__r2__:`; reuse existing R2 objects
  colors.ts         flavor packs (code only) + Loaded snapshot
  icons.ts          repo catalog + LETTER_STYLES. Not Firestore.
  icon-catalog.json
  art.ts            bg slots, stamps, addProductPhotos, fill-cut-with-paper
  art-presets.ts    artref: / assets/presets/ → /design-presets/*.svg
  product-match.ts  template name → current bb_products when productId is empty
  layers.ts         layer list / move / rotate / recolor / drag
  preview.ts        composite SVG or family face; cut stroke overlay
  prepress.ts       1.5 mm bleed, 300 DPI, SVG print/download
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

Finance later **writes** `bb_stickers` and may set `bb_label_open` to open a template. Finance **links** a SKU to a template id; it does not own atelier drawing.

## Assets

| Prefix / path | Meaning |
|---|---|
| `__asset__:field` | Bytes live at `label_assets/{templateId}/{field}` on R2; hydrate to a URL/data URL in memory |
| `__r2__:tenants/…/label_assets/{id}/{file}` | Reuse an object already on R2 (Images → Storage). Save must not upload a second copy |
| `data:` / blob | Device upload; strip to `__asset__:` on save when storage is on |
| `artref:` / `assets/presets/…` | Repo file under `hub/public/design-presets/`. Not a tenant dump |

`NEXT_PUBLIC_BB_USE_STORAGE=true` is required for R2 hydrate. If storage is off, placeholders stay refs.

Popcorn-blue / popcorn-red stay in Library and Atelier. They are excluded from the commercial print pack (`PRINT_PACK_EXCLUDE`) because of licensed likeness.

## Canvas

- Tap a layer (preview or Layers list) to select.
- Drag to **move**. Round handle (and Layers slider −180°…180°) to **rotate**. Corner to **resize**.
- Composite: `rot` on parts, zones, stamps. Family faces: live offset keys (`sCLogoX` / `sCBrandX` / …) plus `sC*Rot` / `sT*Rot` / `sSec*Rot`.
- **Print cut** (`__cut__`) is listed and can show the overlay; it is not draggable.
- Opening a template `setCurrent` immediately, then hydrates R2 only if `wantedId` still matches. The previous sticker’s photos must not stay on screen.

## Print house

- 1.5 mm bleed, 300 DPI.
- Cut stroke: `sCutStrokeMm` (default 0.25 mm) and `cCutStroke` (default magenta). Same fields as Layers → Print cut.
- SVG preview / download / print window. PNG cut-path pack from live `bb-prepress.js` is still a gap.

## Cloud seed (2026-08-21)

Firestore `tenants/balance-bites/keys/bb_label_templates` from Desktop JSON (~32 templates). 73 files on R2 `label_assets/{templateId}/`. Nothing from `saved data` is in git. Re-import templates with `node scripts/import-saved-data.mjs --apply --only=bb_label_templates --assets --no-backups`. **2026-08-22:** other Desktop `bb_*` JSON (including invoices) was written to Firestore; zip kept on Desktop.

## What we filtered out (on purpose)

| Live HTML | Hub |
|---|---|
| New / Templates / Product / Theme left tabs | New + product live inside Library / Atelier |
| Theme / `bb_color_presets` editor | Invoices → Look (one list) |
| Icon library, Jelly Kids, `assets/presets/` dump | Atelier icon picker (repo catalog). No fourth tab. Flavor packs stay code-only |
| Folder-connect, `bbLabel-*` disk scan | Import a JSON file the user picks |
| Full BBComposite drawing + PNG cut pack | Preview + round-trip `state._composite`; SVG export |

## Explicit gaps

- Freeform composite drawing (`bb-composite-label.js` tools beyond preview + `rot` / move / resize)
- PNG cut-path print pack from `bb-prepress.js`
- Applying repo `assets/presets/` folders **into** tenant templates (preview already resolves `artref:` from `public/design-presets/`)
- Scanning Desktop `bbLabel-*.json` (import the file instead)
- Auto-seed of any template or gold theme when Firestore is empty
- Jelly Kids as a dumped catalog

## UX that must not regress

1. Dialogs portal to `document.body` (shared `Modal`).
2. Open template → `?tab=atelier&id=`. The claimed template id wins over a stale URL. Deep link consumes `bb_label_open` then clears it.
3. Delete refuses to wipe a multi-template library if one id would empty the array (live `LabelTemplateMgr.remove` guard).
4. Hub chrome stays linen. Flavor packs tint the label, not the workspace.
5. Family preview uses live formulas in **pixel** artboard space (see table). Taper uses the padded SVG viewBox, not a stretched print bbox.
6. Library cards are compact thumbs (lazy character art; other families lite). Full preview lives in Atelier.
7. Images tab is not a fourth workspace tool. Device or `__r2__:`; do not store the same PNG twice.
8. A–Z letters use live `LETTER_STYLES` (Fatty / Bubble / Jelly / Candy / Curvy / Block).
9. Flavor pack **Loaded** is the colors already on this template. Listed packs only highlight after you apply one.
10. Layers include **Print cut**; mm + colour match Print house.
11. Character art fills the part box with path stroke; clip is `unionPath`. White full-canvas fills were stripped from repo preset SVGs.
12. Empty `productId` matches `bb_products` by template name (e.g. popcorn-yellow → فشار بالكراميل). Saving writes that link.

## Do not rebuild here

- Invoice editor, customers, catalog CRUD, print look — Invoices
- Stock ledger, prep approve, P&L, sticker SKU writes — Finance
- A second invoice list, customer book, or theme editor inside Design
- Copy sticker HTML into `public/` or iframe it
