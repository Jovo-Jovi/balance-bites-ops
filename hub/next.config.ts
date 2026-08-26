import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hubRoot = path.dirname(fileURLToPath(import.meta.url));

/** Path-style presigned GETs from `signedR2GetUrl` (`account.r2` / `.eu.r2` / `.us.r2`). */
const R2_HOSTS = [
  "https://*.r2.cloudflarestorage.com",
  "https://*.eu.r2.cloudflarestorage.com",
  "https://*.us.r2.cloudflarestorage.com",
];

const firebaseAuthHost =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || "*.firebaseapp.com";
const firebaseAuthOrigin = `https://${firebaseAuthHost}`;

function csp(directives: Record<string, string[]>) {
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

const frameSrc = [
  "'self'",
  "blob:",
  firebaseAuthOrigin,
  "https://*.firebaseapp.com",
];

/**
 * Report-Only until Next.js inline bootstrap can take a nonce (proxy +
 * per-request dynamic render — too invasive for this pass). `script-src 'self'`
 * will flag those bootstraps in the console; other directives are the target
 * enforcing policy once violations are quiet.
 */
const contentSecurityPolicyReportOnly = csp({
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  // Tailwind v4 runtime + inline print overlay CSS (`open-print.ts`).
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://api.dicebear.com",
    ...R2_HOSTS,
  ],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "connect-src": [
    "'self'",
    "https://*.googleapis.com",
    "wss://*.googleapis.com",
    ...R2_HOSTS,
  ],
  "frame-src": frameSrc,
  "child-src": frameSrc,
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
});

const nextConfig: NextConfig = {
  turbopack: {
    root: hubRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // `same-origin` would null `window.opener` on the Google popup from
          // `signInWithPopup`. This value keeps that opener link and still
          // blocks cross-origin window references into the hub.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // DiceBear thumbs + browser-side R2 GETs in `collectLabelAssets`.
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
