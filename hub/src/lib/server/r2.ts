import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isAllowedStorageKey, normalizeStorageKey } from "../storage-paths";

export type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  jurisdiction: "default" | "eu" | "us";
};

export function readR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || "";
  const bucket = process.env.R2_BUCKET?.trim() || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
  const raw = (process.env.R2_JURISDICTION || "eu").trim().toLowerCase();
  const jurisdiction: R2Config["jurisdiction"] =
    raw === "us" || raw === "default" ? raw : "eu";
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey, jurisdiction };
}

export function isR2Configured() {
  return Boolean(readR2Config());
}

export function r2Endpoint(cfg: R2Config) {
  if (cfg.jurisdiction === "eu") {
    return `https://${cfg.accountId}.eu.r2.cloudflarestorage.com`;
  }
  if (cfg.jurisdiction === "us") {
    return `https://${cfg.accountId}.us.r2.cloudflarestorage.com`;
  }
  return `https://${cfg.accountId}.r2.cloudflarestorage.com`;
}

export function getR2Client(cfg = readR2Config()) {
  if (!cfg) {
    throw new Error("Cloudflare R2 is not configured");
  }
  return new S3Client({
    region: "auto",
    endpoint: r2Endpoint(cfg),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export function requireObjectKey(raw: string) {
  const key = normalizeStorageKey(raw);
  if (!isAllowedStorageKey(key)) {
    throw new Error("مسار تخزين غير مسموح");
  }
  return key;
}

export async function putR2Object(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}) {
  const cfg = readR2Config();
  if (!cfg) throw new Error("Cloudflare R2 is not configured");
  const key = requireObjectKey(opts.key);
  await getR2Client(cfg).send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType || "application/octet-stream",
    }),
  );
  return key;
}

export async function deleteR2Object(key: string) {
  const cfg = readR2Config();
  if (!cfg) throw new Error("Cloudflare R2 is not configured");
  await getR2Client(cfg).send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: requireObjectKey(key),
    }),
  );
}

export async function signedR2GetUrl(key: string, expiresIn = 900) {
  const cfg = readR2Config();
  if (!cfg) throw new Error("Cloudflare R2 is not configured");
  const client = getR2Client(cfg);
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: requireObjectKey(key),
    }),
    { expiresIn },
  );
}
