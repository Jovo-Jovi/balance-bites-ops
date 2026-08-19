# Setup — GitHub, Vercel, Firebase

This repo is **docs + future hub**. Live invoices, stock, and templates stay in `C:\Users\Marco\Desktop\costs` and:

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

Until there is an app, **do not deploy** (markdown-only would produce an empty site). After `npx create-next-app`, ask Cursor to run Vercel MCP `create_git_project` or:

```bash
cd C:\Users\Marco\Desktop\balance-bites-ops
npx vercel link --yes --scope jiovannys-projects-0219772b
```

Turn on **Vercel Authentication** (Deployment Protection) so the URL is not public. MCP: `update_project_deployment_protection`, or Dashboard → Project → Settings → Deployment Protection.

## 3. Firebase (Console — no MCP)

Do this in [Firebase Console](https://console.firebase.google.com/) while logged into the Google account that should own the project.

1. Create project, e.g. `balance-bites-ops`.
2. Enable **Google Analytics** only if you want it.
3. **Authentication → Sign-in method → Email/Password** (and Google later if needed).
4. **Firestore → Create database** (production mode, pick a region close to you, e.g. `europe-west`).
5. **Storage → Get started** (same region if prompted).
6. **Project settings → Your apps → Web** → register app `balance-bites-ops` → copy the `firebaseConfig` object.
7. Put those values in `.env.local` (never commit). Use `.env.example` as the shape.
8. Firestore rules: start locked (authenticated read/write only). Storage: authenticated upload under `label_assets/{uid}/`.
9. Optional CLI on this PC:

```bash
npm i -g firebase-tools
firebase login
firebase init
```

Skip `firebase init` until the Next.js app exists; Console steps 1–7 are enough to have a project ID.

## 4. What stays local until migrate

- Open HTML from `costs` (or the Desktop copies you already use).
- Connect **ربط المجلد** to `saved data`.
- Do not copy live JSON into this git repo.

## 5. After the hub is built

1. Copy or wrap the three HTML apps into this repo.
2. Point them at Firestore instead of the Desktop folder.
3. Run a one-time import of `saved data` JSON.
4. Keep `costs` as a rollback copy until you trust the cloud.
