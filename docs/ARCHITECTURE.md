# Architecture

Balance Bites is three products that must look like **one company system**: same tenant, same login, same records.

## Layers

```
┌─────────────────────────────────────────────┐
│  1. Hub UI   one URL · 3 cards · RTL shell  │
├─────────────────────────────────────────────┤
│  2. Apps     Invoices | Design | Finance    │
├─────────────────────────────────────────────┤
│  3. CloudStore SDK   same JSON keys as now  │
├─────────────────────────────────────────────┤
│  4. Firebase Auth + Firestore (Spark)       │
│     Cloudflare R2  label art + backups      │
├─────────────────────────────────────────────┤
│  5. Vercel    Next.js + static HTML/JS      │
├─────────────────────────────────────────────┤
│  6. GitHub    source code only              │
└─────────────────────────────────────────────┘
```

**Phase 1** was the launcher + CloudStore.  
**Invoices** and **Design** were rewritten as React in the hub (not HTML wraps). **Finance** still follows wrap-or-port from `costs/`. Maps: [INVOICES.md](INVOICES.md), [DESIGN.md](DESIGN.md). Studio Wave A in test: [DESIGN-STUDIO.md](DESIGN-STUDIO.md).

## Why this split

| Layer | Why it exists |
|---|---|
| Hub | One bookmark. Staff do not hunt three HTML files on the Desktop. |
| Apps | Invoice print, label prepress, and inventory math are different products. Do not merge them into one mega-page. |
| CloudStore | Today `Store.set` writes localStorage then a JSON file. CloudStore writes localStorage then Firestore. Same call sites. |
| Firebase | Documents match `bb_*.json`. Binaries go to Cloudflare R2 (Spark has no Storage). |
| Vercel | HTTPS, preview URLs, env vars, no Desktop path. |
| GitHub | Version the code. Never commit live invoices or customer lists. |

## Data flow today

```
User action
    → Store.set(key, value)
        → localStorage (immediate)
        → FileStore.writeKey  (folder, if connected)
```

Invoice Pro **writes** invoices and customers. Stock Costs **reads** them and **writes** inventory, purchases, recipes. Designer **writes** templates and art files.

If two HTML copies of the same app are open, last write wins. That is the main Desktop failure mode the cloud hub must fix (single tenant + optional conflict toast).

## Data flow after CloudStore

```
User action
    → Store.set(key, value)
        → localStorage (cache)
        → Firestore doc tenants/{tenant}/keys/{key}
        → other open tabs listen (onSnapshot)
```

Binary art:

```
Designer save PNG / SVG / font snippet
    → Cloudflare R2  tenants/{tenant}/label_assets/{templateId}/…
    → Firestore template record stores `__asset__:` / `__r2__:` refs, not huge base64
```

## Firebase vs Supabase

**v1: Firebase** (this project’s current shape)

- Every live file is already a JSON blob keyed like `bb_invoices`.
- Label designer stores images and print packs — Storage is the natural home.
- Two apps open at once need live sync — Firestore snapshots.
- Team is small; Auth allowlist is enough.

**Later: consider Supabase/Postgres if**

- You want SQL investor / P&L reports instead of client-side aggregation.
- You need row-level roles (accountant vs designer vs cashier).
- Invoice lines become first-class relational rows.

Do not run both databases in v1.

## Security (must-have before public URL)

- Firebase Auth (Google or email). Allowlist: Marco + named staff.
- Firestore rules: signed-in users in allowlist only; no public read.
- Storage rules: same.
- Vercel: optional Deployment Protection for preview URLs.
- App Check (later) so random sites cannot write your project.
- `.gitignore` live JSON, `.env`, service-account JSON.

## Environments

| Env | URL | Data |
|---|---|---|
| Local HTML | `file://` | Desktop `saved data` |
| Hub local | `localhost:3000` | same Firebase tenant as production |
| Preview | `*.vercel.app` | Firebase project `balance-bites-ops` |
| Production | https://balance-bites-ops.vercel.app | same Firebase project (staff Auth) |

Never point production HTML at the Desktop folder.

## What we will not do in v1

- Rewrite finance formulas into a backend (keep client ledger; sync the JSON).
- Public customer portal.
- Multi-company SaaS.
- Putting secrets in the repo.
