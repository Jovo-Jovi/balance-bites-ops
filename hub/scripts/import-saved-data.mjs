/**
 * One-shot import: Desktop `saved data` JSON → Firestore tenants/{tid}/keys/{key}.
 *
 * Do NOT run until the owner asks. Zip `saved data` first and keep the zip offline.
 *
 *   cd hub
 *   npm i -D firebase-admin
 *   npm run import:dry -- --dir "C:\Users\Marco\Desktop\BALANCE BITES\invoices customers\saved data"
 *   npm run import:apply -- --dir "..."   # writes
 *   npm run import:apply -- --keys bb_label_templates --assets --no-backups
 *     # Design-only: exact saved templates + label_assets to R2 (not git)
 *
 * Auth: hub/.service-account.json (gitignored), or --sa path, or GOOGLE_APPLICATION_CREDENTIALS.
 * Re-run --apply anytime to refresh Firestore from the Desktop folder.
 *
 * Assets: pass --assets after Cloudflare R2 is configured in hub/.env.local
 * to upload label_assets/ and bb_backups/ (not Firebase Storage / not Blaze).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  createR2Client,
  guessContentType,
  loadEnvLocal,
} from "./r2-shared.mjs";

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
    noBackups: false,
    keys: null,
    dir: DEFAULT_DIR,
    tenant: keyManifest.tenantId,
    sa: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--dry-run") out.apply = false;
    else if (a === "--assets") out.assets = true;
    else if (a === "--no-backups") out.noBackups = true;
    else if (a === "--keys") {
      out.keys = String(argv[++i] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === "--dir") out.dir = argv[++i];
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

const FIREBASE_CLI_OAUTH = {
  client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
  client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
};

function openFirestore(projectId, opts) {
  const admin = loadAdmin();
  if (opts.sa) {
    const firebaseApp = admin.app.initializeApp({
      credential: admin.app.cert(opts.sa),
      projectId,
    });
    return {
      db: admin.firestore.getFirestore(firebaseApp),
      now: admin.firestore.FieldValue.serverTimestamp(),
    };
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const firebaseApp = admin.app.initializeApp({
      credential: admin.app.applicationDefault(),
      projectId,
    });
    return {
      db: admin.firestore.getFirestore(firebaseApp),
      now: admin.firestore.FieldValue.serverTimestamp(),
    };
  }
  const refresh = firebaseToolsRefreshJson();
  if (!refresh) {
    console.error(
      "No Google credentials. Pass --sa path\\to\\serviceAccount.json\nor keep firebase-tools logged in on this machine and retry.",
    );
    process.exit(1);
  }
  const { Firestore, FieldValue } = require("@google-cloud/firestore");
  const db = new Firestore({
    projectId,
    credentials: {
      type: "authorized_user",
      client_id: refresh.client_id,
      client_secret: refresh.client_secret,
      refresh_token: refresh.refresh_token,
    },
  });
  return { db, now: FieldValue.serverTimestamp() };
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
    if (!tokens?.refresh_token) continue;
    return {
      type: "authorized_user",
      client_id: tokens.client_id || FIREBASE_CLI_OAUTH.client_id,
      client_secret: tokens.client_secret || FIREBASE_CLI_OAUTH.client_secret,
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

function walkFiles(dir, acc = [], root = dir) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc, root);
    else {
      acc.push({
        path: p,
        rel: p.slice(root.length + 1).replaceAll("\\", "/"),
        bytes: st.size,
      });
    }
  }
  return acc;
}

async function main() {
  loadEnvLocal();
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

  const wantKeys = opts.keys ? new Set(opts.keys) : null;
  if (wantKeys) {
    console.log("keys filter:", [...wantKeys].join(", "));
  }

  const assetsDir = join(opts.dir, "label_assets");
  const backupsDir = join(opts.dir, "bb_backups");
  const assets = walkFiles(assetsDir);
  const backups = opts.noBackups ? [] : walkFiles(backupsDir);
  console.log(`\nlabel_assets files: ${assets.length}`);
  console.log(`bb_backups files: ${backups.length}`);
  console.log("not imported:", keyManifest.storageOnlyKeys.join(", "));
  if (opts.assets) {
    console.log("assets: will upload to Cloudflare R2 after JSON keys");
  } else {
    console.log("assets: skipped (pass --assets when R2 is configured)");
  }

  if (!opts.apply) {
    console.log("\nDry-run complete. Re-run with --apply to overwrite Firestore from this folder.");
    return;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "balance-bites-ops";
  const { db, now } = openFirestore(projectId, opts);

  for (const f of files) {
    if (!known.has(f.key)) continue;
    if (wantKeys && !wantKeys.has(f.key)) continue;
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

  if (opts.assets) {
    const { cfg, client } = createR2Client();
    const tenant = opts.tenant;
    const uploads = [
      ...assets.map((f) => ({
        key: `tenants/${tenant}/label_assets/${f.rel}`,
        path: f.path,
      })),
      ...backups.map((f) => ({
        key: `tenants/${tenant}/bb_backups/${f.rel}`,
        path: f.path,
      })),
    ];
    console.log(`\nUploading ${uploads.length} files to R2 bucket ${cfg.bucket}…`);
    for (const u of uploads) {
      const body = readFileSync(u.path);
      await client.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: u.key.replaceAll("\\", "/"),
          Body: body,
          ContentType: guessContentType(u.path),
        }),
      );
      console.log("uploaded", u.key.replaceAll("\\", "/"));
    }
  }

  console.log("\nImport finished. Confirm in Firebase Console before using production.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
