# Design Studio — plan

**Status:** confirmed 22 Aug 2026. **Wave A in test** on `feat/design` (stop for user test before B). Waves B–D not started.

This is a Design-slice follow-up on `feat/design`, not a fourth hub app and not Finance. Current map: [DESIGN.md](DESIGN.md). Live source: `costs/bb-composite-label.js`, `costs/bb-prepress.js`, `costs/balance-bites-sticker.html`.

---

## Verdict

Atelier should become a **label studio**: one canvas, libraries of ready pieces, die-cut tools (join / trim / cut / merge), and PNG cut packs — so a sticker can be made from scratch.

It should **not** become Canva.

Canva is a general graphic product (social posts, video, Magic Studio, stock marketplace, AI “Magic Layers”). Balance Bites Design is a **print-production studio** for food labels: centimetre artboards, die-cuts, wrap/taper geometry, nutrition/Arabic, SKU link, R2 art, licensed-character exclude. Borrow Canva’s *shape* (libraries + canvas + selection inspector). Keep our *job* (cut path, exact cm, legal copy blocks).

Do **not** embed Polotno, IMG.LY, Fabric.js-as-the-app, or Canva Apps. Keep native SVG in the hub. Boolean math should port live raster union / intersect from `BBComposite`, not a new engine unless that port fails.

---

## What Canva is useful for (and what to refuse)

Looked at [canva.com](https://www.canva.com/), [Canva elements](https://www.canva.com/en_au/help/add-elements/), and the [Design Editing API](https://www.canva.dev/docs/apps/design-editing/). Related editors (Polotno, Fabric, tldraw, Paper.js boolean) were used only as *ideas*, not as products to install.

| Canva idea | Suit this module? | How we would use it |
|---|---|---|
| Left rail: Templates / Elements / Text / Uploads | **Yes** | Inside Atelier (Studio), not a fourth hub tab |
| Drop a ready piece onto the canvas | **Yes** | Shapes, text, blocks, icons, photos |
| Everything is a generic element (not “Ingredients”) | **Yes, with recipes** | User-named sections; nutrition/dates stay as *starter blocks* |
| Selection → properties panel | **Yes** | Already the inspector; it must follow the selected layer |
| Brand kit | **Partial** | Flavor packs (code) + R2 logos. No second `bb_color_presets` editor |
| Pages / exact size | **Yes** | Artboard cm we already have |
| Group / arrange | **Yes** | Live already: group, z-order, lock |
| Magic Layers / AI decompose a PNG | **No** | Wrong product; licensed art risk |
| Stock photos / video / presentations | **No** | |
| Public template marketplace | **No** | Tenant templates only; repo character art stays in git |
| Commercial “Canva SDK” | **No** | License, lock-in, fights our SVG/cut model |

Open-source takeaway: **tldraw-style** = canvas + overlay (we already do this). **Paper.js** = real boolean paths (only if live raster union is not enough). **Fabric.js / Polotno** = would replace the native preview we just made correct. Reject as the renderer.

---

## What live HTML already is (the real spec)

Do not invent a new die-cut language. Port `BBComposite` and Isolated PNG.

### Shapes (`PART_TYPES`)

Circle, half circle, square, rectangle, round sq/rect, oval, half oval, diamond, hexagon, star, jelly blob, cloud, heart, scallop, teardrop, crescent, blob.

### Content (`addZone`)

Text, logo disc, image, icon, expiry box. User can add more; they are not limited to the three default logo/brand/flavor zones.

### Die-cut actions (toolbar in live composite)

| Live control | Meaning |
|---|---|
| Join / **Merge shapes** | Selected parts → one silhouette (`pathLocal`) |
| **Group** | Move together; not a new path |
| **Group clip** | Main ∩ other (trim / punch-into) |
| Ungroup | Drop group / clip links |
| Preview cut → **Approve cut** | Outer border of shapes + outer icons becomes `unionPath` |
| **Cut = group** | Die-cut = union of the selection |
| Import image + outline | Photo + silhouette into the cut |

`joinSelected()` in live **is** `mergeSelectedParts()`. “Trim” in user language maps to **Group clip** (intersection), not a separate mystery tool.

### PNG cut pack (live Isolated Output)

- Exact artboard **cm** at export DPI (300 in hub Print house).
- Composite: `BBComposite.rasterizeToDataURL` then **punch transparent outside the die-cut**.
- Filename: `{Name}_{w}x{h}cm_cut.png` (and unclipped `{Name}_{w}x{h}cm.png`).
- `pngSetPhysSize` so the PNG knows physical size.
- Bleed helper in `bb-prepress.js` (`extendBleedNN`).
- **Print pack exclude:** popcorn-blue / popcorn-red (licensed likeness) — already `PRINT_PACK_EXCLUDE` in the hub.

A “pack” can mean (1) one label’s cut PNG + optional bleed PNG, or (2) a zip of many templates. **(1) is the live daily tool. (2) is later.**

---

## Product model after confirmation

Keep **three** Design workspace tools. Rename Atelier chrome to **Studio**. Keep `?tab=atelier` so old links work.

```
Library     → saved templates (unchanged writer: bb_label_templates)
Studio      → canvas + libraries rail + die-cut actions + inspector
Print house → SVG, print/PDF, PNG cut (+ later zip pack)
```

### One document, three layers of meaning

1. **Artboard** — physical cm (wrap, taper padded SVG, circle, or composite board).
2. **Die-cut** — `unionPath` / family outline / taper fan. Print cut stroke sits on this.
3. **Content** — generic layers: shape, text, image, icon, **block**.

Wrap and taper stay **geometry recipes** (how the die is shaped). They stop being the only way copy exists. A rectangular wrap can be a blank die that you fill with blocks, or a starter that already dropped Ingredients / Nutrition / Dates.

### Libraries rail (Canva-shaped, label-scoped)

All **inside Studio**. Repo catalogs stay in git. Tenant uploads stay on R2. **Never seed** flavor packs, Jelly Kids, or `assets/presets/` into Firestore.

| Rail | Source | User does |
|---|---|---|
| Templates | `bb_label_templates` (Library) | Open / duplicate — already exists |
| Shapes | `PART_TYPES` in code | Add a die piece, then join/clip/cut |
| Blocks | Code recipes | Drop Nutrition, Ingredients, Dates+QR, Logo, **Custom section** |
| Icons | `icon-catalog.json` + A–Z letters | Same as today’s Icons tab |
| Uploads | R2 `label_assets/` + device | Photos, QR, paper — reuse `__r2__:` |
| Brand | Flavor packs (code) + logos on R2 | Tint + drop BB disc |
| Characters | `hub/public/design-presets/` | Apply art; respect print-pack exclude |

### Custom sections (the “not Ingredients forever” rule)

Today wrap/taper inspector is hard-wired: Ingredients, Nutrition, Tips, Dates, Custom. That is fine as **starters**. It is wrong as the only model.

**Custom section** the user adds:

- Section **title** they type (e.g. “Storage”, “Kids line”, “Halal mark”).
- Inside: add/remove **fields** (label + EN and/or AR text, optional icon).
- Place on the wrap as a column/sector, or on a composite as a text block.

**Recipe blocks** (not free-form soup):

- Nutrition Facts still uses stored `nCal` / `nFat` / … so product data and legal layout stay one shape.
- Dates + QR + weight stay one recipe because print needs them together.
- Ingredients EN/AR stay a recipe with allergen lines.

Starter templates insert those recipes. A blank Studio document starts with a die only; the user adds sections from the rail.

### Inspector

Stop showing “Copy / Nutrition / Layout” as if every sticker had those tabs.

Show:

- **Document** — artboard cm, family/geometry, product link, lock, flavor.
- **Selection** — whatever is selected (shape path, text, block fields, cut stroke).
- **Libraries** — the rail above (can share the inspector column on small screens).

Hard-coded field names (`eIngredients`, `eTipBody`, …) remain on recipe blocks for round-trip with saved templates. Custom sections store their own `{ title, fields[] }` on the template state (still inside `bb_label_templates`).

---

## Proposed waves (confirm which to build)

### Wave A — Composite studio (parity with live drawing)

Port, do not redesign:

- Add shape from `PART_TYPES`.
- Multi-select (shift).
- Merge / join → one `pathLocal`.
- Group / ungroup.
- Group clip (trim).
- Preview cut / Approve cut / Cut = selected.
- Undo for these actions (live had afterEdit; hub should stack).

Still native SVG. Raster union/intersect copied from `bb-composite-label.js` (canvas contour), not Paper.js, unless quality fails on saved popcorn/chicopon cuts.

### Wave B — PNG cut packs

Print house (and a Studio export button):

1. **Cut PNG** — clip to die, transparent outside, exact cm, 300 DPI, `{Name}_{w}x{h}cm_cut.png`.
2. **Exact PNG** — same size, no clip (wrap/taper rectangle).
3. Optional **bleed PNG** using `extendBleedNN` (1.5 mm).
4. **Not in this wave:** zip of every commercial character. That is a batch job with `PRINT_PACK_EXCLUDE`.

Rasterize the **same SVG** we already print (fonts loaded, physical cm). Composite uses `unionPath` as the clip. Wrap = rectangle. Taper = fan path. Circle = outline geom. Do not iframe live HTML. Avoid html2canvas unless SVG raster fails.

### Wave C — Studio libraries rail

UI only on top of A:

- Left rail in Studio: Shapes / Blocks / Icons / Uploads / Brand.
- Drag or tap-to-add.
- Existing Images / Icons inspector tabs fold into this rail so we do not grow a fourth workspace tool.

### Wave D — Generic sections + blank-from-scratch

- New template: pick die (rect wrap, taper, circle, blank composite) with **no** forced Ingredients column.
- Add section → name it → add fields.
- Wrap/taper sector order becomes the list of blocks on that face (migrate `eSecOrd` / `chkS*`).
- Saved `rect_top` / `taper_top` templates keep current sections so old JSON still opens.

### Explicitly out of this plan

- Finance, Theme tab, second invoice list.
- Dumping Jelly Kids / presets / flavor packs into Firestore.
- Canva AI, Magic Layers, stock marketplace.
- Replacing family pixel preview with `viewBox="0 0 100 100"` squash.
- Desktop `bbLabel-*` folder scan.
- New `bb_*` writer keys (unless a later confirm needs `bb_design_blocks` — default is **keep everything on the template**).

---

## Data and files (when building)

| Concern | Where |
|---|---|
| Template JSON | `bb_label_templates` only (`writeDesignKey`) |
| Composite | `state._composite` (parts, zones, `unionPath`, cut source ids) — already round-trips |
| Custom sections | Prefer `state._blocks` on the same template; do not invent a cloud catalog |
| PNG bytes | Download in the browser; optional save to R2 `label_assets/{id}/` only if asked |
| Live formulas | Grep `bb-composite-label.js` / Isolated `exportPNG` before coding |

Likely new hub files (Wave A–B): `hub/src/lib/design/boolean-cut.ts` (port union/intersect), `hub/src/lib/design/png-pack.ts` (raster + pHYs + clip), Studio rail component under `hub/src/components/design/`. Do not copy sticker HTML into `public/`.

---

## Confirm checklist

- [x] **Wave A** — shapes + join / trim / cut / merge (live composite parity) — **in test**
- [ ] **Wave B** — Cut PNG + exact PNG (+ bleed if you want it)
- [ ] **Wave C** — libraries rail inside Studio (Canva-shaped, label-scoped)
- [ ] **Wave D** — user-named sections + blank-from-scratch
- [x] Rename Atelier label to **Studio** (keep `?tab=atelier`)
- [x] PNG pack = **one label** first (not a zip of all templates) — agreed; build in Wave B
- [x] Keep wrap/taper **starters** (Ingredients / Nutrition) as library blocks, not deleted
- [x] Do **not** add Canva/Polotno/AI

Wave A shipped behavior: Composite family toolbar (PART_TYPES, shift multi-select, Merge, Group, Ungroup, Trim/clip pick, Cut = selected, Preview cut / Approve / Cancel, Undo). Chrome label is Studio. Do not start Wave B until this is tested.
