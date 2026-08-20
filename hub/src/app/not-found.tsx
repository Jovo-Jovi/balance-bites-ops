import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bb-shell flex flex-col items-center justify-center gap-4">
      <p className="font-brand text-[clamp(1.5rem,6vw,1.75rem)] text-[var(--bb-title)]">
        Balance Bites
      </p>
      <p className="text-[var(--bb-muted)]">الصفحة غير موجودة</p>
      <Link
        href="/"
        className="bb-btn inline-flex items-center justify-center text-[var(--bb-gold)]"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
