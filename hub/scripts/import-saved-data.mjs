/**
 * One-shot import: Desktop `saved data` JSON → Firestore tenants/{tid}/keys/{key}.
 *
 * Do NOT run until the owner asks. Zip `saved data` first and keep the zip offline.
 *
 *   cd hub
 *   npm i -D firebase-admin
 *   npm run import:dry -- --dir "C:\Users\Marco\Desktop\BALANCE BITES\invoices customers\saved data"
 *   npm run import:apply -- --dir "..."   # writes
 *
 * Auth: hub/.service-account.json (gitignored), or --sa path, or GOOGLE_APPLICATION_CREDENTIALS.
 * Re-run --apply anytime to refresh Firestore from the Desktop folder.
 *
 * Assets: label_assets/ and bb_backups/ stay on Desktop (Spark has no Storage).
 * Do not pass --assets.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const keyManifest = JSON.parse(
  await readFile(new URL("../src/lib/bb-keys.json", import.meta.url), "utf8"),
);

const WARN_BYTES = 900 * 1024;
const DEFAULT_DIR =
  "C:\\Users\\Marco\\Desktop\\BALANCE BITES\\invoices customers\\saved data";

function parseArgs(argv) {
  const out = {
    apply: false,
    assets: false,
    dir: DEFAULT_DIR,
    tenant: keyManifest.tenantId,
    sa: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--dry-run") out.apply = false;
    else if (a === "--assets") {
      console.error(
        "--assets is disabled: this project stays on Spark (no Cloud Storage).\nKeep label_assets/ and bb_backups/ in the Desktop saved data folder.",
      );
      process.exit(1);
    }
    else if (a === "--dir") out.dir = argv[++i];
    else if (a === "--tenant") out.tenant = argv[++i];
    else if (a === "--sa") out.sa = argv[++i];
  }
  return out;
}

function loadAdmin() {
  try {
    return {
      app: require("firebase-admin/app"),
      firestore: require("firebase-admin/firestore"),
    };
  } catch {
    console.error("firebase-admin is not installed. From hub/: npm i -D firebase-admin");
    process.exit(1);
  }
}

function firebaseToolsRefreshJson() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const candidates = [
    join(home, ".config", "configstore", "firebase-tools.json"),
    join(home, "AppData", "Roaming", "configstore", "firebase-tools.json"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const cfg = JSON.parse(readFileSync(p, "utf8"));
    const tokens = cfg.tokens || cfg.user?.tokens || null;
    if (!tokens?.refresh_token || !tokens.client_id || !tokens.client_secret) continue;
    return {
      type: "authorized_user",
      client_id: tokens.client_id,
      client_secret: tokens.client_secret,
      refresh_token: tokens.refresh_token,
    };
  }
  return null;
}

function listJsonKeys(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("bbLabel-"))
    .map((name) => ({
      file: name,
      key: name.replace(/\.json$/i, ""),
      path: join(dir, name),
      bytes: statSync(join(dir, name)).size,
    }));
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else acc.push({ path: p, rel: p.slice(dir.length + 1).replaceAll("\\", "/"), bytes: st.size });
  }
  return acc;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!existsSync(opts.dir)) {
    console.error("saved data folder not found:", opts.dir);
    process.exit(1);
  }
  if (!opts.sa) {
    const localSa = join(process.cwd(), ".service-account.json");
    if (existsSync(localSa)) opts.sa = localSa;
  }

  const known = new Set(keyManifest.firestoreKeys);
  const files = listJsonKeys(opts.dir);
  const legacy = readdirSync(opts.dir).filter((n) => /^bbLabel-.*\.json$/i.test(n));

  console.log(opts.apply ? "MODE: APPLY (writes Firestore)" : "MODE: DRY-RUN (no writes)");
  console.log("dir:", opts.dir);
  console.log("tenant:", opts.tenant);
  console.log("");

  for (const f of files) {
    const inManifest = known.has(f.key);
    const warn = f.bytes > WARN_BYTES ? "  ⚠ near 1 MiB" : "";
    console.log(
      `${inManifest ? "OK " : "SKIP unknown"}  ${f.key.padEnd(28)} ${(f.bytes / 1024).toFixed(1)} KB${warn}`,
    );
    if (inManifest) {
      const raw = readFileSync(f.path, "utf8").trim();
      if (!raw) {
        console.log("  skip empty file");
        continue;
      }
      JSON.parse(raw);
    }
  }

  const extras = keyManifest.firestoreKeys.filter(
    (k) => !files.some((f) => f.key === k),
  );
  if (extras.length) {
    console.log("\nKeys in manifest with no file (will not create docs):");
    extras.forEach((k) => console.log("  ", k));
  }

  console.log("\nLegacy bbLabel-*.json (not Firestore keys; import in Design later):");
  legacy.slice(0, 8).forEach((n) => console.log("  ", n));
  if (legacy.length > 8) console.log("  …", legacy.length - 8, "more");

  const assetsDir = join(opts.dir, "label_assets");
  const backupsDir = join(opts.dir, "bb_backups");
  const assets = walkFiles(assetsDir);
  const backups = walkFiles(backupsDir);
  console.log(`\nlabel_assets files: ${assets.length} (stay on Desktop — no Cloud Storage)`);
  console.log(`bb_backups files: ${backups.length} (stay on Desktop — no Cloud Storage)`);
  console.log("not imported:", keyManifest.storageOnlyKeys.join(", "));

  if (!opts.apply) {
    console.log("\nDry-run complete. Re-run with --apply to overwrite Firestore from this folder.");
    return;
  }

  const admin = loadAdmin();
  let credential;
  if (opts.sa) {
    credential = admin.app.cert(opts.sa);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.app.applicationDefault();
  } else {
    const refresh = firebaseToolsRefreshJson();
    if (!refresh) {
      console.error(
        "No Google credentials. Pass --sa path\\to\\serviceAccount.json\nor keep firebase-tools logged in on this machine and retry.",
      );
      process.exit(1);
    }
    credential = admin.app.refreshToken(refresh);
  }
  const firebaseApp = admin.app.initializeApp({
    credential,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "balance-bites-ops",
  });
  const db = admin.firestore.getFirestore(firebaseApp);
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const f of files) {
    if (!known.has(f.key)) continue;
    const raw = readFileSync(f.path, "utf8").trim();
    if (!raw) {
      console.log("skip empty", f.key);
      continue;
    }
    const data = JSON.parse(raw);
    const ref = db.doc(`tenants/${opts.tenant}/keys/${f.key}`);
    await ref.set({
      data,
      updatedAt: now,
      updatedBy: "import-script",
      clientWriteId: `import_${Date.now()}_${f.key}`.slice(0, 80),
    });
    console.log("wrote", f.key);
  }

  console.log("\nImport finished (JSON keys only). Confirm in Firebase Console before using production.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
