"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";

export function RequireStaff({
  children,
  dir = "rtl",
  lang = "ar",
}: {
  children: React.ReactNode;
  dir?: "rtl" | "ltr";
  lang?: string;
}) {
  const { configured, loading, user, staff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/");
    }
  }, [configured, loading, user, router]);

  if (!configured || loading) {
    return (
      <div className="bb-shell flex items-center justify-center">
        <p className="text-[var(--bb-muted)]">جاري التحميل…</p>
      </div>
    );
  }

  if (!user || !staff) {
    return (
      <div className="bb-shell flex flex-col items-center justify-center gap-4">
        <p className="text-center text-[var(--bb-muted)]">
          يُعاد التوجيه لتسجيل الدخول…
        </p>
        <Link
          href="/"
          className="bb-btn inline-flex items-center justify-center text-[var(--bb-gold)]"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div dir={dir} lang={lang} className="bb-shell flex flex-col">
      {children}
    </div>
  );
}
