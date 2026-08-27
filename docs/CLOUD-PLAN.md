# Cloud plan — GitHub, Vercel, Firebase

Goal: **one HTTPS URL**. After login, three cards: Invoices, Design (stickers), Finance & Inventory (costs). All apps share one online database.

Firebase is the v1 database (see [ARCHITECTURE.md](ARCHITECTURE.md)). There is **no Firebase MCP** in Cursor; use Firebase Console + CLI. **Vercel MCP** can create the project and deploy once you sign in. **GitHub** holds code.

## Accounts to prepare

1. GitHub account (private repo).
2. Vercel account — sign in the Vercel Cursor plugin (`needsAuth` until you do).
3. Google Firebase project (Blaze only if you exceed Spark; start Spark).
4. Domain (optional): e.g. `app.balancebites.eg` later.

## Phase 0 — Docs (done in this folder)

- [x] README
- [x] Architecture, modules, data, brand, this plan

## Phase 1 — GitHub repo

Do this when you say “create the repo”. Suggested name: `balance-bites-ops`.

1. `git init` in `costs` (or a new `apps/hub` monorepo that copies the HTML).
2. `.gitignore`: `saved data`, `*.json` live dumps, `.env`, `serviceAccount*.json`, `node_modules`, `.vercel`.
3. Commit README + docs + HTML/JS/assets (no live customer JSON).
4. Create **private** GitHub repo and push `main`.
5. Do **not** upload the Desktop `saved data` folder to GitHub.

MCP: GitLens can commit/push after the remote exists. Repo **create** is GitHub website or `gh repo create` in the terminal.

## Phase 2 — Hub app (Next.js) + Vercel

**Shipped:** hub at `hub/` (Vercel root `hub`). Invoices native React on `main`. Design Waves A–D on `main` ([DESIGN.md](DESIGN.md)). Finance Waves A–E on `feat/finance` ([FINANCE.md](FINANCE.md)). HTML wrap into `public/` was **not** used.

1. Scaffold Next.js (App Router) in repo root `hub/`.
2. Home `/` : login gate + **three cards** (RTL).
   - `/invoices` → native Invoice app
   - `/design` → native Design app (library / studio / print house)
   - `/finance` → native Finance app (eight tools)
3. Env: `NEXT_PUBLIC_FIREBASE_*` and R2 keys on Vercel (`NEXT_PUBLIC_BB_USE_STORAGE` for label art).
4. MCP after Vercel login (already done for this repo):
   - `list_teams` → get `teamId`
   - `create_git_project` with `repo: owner/balance-bites-ops`, `projectName: balance-bites-ops`, `teamId`
   - Preview URL is the first “one URL”

Protect previews with Vercel Authentication so the HTML is not public before Firebase rules exist.

## Phase 3 — Firebase project

In Firebase Console (not MCP):

1. Create project `balance-bites-ops`.
2. Enable **Authentication** → Google (and Email if you want).
3. Enable **Firestore** (production mode → then paste rules). Do **not** enable Firebase Storage on Spark — binaries use Cloudflare R2.
4. Add a Web app; copy config into Vercel env.
5. Allowlist emails in a `staff/{uid}` doc or Auth blocking function.

### Firestore shape (v1, lift JSON as-is)

```
tenants/balance-bites
  keys/bb_invoices          { data: [...], updatedAt, updatedBy }
  keys/bb_customers
  keys/bb_products
  keys/bb_materials
  keys/bb_packages
  keys/bb_stickers
  keys/bb_purchases
  keys/bb_recipes
  keys/bb_label_templates
  …one doc per existing JSON key
```

Keep the blob in `data` so CloudStore is a drop-in for `FileStore.writeKey`. Split into subcollections later if documents hit 1 MB (invoices + templates are the risk).

### Object storage (R2, not Firebase Storage)

```
tenants/balance-bites/label_assets/{templateId}/
tenants/balance-bites/bb_backups/{filename}.json
```

Binaries are **Cloudflare R2** (S3 API), not Firebase Storage.

### Rules (sketch)

```
match /tenants/{tid}/keys/{key} {
  allow read, write: if request.auth != null && isStaff();
}
```

## Phase 4 — CloudStore (replace FileStore)

In all three HTML apps:

1. Native `CloudStore` in the hub (Firebase JS SDK). Do **not** add `public/bb-cloud-store.js` — that file was removed (T13); its `Store.remove` cleared localStorage only.
2. `Store.set` → Firestore `set` with merge + `updatedAt`.
3. On load: `getDoc` then `onSnapshot` to refresh other tabs.
4. Keep FileStore behind a flag `USE_FOLDER=false` for emergency Desktop use.
5. **Import once:** a script reads the Desktop JSON files and writes Firestore. Take a zip backup of `saved data` first.
6. Conflict: if `updatedAt` is newer than the tab’s last write, toast and reload that key — do not silent-overwrite.

## Phase 5 — Auth on the hub

1. Hub login page before cards.
2. After Auth, set a cookie/session; HTML apps read `firebase.auth().currentUser`.
3. If not signed in, redirect to `/`.
4. Only then turn off Vercel Authentication (or keep it as a second gate).

## Phase 6 — Cut over

1. Import production JSON → `bb-prod`.
2. Open only the Vercel URL (bookmark it).
3. Stop using Desktop HTML as the daily driver.
4. Keep the folder as a **cold backup** for 30 days (`FileStore` export button).

## Phase 7 — Hardening

- Automated nightly export of all `keys/*` to Storage
- App Check
- Custom domain
- Optional: year-shard `bb_invoices` (`bb_invoices_2026`, …) when the 1 MiB document ceiling is near (~730 typical invoices). After T7 CAS only — see [DATA.md](DATA.md) T14. Not `invoices/{id}`.

## MCP checklist (when you say go)

| Step | Tool | Status in this workspace |
|---|---|---|
| Write docs | files | Done |
| Create GitHub repo | `gh` / website | Waiting for your go |
| Vercel login | Vercel MCP `mcp_auth` | Plugin **needsAuth** |
| List Vercel team | `list_teams` | After login |
| Link git → Vercel | `create_git_project` | After repo URL + teamId |
| Deploy | `deploy_to_vercel` | After hub exists |
| Firebase | Console + CLI | No MCP |
| Supabase | skip v1 | MCP present but unused |

## Risks

- **Quota:** Firestore 1 MB per document. Large invoice history or fat templates must be split or stored in Storage.
- **localStorage vs cloud:** first load must prefer Firestore, not an empty localStorage overwrite.
- **Two writers:** Invoice Pro and Stock Costs both touch payments/products — same as today; CloudStore must `set` the whole key or use transactions.
- **PII:** invoices and customers online — private repo + Auth is mandatory before a public URL.
