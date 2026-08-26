import { NextResponse } from "next/server";
import { characterPngUrl, isCharacterStyle, sanitizeCharacterSeed } from "@/lib/design/character-library";
import { StaffAuthError, requireStaff } from "@/lib/server/require-staff";

export const runtime = "nodejs";

/** Staff-only proxy so Studio can inline DiceBear PNGs. Style/seed are allowlisted. */
export async function GET(req: Request) {
  try {
    await requireStaff(req);
    const url = new URL(req.url);
    const style = String(url.searchParams.get("style") || "");
    const seed = sanitizeCharacterSeed(String(url.searchParams.get("seed") || ""));
    const size = Number(url.searchParams.get("size") || 512);
    if (!isCharacterStyle(style)) {
      return NextResponse.json({ error: "Unknown character set." }, { status: 400 });
    }
    const src = characterPngUrl(style, seed, size);
    const res = await fetch(src, { next: { revalidate: 86400 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Could not load that character." }, { status: 502 });
    }
    const type = res.headers.get("content-type") || "image/png";
    return new NextResponse(await res.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    if (err instanceof StaffAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not load that character." }, { status: 502 });
  }
}
