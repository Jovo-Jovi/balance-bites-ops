import { NextResponse } from "next/server";

/** Public Firebase web config for wrapped HTML apps on the same origin. */
export function GET() {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return NextResponse.json(
      { error: "Firebase is not configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    tenantId: process.env.NEXT_PUBLIC_BB_TENANT_ID || "balance-bites",
  });
}
