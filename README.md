# Balance Bites

Private operations suite for **Balance Bites** — invoices, label design, and finance & inventory.

Today the three apps are HTML files that share a Desktop folder (`saved data`). The target is **one URL**: a web hub where you pick a card (Invoices, Design, or Finance & Inventory) and all data lives in one online database.

## Apps

| Hub card | What it is | Live source |
|---|---|---|
| **Invoices** | Native hub: invoices, catalog, print, payments, drafts from prep | `balance-bites-invoice-pro.html` |
| **Design** | Native hub: library, studio, print house | `balance-bites-sticker.html` |
| **Finance & Inventory** | Stock, purchases, recipes, COGS, profit, shutdown, investors (shell until that slice) | `bb-stock-costs.html` |

Arabic UI (RTL) for invoices and finance. Label designer is bilingual (print-house English + Arabic names).

## How data works today

Each app reads **localStorage** and, when the folder is connected, mirrors JSON files in:

`C:\Users\Marco\Desktop\BALANCE BITES\invoices customers\saved data`

Shared keys include `bb_invoices`, `bb_customers`, `bb_products`, `bb_materials`, `bb_purchases`, `bb_label_templates`, and others. See [docs/DATA.md](docs/DATA.md).

Stock on-hand is **not** a typed count. It is:

**purchases − ingredients implied by invoices**

## Cloud target

- **Hub:** Next.js in `hub/` — login + three cards; Invoices is a live React app
- **Database:** Firebase (Auth + Firestore). Binaries on Cloudflare R2 — not Firebase Storage / not Blaze.
- **Git:** GitHub private repo `Jovo-Jovi/balance-bites-ops`
- **Live:** https://balance-bites-ops.vercel.app (staff login; rules locked)

Parity: [docs/PARITY.md](docs/PARITY.md)  
What shipped: [docs/JOURNAL.md](docs/JOURNAL.md) · invoices: [docs/INVOICES.md](docs/INVOICES.md) · design: [docs/DESIGN.md](docs/DESIGN.md) · studio: [docs/DESIGN-STUDIO.md](docs/DESIGN-STUDIO.md) (Wave A in test)  
Full plan: [docs/CLOUD-PLAN.md](docs/CLOUD-PLAN.md)  
Layers and brand: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)  
Module map: [docs/MODULES.md](docs/MODULES.md)

## Local use (current)

1. Open the HTML file in Chrome, Edge, or Brave (File System Access API).
2. Click **ربط المجلد** / connect and choose the `saved data` folder.
3. Keep **one** window of each app. Invoice Pro and Stock Costs must share the same folder.
4. Do not open the Desktop copy and the `costs\` copy of the same file at once.

## Brand

- Wordmark: Playfair Display 900, ink on linen paper
- Mark: rotated square (diamond) already used on invoices
- Type: Playfair, Syne, DM Sans, Tajawal
- Hub: linen `#f4f0ea`, ink `#1f2930`, teal `#0f6e6b` on actions; frosted-glass cards

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
  .cursor/rules/       Agent rules (workflow, UI, no duplicate modules)
  hub/                 Next.js App Router (Vercel root directory)
  docs/                Architecture, modules, data, brand, parity, invoices journal
  firestore.rules      Locked staff-only rules (prototype — review before launch)
  storage.rules        Unused — binaries use Cloudflare R2
```

Local hub:

```bash
cd hub
npm install
npm run dev
```

Parity checklist: [docs/PARITY.md](docs/PARITY.md)  
Setup (GitHub / Vercel / Firebase): [SETUP.md](SETUP.md)

## Status

Hub is live: login, linen UI, CloudStore. **Invoices** is a native workspace (editor, customers, catalog, queue, history, reports, print look) — merged 21 Aug 2026. **Design** is a native workspace on `feat/design` (library, studio, print house; Wave A die-cut tools; live family faces; R2 art) — map [docs/DESIGN.md](docs/DESIGN.md). **Finance** is still a tool shell.

- **GitHub:** https://github.com/Jovo-Jovi/balance-bites-ops  
- **Vercel:** https://balance-bites-ops.vercel.app  

GitHub is code only — not the live database. Do not run the import script until you ask and have a zip of `saved data`. `balance-bites-ops.vercel.app` must stay on Firebase Auth → Authorized domains.

## License

Private. All rights reserved — Balance Bites.
