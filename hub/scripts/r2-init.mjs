/**
 * Apply CORS on the R2 bucket so signed GETs work from the hub origin
 * (canvas/composite in Design). Uploads go through Next.js, so they do not
 * need CORS.
 *
 *   cd hub
 *   npm run storage:init
 *
 * A brand-new R2 account endpoint can take ~20 minutes before TLS works
 * (`<account>.r2.cloudflarestorage.com`). If HeadBucket fails with SSL
 * handshake, wait and retry.
 *
 * Western Europe (WEUR) is a location hint, not the EU jurisdiction.
 * Use R2_JURISDICTION=default with https://<account>.r2.cloudflarestorage.com
 * unless the dashboard S3 URL includes `.eu.`.
 */
import { PutBucketCorsCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { createR2Client, loadEnvLocal } from "./r2-shared.mjs";

loadEnvLocal();

const { cfg, client } = createR2Client();
try {
  await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
} catch (err) {
  const code = err?.code || err?.cause?.code || err?.name || "";
  const msg = err instanceof Error ? err.message : String(err);
  if (code === "EPROTO" || /handshake failure/i.test(msg)) {
    console.error(
      "R2 S3 TLS is not ready for this account endpoint yet (common for a new bucket/account, ~20 min).",
    );
    console.error("Host:", cfg.endpoint);
    console.error("Wait, then run npm run storage:init again.");
    process.exit(1);
  }
  throw err;
}

await client.send(
  new PutBucketCorsCommand({
    Bucket: cfg.bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag", "Content-Type"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

console.log("R2 bucket reachable:", cfg.bucket);
console.log("CORS applied for localhost and Vercel hosts.");
console.log("Jurisdiction:", cfg.jurisdiction);
console.log("Endpoint:", cfg.endpoint);
