import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PRODUCTION_HOST,
  stableAuthHostFromEnv,
  stripHost,
} from "@/lib/stable-host";

/**
 * Unique Vercel URLs (balance-bites-xxxxx-team.vercel.app) change every
 * deploy and cannot be added to Firebase Auth. Send those visits to the
 * stable production or git-branch host instead.
 */
export function proxy(request: NextRequest) {
  const host = stripHost(request.headers.get("host"));
  const unique = stripHost(process.env.VERCEL_URL);
  if (!host || !unique || host !== unique) {
    return NextResponse.next();
  }

  const target = stableAuthHostFromEnv();
  if (!target || target === host || !target.endsWith(".vercel.app")) {
    return NextResponse.next();
  }
  if (target !== PRODUCTION_HOST && !target.includes("-git-")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.hostname = target;
  url.protocol = "https:";
  url.port = "";
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
