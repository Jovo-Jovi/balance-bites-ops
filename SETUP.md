# Setup — GitHub, Vercel, Firebase

This repo is **docs + the Next.js hub** (`hub/`). Live invoices, stock, and templates stay in `C:\Users\Marco\Desktop\costs` and:

`C:\Users\Marco\Desktop\BALANCE BITES\invoices customers\saved data`

until a planned migrate.

## Already done from Cursor

- New folder: `C:\Users\Marco\Desktop\balance-bites-ops`
- Cloud docs moved here (out of `costs`)
- GitHub private repo created as **Jovo-Jovi/balance-bites-ops** (see README after push)
- Vercel team discovered: **jiovanny's projects** (`team_axcyEdkIz5RpW3pHt9gtuWuq`)

Cursor Origin (`origin.cursor.com`) is **not used**: native Windows cannot run the Origin CLI. GitHub is the host.

## 1. GitHub (CLI — done if push succeeded)

If you clone on another machine:

```bash
gh repo clone Jovo-Jovi/balance-bites-ops
```

Optional: in the GitHub repo **Settings → Collaborators**, add anyone who should see the private code. Do not add the `saved data` folder.

## 2. Vercel (MCP after the GitHub repo exists)

When the Next.js hub exists, link the GitHub repo:

- Team: `jiovanny's projects` / `team_axcyEdkIz5RpW3pHt9gtuWuq`
- Project name: `balance-bites-ops`
- Repo: `Jovo-Jovi/balance-bites-ops`

The Next.js app lives in `hub/`. Firestore rules are published. A **protected** Vercel deploy is allowed for testing (Vercel Authentication on). Do not make the URL public. Do not run JSON import until asked.

When you are ready for a **protected preview**:

- Vercel Root Directory: `hub`
- Team: `jiovanny's projects` / `team_axcyEdkIz5RpW3pHt9gtuWuq`
- Project name: `balance-bites-ops`
- Copy `hub/.env.example` → Vercel env (Preview + Production)

```bash
cd C:\Users\Marco\Desktop\balance-bites-ops\hub
npx vercel link --yes --scope jiovannys-projects-0219772b
```

Live URL after the first deploy: https://balance-bites-ops.vercel.app  

Add that host (and later any custom domain) in Firebase Console → Authentication → Settings → Authorized domains, or email/Google login fails with `auth/unauthorized-domain`.

To auto-deploy on `git push`, connect the private GitHub repo in Vercel → Project → Settings → Git (the GitHub App must be allowed to see `Jovo-Jovi/balance-bites-ops`).

## 3. Firebase (Console — no MCP)

Do this in [Firebase Console](https://console.firebase.google.com/) while logged into the Google account that should own the project.

1. Create project, e.g. `balance-bites-ops`.
2. Enable **Google Analytics** only if you want it.
3. **Authentication → Sign-in method → Email/Password** (and Google later if needed).
4. **Firestore → Create database** (production mode, pick a region close to you, e.g. `europe-west`).
5. **Skip Firebase Storage.** Stay on the **Spark (free) plan**. Do not upgrade to Blaze. Label art and folder backups use **Cloudflare R2** (see §6).
6. **Project settings → Your apps → Web** → register app `balance-bites-ops` → copy the `firebaseConfig` object.
7. Put those values in `hub/.env.local` (never commit). Use `hub/.env.example` as the shape.
8. **Allowlist:** after you create your Auth user, add Firestore doc `staff/{uid}` with `{ "email": "...", "role": "owner" }`. The app cannot create this document (prevents self-promotion).
9. Publish rules from this repo (edit `.firebaserc` if your project id differs):

```bash
cd C:\Users\Marco\Desktop\balance-bites-ops
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use
npx -y firebase-tools@latest deploy --only firestore:rules
```

Rules file: `firestore.rules` (staff-only; no public read). Review them before a broad launch. `storage.rules` is unused — binaries go to Cloudflare R2, not Firebase Storage.

10. Optional: enable Google sign-in in Console and add `localhost` (and later the Vercel domain) under Authentication → Settings → Authorized domains. Without the Vercel host, login on the live URL fails with `auth/unauthorized-domain`.

Do **not** run a full `hub` import of every `bb_*` key until you zip `saved data` and explicitly ask. **2026-08-22:** Desktop JSON keys were applied (zip `C:\Users\Marco\Desktop\bb-saved-data-2026-08-22.zip`, not git). npm steals `--keys`; use `node scripts/import-saved-data.mjs --apply --only=bb_invoices,bb_customers`. Dry-run: `cd hub && npm run import:dry`.

## 4. Cloudflare R2 (label art + backups)

R2 is okay for this project: **10 GB + 1M writes + 10M reads / month free**, no egress fee, S3 API, and it does **not** require Firebase Blaze. Live `label_assets/` is ~22 MB.

Cloudflare may ask you to add a payment method to *enable* R2 even if you stay inside the free tier. Create a bucket named `balance-bites-ops`. A new account S3 endpoint can take about 20 minutes before TLS works.

1. Log in at [dash.cloudflare.com](https://dash.cloudflare.com/) → **R2 Object Storage**.
2. Purchase / enable R2 if the dashboard asks (free-tier usage still applies).
3. **Create bucket** named `balance-bites-ops`. If the S3 endpoint is `https://<account>.r2.cloudflarestorage.com` (no `.eu.`), set `R2_JURISDICTION=default`. Use `eu` only when the endpoint host is `.eu.r2.cloudflarestorage.com`.
4. **Manage R2 API Tokens** → Create token with **Object Read & Write** on that bucket only.
5. Copy **Account ID**, **Access Key ID**, and **Secret Access Key** into `hub/.env.local` (`R2_*` keys in `.env.example`). Set `NEXT_PUBLIC_BB_USE_STORAGE=true`.
6. Same values in Vercel → Project → Settings → Environment Variables (Preview + Production). Never prefix R2 secrets with `NEXT_PUBLIC_`.
7. From `hub/`: `npm run storage:init` (checks the bucket and sets GET CORS). If this fails with an SSL handshake error, wait ~20 minutes and retry — Cloudflare is still provisioning the account endpoint certificate.
8. When you want binaries in the cloud: `npm run import:assets -- --sa "C:\Users\Marco\Desktop\<service-account>.json"`

Object keys:

`tenants/balance-bites/label_assets/{templateId}/…`  
`tenants/balance-bites/bb_backups/…`

Uploads go through `/api/storage/object` (staff Firebase token required). The bucket stays private.

## 5. What stays local until migrate

- Open HTML from `costs` (or the Desktop copies you already use).
- Connect **ربط المجلد** to `saved data`.
- Do not copy live JSON into this git repo.

## 6. After the hub is built

1. Invoices and Design are **native** hub workspaces. Do not wrap their HTML into `hub/public/apps/`. Maps: [docs/INVOICES.md](docs/INVOICES.md), [docs/DESIGN.md](docs/DESIGN.md). What shipped: [docs/JOURNAL.md](docs/JOURNAL.md). Finance is still a shell until that slice.
2. Run a one-time import of `saved data` JSON **only when you say so**.
3. Keep `costs` as a rollback copy until you trust the cloud.
