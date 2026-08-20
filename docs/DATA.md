# Data keys

Live files live in the Desktop folder `saved data` as `{key}.json`. Cloud v1 stores the same keys as Firestore documents under `tenants/balance-bites/keys/{key}`.

## Who writes what

| Key | Invoice Pro | Stock Costs | Designer |
|---|---|---|---|
| `bb_invoices` | write | read | — |
| `bb_inv2` | write (open editor state) | read | — |
| `bb_customers` | write | read | — |
| `bb_products` | read (Stock also writes catalog) | write | read |
| `bb_categories` | read | write | — |
| `bb_invoice_payments` | write | write | — |
| `bb_customer_payments` | — | write | — |
| `bb_pending_invoices` | write | write | — |
| `bb_invoice_bundles` | write | — | — |
| `bb_returns` | read | write | — |
| `bb_materials` | — | write | — |
| `bb_packages` | — | write | — |
| `bb_stickers` | — | write | — |
| `bb_recipes` | — | write | — |
| `bb_purchases` | — | write | — |
| `bb_production` | — | write | — |
| `bb_operation_costs` | — | write | — |
| `bb_investors` | — | write | — |
| `bb_investor_target` | — | write | — |
| `bb_label_templates` | — | write (link) | write |
| `bb_label_open` | — | write (deep link) | read |
| `bb_color_presets` | write | write | write |
| `bb_active_color_preset_id` | write | write | write |
| `bb_active_theme` | — | write | write |

Stock Costs treats `bb_invoices` / `bb_customers` as **read-only** in FileStore (`READ_KEYS`) except prep-invoice **approve**, which writes invoices through `writeAnyKey` on purpose.

## Derived vs stored

| Number | Stored? | Formula |
|---|---|---|
| On-hand component qty | Cached on item, overwritten | sum(purchase qty) − BOM usage from invoices |
| Finished-goods on-hand | No | produced − sold (+ returns rules) |
| Stock value | No | max(0, qty) × last unit cost (+ FG × COGS) |
| Shutdown liquid (stock as cash) | No | paid + pending + stock value |
| Shutdown liquid (stock as loss) | No | paid + pending |
| Shutdown P&amp;L | No | liquid − project spend |

## Assets (not JSON keys)

| Path | App | Cloud target |
|---|---|---|
| `label_assets/{templateId}/` | Designer | **Desktop folder only** (no Cloud Storage on Spark) |
| `bb_backups/` | Stock Costs | **Desktop folder only** (no Cloud Storage on Spark) |
| `assets/presets/` | Designer (repo) | Stay in git (art presets, not live data) |

## Import rule

Never commit live `bb_invoices.json` or customer files. Zip `saved data` privately, import into Firestore with a one-off script, then keep the zip offline.

## CloudStore extras (hub v1)

Desktop FileStore skipped these; they are now Firestore keys so they survive a new browser: `bb_prep_lines`, `bb_prep_ing_view`, `bb_prep_prod_mode`, `bb_prep_print_mode`, `bb_inv_print_preset_id`, `bb_print_fit_one`, `bb_ret_last_customer`.

`bb_backup_locals` stays out of Firestore (full snapshots). Keep folder backups in Desktop `bb_backups/`.
