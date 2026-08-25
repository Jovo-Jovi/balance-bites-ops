import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  isAllowedStorageKey,
  LABEL_ASSETS_PREFIX,
  normalizeStorageKey,
} from "../storage-paths";

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
  const raw = (process.env.R2_JURISDICTION || "default").trim().toLowerCase();
  const jurisdiction: R2Config["jurisdiction"] =
    raw === "us" || raw === "eu" ? raw : "default";
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
    forcePathStyle: true,
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

export async function listR2Prefix(prefix = LABEL_ASSETS_PREFIX, max = 400) {
  const cfg = readR2Config();
  if (!cfg) throw new Error("Cloudflare R2 is not configured");
  const keyPrefix = normalizeStorageKey(prefix);
  if (!keyPrefix.startsWith(LABEL_ASSETS_PREFIX)) {
    throw new Error("مسار تخزين غير مسموح");
  }
  const client = getR2Client(cfg);
  const items: { key: string; size: number }[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: keyPrefix,
        ContinuationToken: token,
        MaxKeys: 100,
      }),
    );
    for (const obj of res.Contents || []) {
      if (!obj.Key) continue;
      items.push({ key: obj.Key, size: Number(obj.Size || 0) });
      if (items.length >= max) return items;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return items;
}

export async function deleteR2Prefix(prefix: string) {
  let removed = 0;
  for (;;) {
    const batch = await listR2Prefix(prefix, 100);
    if (!batch.length) return removed;
    for (const it of batch) {
      await deleteR2Object(it.key);
      removed += 1;
    }
    if (batch.length < 100) return removed;
  }
}
