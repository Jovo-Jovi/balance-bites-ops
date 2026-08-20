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

Turn on **Vercel Authentication** (Deployment Protection) so the URL is not public. MCP: `update_project_deployment_protection`, or Dashboard → Project → Settings → Deployment Protection.

## 3. Firebase (Console — no MCP)

Do this in [Firebase Console](https://console.firebase.google.com/) while logged into the Google account that should own the project.

1. Create project, e.g. `balance-bites-ops`.
2. Enable **Google Analytics** only if you want it.
3. **Authentication → Sign-in method → Email/Password** (and Google later if needed).
4. **Firestore → Create database** (production mode, pick a region close to you, e.g. `europe-west`).
5. **Skip Storage.** This project stays on the **Spark (free) plan**. Do not upgrade. Label art (`label_assets/`) and `bb_backups/` stay in the Desktop `saved data` folder. Auth + Firestore are enough for the hub, invoices, and finance JSON.
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

Rules file: `firestore.rules` (staff-only; no public read). Review them before a broad launch. `storage.rules` is unused while Spark has no Cloud Storage.

10. Optional: enable Google sign-in in Console and add `localhost` (and later the Vercel domain) under Authentication → Settings → Authorized domains. Without the Vercel host, login on the live URL fails with `auth/unauthorized-domain`.

Do **not** run `hub` import (`npm run import:apply`) until you zip `saved data` and explicitly ask. Dry-run: `cd hub && npm run import:dry`.

## 4. What stays local until migrate

- Open HTML from `costs` (or the Desktop copies you already use).
- Connect **ربط المجلد** to `saved data`.
- Do not copy live JSON into this git repo.

## 5. After the hub is built

1. Wrap the three HTML apps into `hub/public/apps/` (see [docs/PARITY.md](docs/PARITY.md)).
2. Point them at CloudStore (`hub/public/bb-cloud-store.js`) instead of the Desktop folder.
3. Run a one-time import of `saved data` JSON **only when you say so**.
4. Keep `costs` as a rollback copy until you trust the cloud.
