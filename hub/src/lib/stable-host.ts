/** Hostnames that stay the same across deploys — add these to Firebase Auth. */
export const PRODUCTION_HOST = "balance-bites-ops.vercel.app";
export const INVOICES_PREVIEW_HOST =
  "balance-bites-ops-git-feat-invoices-jiovannys-projects-0219772b.vercel.app";

export function stripHost(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
}

export function isStableAuthHost(host: string): boolean {
  const h = stripHost(host);
  if (!h) return false;
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h === PRODUCTION_HOST) return true;
  if (h.includes("-git-") && h.endsWith(".vercel.app")) return true;
  return false;
}

export function stableAuthHostFromEnv(env = process.env): string {
  const kind = env.VERCEL_ENV || env.NEXT_PUBLIC_VERCEL_ENV || "";
  const branch = stripHost(env.VERCEL_BRANCH_URL || env.NEXT_PUBLIC_VERCEL_BRANCH_URL);
  const prod =
    stripHost(
      env.VERCEL_PROJECT_PRODUCTION_URL ||
        env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    ) || PRODUCTION_HOST;
  if (kind === "production") return prod;
  return branch || INVOICES_PREVIEW_HOST;
}
