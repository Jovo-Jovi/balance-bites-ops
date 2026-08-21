# Design app (hub)

Native React. Live behavior: `costs/balance-bites-sticker.html` plus prepress/composite JS.  
Entry: `/design` → `DesignApp` → `DesignProvider`. English chrome. Arabic product names stay as stored.

This is **not** a paste of the sticker HTML and **not** an iframe. Tools are filtered to the work that belongs in this app.

## Tabs (`?tab=`)

| id | Label | Component | Notes |
|---|---|---|---|
| `library` | Library | `library-tool.tsx` | Default. List, search, new, import JSON, duplicate, delete |
| `atelier` | Atelier | `atelier-tool.tsx` | Open template: copy, flavor pack, product, preview |
| `print` | Print house | `print-tool.tsx` | Bleed / DPI / SVG / JSON for the open template |

Old ids still resolve: `templates` → library, `prepress` → print, `libraries` / `link` → atelier.

Deep link: `bb_label_open` (ts within 120s, then **removed**) or `?template=` / `?id=`. Sticker `templateKey` is used when the payload has a sticker id but no template id. Finance owns `bb_stickers` writes.

## Files

```
hub/src/components/design/
  design-app.tsx
  design-context.tsx
  library-tool.tsx
  atelier-tool.tsx
  print-tool.tsx
  label-preview.tsx
hub/src/lib/design/
  write.ts          writeDesignKey / removeDesignKey
  types.ts
  specs.ts          DESIGN_SPECS (code only)
  colors.ts         flavor packs (code only — not bb_color_presets)
  templates.ts      normalize, starter, import/export, safe delete
  assets.ts         strip/hydrate R2 __asset__: refs
  preview.ts        SVG from composite parts/zones or die-cut outline
  prepress.ts       1.5 mm bleed, 300 DPI, SVG print/download
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
| Icon library, Jelly Kids, `assets/presets/` dump | Not a fourth app; applying repo art is an explicit gap |
| Folder-connect, `bbLabel-*` disk scan | Import a JSON file the user picks |
| Full BBComposite drawing + PNG cut pack | Preview + round-trip `state._composite`; SVG export |

## Explicit gaps

- Freeform composite drawing, icon stamps, taper wrap renderer
- PNG cut-path print pack from `bb-prepress.js`
- Applying repo art presets / Jelly Kids into tenant templates
- Scanning Desktop `bbLabel-*.json` (import the file instead)
- Auto-seed of any template or gold theme when Firestore is empty

## UX

1. Dialogs portal to `document.body` (shared `Modal`).
2. Open template → `?tab=atelier&id=`. Deep link consumes `bb_label_open` then clears it.
3. Delete refuses to wipe a multi-template library if one id would empty the array (live `LabelTemplateMgr.remove` guard).
4. Hub chrome stays linen. Flavor packs tint the label, not the workspace.
