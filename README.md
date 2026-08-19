# Balance Bites

Private operations suite for **Balance Bites** — invoices, label design, and finance & inventory.

Today the three apps are HTML files that share a Desktop folder (`saved data`). The target is **one URL**: a web hub where you pick a card (Invoices, Design, or Finance & Inventory) and all data lives in one online database.

## Apps

| Hub card | What it is | Main file |
|---|---|---|
| **Invoices** | Customer invoices, catalog, print, payments, drafts from prep | `balance-bites-invoice-pro.html` |
| **Design** | Label / sticker designer, templates, print-ready art | `balance-bites-sticker.html` |
| **Finance & Inventory** | Stock, purchases, recipes, COGS, profit, shutdown, investors | `bb-stock-costs.html` |

Arabic UI (RTL) for invoices and finance. Label designer is bilingual (print-house English + Arabic names).

## How data works today

Each app reads **localStorage** and, when the folder is connected, mirrors JSON files in:

`C:\Users\Marco\Desktop\BALANCE BITES\invoices customers\saved data`

Shared keys include `bb_invoices`, `bb_customers`, `bb_products`, `bb_materials`, `bb_purchases`, `bb_label_templates`, and others. See [docs/DATA.md](docs/DATA.md).

Stock on-hand is **not** a typed count. It is:

**purchases − ingredients implied by invoices**

## Cloud target (planned)

- **Hub:** Next.js on Vercel — one URL, three cards after login
- **Database:** Firebase (Auth + Firestore + Storage)
- **Git:** GitHub private repo
- **Why Firebase:** current records are already JSON documents; Storage holds label art. Postgres/Supabase is a later option for SQL reports.

Full plan: [docs/CLOUD-PLAN.md](docs/CLOUD-PLAN.md)  
Layers and brand: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)  
Module map: [docs/MODULES.md](docs/MODULES.md)

## Local use (current)

1. Open the HTML file in Chrome, Edge, or Brave (File System Access API).
2. Click **ربط المجلد** / connect and choose the `saved data` folder.
3. Keep **one** window of each app. Invoice Pro and Stock Costs must share the same folder.
4. Do not open the Desktop copy and the `costs\` copy of the same file at once.

## Brand

- Wordmark: Playfair Display 900, gold on charcoal
- Mark: rotated square (diamond) already used on invoices
- Type: Playfair, Syne, DM Sans, Tajawal
- Gold `#c9a84c` on `#060603`

Details: [docs/BRAND-UI.md](docs/BRAND-UI.md)

## Two folders (until migrate)

| Folder | Role |
|---|---|
| **This repo** (`Desktop\balance-bites-ops`) | Cloud hub code, docs, GitHub, Vercel |
| **Live workspace** (`Desktop\costs`) | Current HTML apps, templates, and local JSON until cutover |

Do not treat GitHub as the live database. Invoices, stock, and label templates stay in the Desktop `saved data` folder until Firebase is wired and a cutover is done.

Live app files (leave them in `costs` until migrate):

- `bb-stock-costs.html`
- `balance-bites-invoice-pro.html`
- `balance-bites-sticker.html`
- `bb-prepress.js`, `bb-composite-label.js`, `bb-icon-library.js`, `bb-jelly-kids.js`
- `assets/presets/`

## Repository layout

```
balance-bites-ops/
  README.md
  SETUP.md
  docs/
```

Setup (GitHub / Vercel / Firebase): [SETUP.md](SETUP.md)

## Status

Desktop-first. Cloud hub is planned, not deployed. Do not treat GitHub as the live database.

## License

Private. All rights reserved — Balance Bites.
