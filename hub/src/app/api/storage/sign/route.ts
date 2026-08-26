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
    const body = (await req.json()) as { key?: string; keys?: string[] };
    const keys = Array.isArray(body.keys)
      ? body.keys
      : body.key
        ? [body.key]
        : [];
    if (!keys.length) {
      return NextResponse.json({ error: "مسار تخزين مفقود" }, { status: 400 });
    }
    if (keys.length > 40) {
      return NextResponse.json({ error: "Too many keys" }, { status: 400 });
    }
    const urls: Record<string, string> = {};
    await Promise.all(
      keys.map(async (raw) => {
        const key = String(raw || "");
        if (!key) return;
        try {
          urls[key] = await signedR2GetUrl(key);
        } catch {
          /* skip a bad key so the rest of the batch still signs */
        }
      }),
    );
    const first = keys[0] ? urls[keys[0]] : "";
    return NextResponse.json({ url: first, urls, expiresIn: 900 });
  } catch (err) {
    if (err instanceof StaffAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "تعذر إنشاء الرابط";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
