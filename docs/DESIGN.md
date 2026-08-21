# Design app (hub)

Native React. Live behavior: `costs/balance-bites-sticker.html` plus prepress/composite JS.  
Entry: `/design` → `DesignApp` → `DesignProvider`. English chrome. Arabic product names stay as stored.

This is **not** a paste of the sticker HTML and **not** an iframe. Tools are filtered to the work that belongs in this app.

## Tabs (`?tab=`)

| id | Label | Component | Notes |
|---|---|---|---|
| `library` | Library | `library-tool.tsx` | Default. List, search, new, import JSON, duplicate, delete |
| `atelier` | Atelier | `atelier-tool.tsx` | Open template: Copy / Images / Icons / Layers tabs, product, preview |
| `print` | Print house | `print-tool.tsx` | Bleed / DPI / editable cut-stroke border (mm + colour) / SVG / JSON |

Old ids still resolve: `templates` → library, `prepress` → print, `libraries` / `link` → atelier.

Deep link: `bb_label_open` (ts within 120s, then **removed**) or `?template=` / `?id=`. Sticker `templateKey` is used when the payload has a sticker id but no template id. Finance owns `bb_stickers` writes.

## Files

```
hub/src/components/design/
  design-app.tsx
  design-context.tsx
  library-tool.tsx
  atelier-tool.tsx
  art-panel.tsx     Images tab (hxBg* uploads) + Icons tab (letter fonts)
  copy-panel.tsx    copy that is actually on this family
  layers-panel.tsx  z-order + select; icon/text color
  print-tool.tsx
  label-preview.tsx Atelier drag/select overlay
hub/src/lib/design/
  write.ts          writeDesignKey / removeDesignKey
  types.ts
  specs.ts          DESIGN_SPECS (code only)
  colors.ts         flavor packs (code only — not bb_color_presets)
  templates.ts      normalize, starter, import/export, safe delete
  assets.ts         strip/hydrate R2 __asset__: refs
  icons.ts          repo icon catalog + live A–Z letter styles. Not Firestore.
  icon-catalog.json
  art.ts            bg slots, stamp/apply icon
  art-presets.ts    artref: / assets/presets/ → /design-presets/*.svg (repo, not Firestore)
  product-match.ts  map template name to current bb_products when productId is empty
  layers.ts         layer list / move / recolor / drag
  preview.ts        SVG from composite parts/zones or die-cut outline; cut stroke overlay
  prepress.ts       1.5 mm bleed, 300 DPI, SVG print/download (includes cut border)
hub/src/lib/keys.ts DESIGN_WRITE_KEYS
```

Shared hub (do not fork): `app-workspace.tsx`, `brand-lockup.tsx`, `auth-provider.tsx`, `cloud-store.ts`, `globals.css`, invoice `ui.tsx` primitives.

## Writer map (do not invert)

Design **writes:** `bb_label_templates`, `bb_label_open` (consume/clear only), and may write shared theme keys later. This slice does **not** write `bb_color_presets` / `bb_active_theme` (Invoices → Look already owns the shared list). Binaries go to R2 `label_assets/{templateId}/`.

Design **reads only:** `bb_products`, `bb_stickers`.

`writeDesignKey` rejects catalog and stickers. Empty cloud must **not** dump flavor packs, Jelly Kids, or sample templates.

## What we filtered out (on purpose)

| Live HTML | Hub |
|---|---|
| New / Templates / Product / Theme left tabs | New + product live inside Library / Atelier |
| Theme / `bb_color_presets` editor | Invoices → Look (one list) |
| Icon library, Jelly Kids, `assets/presets/` dump | Atelier icon picker (repo catalog). No fourth tab. Flavor packs stay code-only. Do not dump the catalog into Firestore |
| Folder-connect, `bbLabel-*` disk scan | Import a JSON file the user picks |
| Full BBComposite drawing + PNG cut pack | Preview + round-trip `state._composite`; SVG export |

## Explicit gaps

- Freeform composite drawing, full cone-unroll taper print
- PNG cut-path print pack from `bb-prepress.js`
- Applying repo `assets/presets/` folders into tenant templates (preview resolves `artref:` from `public/design-presets/` instead)
- Scanning Desktop `bbLabel-*.json` (import the file instead)
- Auto-seed of any template or gold theme when Firestore is empty

## UX

1. Dialogs portal to `document.body` (shared `Modal`).
2. Open template → `?tab=atelier&id=`. The claimed template id wins over a stale URL so Atelier does not snap back. Deep link consumes `bb_label_open` then clears it.
3. Delete refuses to wipe a multi-template library if one id would empty the array (live `LabelTemplateMgr.remove` guard).
4. Hub chrome stays linen. Flavor packs tint the label, not the workspace.
5. Atelier preview: tap a layer to select, drag to move, corner handle to resize. Uploaded photos and character parts are not static.
6. Library cards are compact thumbs (lazy character art, lite silhouette for other families). Full preview lives in Atelier.
7. Uploaded images are the Atelier **Images** tab (live Typography → Background images). Not a fourth workspace tool.
8. A–Z icon letters use live `LETTER_STYLES` (Fatty / Bubble / Jelly / Candy / Curvy / Block).
