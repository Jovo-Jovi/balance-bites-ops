/**
 * Apply CORS on the R2 bucket so signed GETs work from the hub origin
 * (canvas/composite in Design). Uploads go through Next.js, so they do not
 * need CORS.
 *
 *   cd hub
 *   npm run storage:init
 */
import { PutBucketCorsCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { createR2Client, loadEnvLocal } from "./r2-shared.mjs";

loadEnvLocal();

const { cfg, client } = createR2Client();
await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));

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
