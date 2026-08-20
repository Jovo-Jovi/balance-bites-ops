import { NextResponse } from "next/server";
import { requireStaff, StaffAuthError } from "@/lib/server/require-staff";
import { isR2Configured, signedR2GetUrl } from "@/lib/server/r2";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireStaff(req);
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "Cloudflare R2 غير مضبوط" },
        { status: 503 },
      );
    }
    const body = (await req.json()) as { key?: string };
    const url = await signedR2GetUrl(String(body.key || ""));
    return NextResponse.json({ url, expiresIn: 900 });
  } catch (err) {
    if (err instanceof StaffAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "تعذر إنشاء الرابط";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
