import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";

export function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export function r2ConfigFromEnv() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || "";
  const bucket = process.env.R2_BUCKET?.trim() || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
  const raw = (process.env.R2_JURISDICTION || "default").trim().toLowerCase();
  const jurisdiction = raw === "us" || raw === "eu" ? raw : "default";
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;
  const host =
    jurisdiction === "eu"
      ? `${accountId}.eu.r2.cloudflarestorage.com`
      : jurisdiction === "us"
        ? `${accountId}.us.r2.cloudflarestorage.com`
        : `${accountId}.r2.cloudflarestorage.com`;
  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    jurisdiction,
    endpoint: `https://${host}`,
  };
}

export function createR2Client() {
  const cfg = r2ConfigFromEnv();
  if (!cfg) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in hub/.env.local",
    );
  }
  return {
    cfg,
    client: new S3Client({
      region: "auto",
      endpoint: cfg.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    }),
  };
}

export function guessContentType(name) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".svg")) return "image/svg+xml";
  if (n.endsWith(".json")) return "application/json";
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".woff2")) return "font/woff2";
  if (n.endsWith(".woff")) return "font/woff";
  if (n.endsWith(".ttf")) return "font/ttf";
  if (n.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}
