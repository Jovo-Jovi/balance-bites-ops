# Start a new Cursor project (cloud hub)

Use this when you open **this folder** as a fresh Cursor window. Live apps stay in `costs` until migrate.

GitHub is already created: https://github.com/Jovo-Jovi/balance-bites-ops

---

## Human steps (do these first)

### 1. Open the cloud folder in Cursor

1. Cursor → **File → Open Folder**
2. Choose: `C:\Users\Marco\Desktop\balance-bites-ops`
3. Do **not** open `costs` as the project root. That folder is the live HTML system.

### 2. Add the live apps as a second workspace folder (read-only reference)

Still in the new window:

1. **File → Add Folder to Workspace…**
2. Add: `C:\Users\Marco\Desktop\costs`
3. Optional third folder (schema + import later, **never git-add**):  
   `C:\Users\Marco\Desktop\BALANCE BITES\invoices customers\saved data`

Save the workspace if Cursor asks (`balance-bites-ops.code-workspace`).

You now have:

| Folder | Role in the new chat |
|---|---|
| `balance-bites-ops` | Write the new Next.js hub here; this is the git repo |
| `costs` | Source of truth for **features and modules** (HTML/JS) |
| `saved data` | Source of truth for **JSON shapes and live records** (import later) |

### 3. Agent mode

1. Switch to **Agent** (not Ask).
2. Attach (type `@`) at least:
   - `@CURSOR-KICKOFF.md` or `@AGENT-PROMPT.md`
   - `@docs/MODULES.md`
   - `@docs/DATA.md`
   - `@docs/ARCHITECTURE.md`
   - `@docs/CLOUD-PLAN.md`
   - `@docs/BRAND-UI.md`
   - `@docs/INVOICES.md`
   - `@docs/DESIGN.md`
   - `@docs/JOURNAL.md`
   - `@SETUP.md`
3. Also attach from `costs` (after step 2):
   - `@bb-stock-costs.html`
   - `@balance-bites-invoice-pro.html`
   - `@balance-bites-sticker.html`
   - `@report.md`
4. Paste the full prompt from [AGENT-PROMPT.md](AGENT-PROMPT.md).

### 4. Accounts (can run in parallel with coding)

Do these in the browser while the agent scaffolds. Details: [SETUP.md](SETUP.md).

| What | Where | Status |
|---|---|---|
| GitHub private repo | already `Jovo-Jovi/balance-bites-ops` | Done |
| Firebase project + Auth + Firestore + Storage + web config | [console.firebase.google.com](https://console.firebase.google.com/) | **You** |
| `.env.local` from `.env.example` | this repo | **You** after Firebase |
| Vercel project | after Next.js exists | Ask the agent / MCP |
| Vercel Deployment Protection | dashboard | **You** |

Cursor Origin is not used on Windows. Stay on GitHub.

### 5. Until cutover

Keep using the HTML files in `costs` (or the Desktop copies you already open) with **ربط المجلد** on `saved data`. The new app must not overwrite live JSON until you run a planned import.

---

## What the agent must not do

- Do not `git init` inside `costs`.
- Do not commit `saved data`, `.env.local`, or Firebase service accounts.
- Do not delete or “clean up” the live HTML in `costs`.
- Do not invent a new stock formula. Match `getDisplayStock` / ledger: **purchases − invoice BOM usage**.
- Do not deploy a public URL before Auth + Firestore rules.
