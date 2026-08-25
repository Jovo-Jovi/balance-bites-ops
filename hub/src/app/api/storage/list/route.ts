import { NextResponse } from "next/server";
import { LABEL_ASSETS_PREFIX } from "@/lib/storage-paths";
import { requireStaff, StaffAuthError } from "@/lib/server/require-staff";
import { isR2Configured, listR2Prefix } from "@/lib/server/r2";

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
    // Keys + sizes only. Signing 400 URLs here made Images → Storage hang; thumbs sign when visible.
    return NextResponse.json({ items: listed });
  } catch (err) {
    if (err instanceof StaffAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "تعذر عرض الملفات";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
