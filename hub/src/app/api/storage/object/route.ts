import { NextResponse } from "next/server";
import { MAX_OBJECT_BYTES } from "@/lib/storage-paths";
import { requireStaff, StaffAuthError } from "@/lib/server/require-staff";
import {
  deleteR2Object,
  isR2Configured,
  putR2Object,
  requireObjectKey,
} from "@/lib/server/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireStaff(req);
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "Cloudflare R2 غير مضبوط" },
        { status: 503 },
      );
    }
    const form = await req.formData();
    const key = requireObjectKey(String(form.get("key") || ""));
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "الملف مفقود" }, { status: 400 });
    }
    if (file.size > MAX_OBJECT_BYTES) {
      return NextResponse.json(
        { error: "الملف أكبر من 15 ميغابايت" },
        { status: 413 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    await putR2Object({
      key,
      body: buf,
      contentType: file.type || "application/octet-stream",
    });
    return NextResponse.json({ key });
  } catch (err) {
    if (err instanceof StaffAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "تعذر الرفع";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireStaff(req);
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "Cloudflare R2 غير مضبوط" },
        { status: 503 },
      );
    }
    const url = new URL(req.url);
    const key = requireObjectKey(url.searchParams.get("key") || "");
    await deleteR2Object(key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StaffAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "تعذر الحذف";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
