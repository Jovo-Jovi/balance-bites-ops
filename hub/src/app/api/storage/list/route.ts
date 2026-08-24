import { NextResponse } from "next/server";
import { LABEL_ASSETS_PREFIX } from "@/lib/storage-paths";
import { requireStaff, StaffAuthError } from "@/lib/server/require-staff";
import { isR2Configured, listR2Prefix, signedR2GetUrl } from "@/lib/server/r2";

export const runtime = "nodejs";
export const preferredRegion = "fra1";

export async function GET(req: Request) {
  try {
    await requireStaff(req);
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "Cloudflare R2 غير مضبوط" },
        { status: 503 },
      );
    }
    const listed = await listR2Prefix(LABEL_ASSETS_PREFIX, 400);
    const items = await Promise.all(
      listed.map(async (it) => ({
        key: it.key,
        size: it.size,
        url: await signedR2GetUrl(it.key),
      })),
    );
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof StaffAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "تعذر عرض الملفات";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
