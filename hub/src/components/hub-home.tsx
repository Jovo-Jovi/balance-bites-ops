"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";
import { BrandLockup } from "./brand-lockup";
import { DiamondMark } from "./diamond-mark";
import { LoginForm } from "./login-form";
import { LocalBackupButton } from "./local-backup-button";
import { TENANT_NAME } from "@/lib/tenant";
import { WORKSPACE_APPS } from "@/lib/workspace";

export function HubHome() {
  const { configured, loading, user, staff, signOut, error } = useAuth();

  if (!configured) {
    return <SetupMissing />;
  }

  if (loading) {
    return (
      <Centered>
        <DiamondMark size={28} />
        <p className="mt-6 text-[var(--bb-muted)]">جاري التحميل…</p>
      </Centered>
    );
  }

  if (error && !user) {
    return (
      <Centered>
        <DiamondMark size={28} />
        <h1 className="font-brand mt-6 text-[clamp(1.75rem,7vw,2.25rem)] text-[var(--bb-title)]">
          Balance Bites
        </h1>
        <p className="mt-6 max-w-md text-center text-[var(--bb-bad)]" role="alert">
          {error}
        </p>
        <p className="mt-3 max-w-md text-center text-sm text-[var(--bb-muted)]">
          أعد تشغيل الخادم من مجلد <span dir="ltr">hub</span> بعد التحقق من{" "}
          <span dir="ltr">hub/.env.local</span>.
        </p>
      </Centered>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (!staff) {
    return (
      <Centered>
        <DiamondMark size={28} />
        <h1 className="font-brand mt-6 text-[clamp(1.75rem,7vw,2.25rem)] text-[var(--bb-title)]">
          Balance Bites
        </h1>
        <p className="mt-6 max-w-md text-center text-[var(--bb-text)]">
          الحساب غير مدرج في قائمة الموظفين.
        </p>
        <p className="mt-3 max-w-md text-center text-sm break-all text-[var(--bb-muted)]">
          أضف مستند <span dir="ltr">staff/{user.uid}</span> في Firestore
          (الحقول: email, role) ثم أعد تسجيل الدخول. لا يمكن للتطبيق إنشاء هذا
          المستند بنفسه.
        </p>
        <p className="mt-2 text-sm break-all text-[var(--bb-muted)]" dir="ltr">
          {user.email}
        </p>
        {error ? (
          <p className="mt-2 text-sm text-[var(--bb-bad)]">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void signOut()}
          className="bb-btn mt-8 rounded-[var(--bb-radius)] border border-[var(--bb-gold)] bg-[var(--bb-btn)] text-[var(--bb-btn-text)] hover:bg-[var(--bb-btn-hover)] hover:text-[var(--bb-btn-hover-text)]"
        >
          خروج
        </button>
      </Centered>
    );
  }

  return (
    <div className="bb-shell flex flex-col">
      <header className="flex items-center justify-center pt-2 sm:pt-4">
        <BrandLockup size="hero" />
      </header>
      <main className="mx-auto mt-8 w-full max-w-3xl flex-1 lg:mt-14 lg:max-w-6xl xl:max-w-7xl">
        <p className="mb-5 text-center text-sm text-[var(--bb-muted)] lg:mb-8">
          ثلاث أدوات. اختر واحدة — التبويبات داخل كل أداة.
        </p>
        <nav
          aria-label="التطبيقات"
          className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6"
        >
          {WORKSPACE_APPS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bb-glass bb-pressable flex min-h-24 flex-col justify-between gap-4 p-5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-gold)] sm:min-h-32 sm:p-6 lg:min-h-60 lg:p-8"
            >
              <div>
                <p className="font-label text-[10px] tracking-[0.22em] text-[var(--bb-muted)] uppercase sm:tracking-[0.28em]">
                  {card.en}
                </p>
                <h2 className="mt-2 text-[clamp(1.5rem,4vw,2.25rem)] leading-tight text-[var(--bb-title)] lg:mt-4">
                  {card.title}
                </h2>
              </div>
              <div>
                <p className="text-sm text-[var(--bb-text)] sm:text-base">
                  {card.subtitle}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-[var(--bb-muted)]">
                  {card.tools
                    .slice(0, 4)
                    .map((tool) => tool.label)
                    .join(" · ")}
                </p>
              </div>
            </Link>
          ))}
        </nav>
      </main>
      <footer className="mx-auto mt-8 flex w-full max-w-3xl flex-col items-stretch gap-3 text-sm text-[var(--bb-muted)] sm:mt-10 sm:flex-row sm:items-center sm:justify-between lg:max-w-6xl xl:max-w-7xl">
        <span className="text-center sm:text-start">
          المستأجر: <span className="text-[var(--bb-text)]">{TENANT_NAME}</span>
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <LocalBackupButton tone="primary" />
          <button
            type="button"
            onClick={() => void signOut()}
            className="bb-btn rounded-[var(--bb-radius)] border border-[var(--bb-line)] sm:w-auto"
            data-tone="ghost"
          >
            خروج
          </button>
        </div>
      </footer>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="bb-shell flex flex-col items-center justify-center">
      {children}
    </div>
  );
}

function SetupMissing() {
  return (
    <Centered>
      <DiamondMark size={32} />
      <h1 className="font-brand mt-8 text-[clamp(1.75rem,8vw,2.5rem)] text-[var(--bb-title)]">
        Balance Bites
      </h1>
      <p className="mt-6 max-w-lg text-center text-[var(--bb-text)] sm:mt-8">
        Firebase غير مضبوط بعد. انسخ القيم من Console إلى{" "}
        <span dir="ltr">hub/.env.local</span> (انظر SETUP.md) ثم أعد تشغيل
        الخادم.
      </p>
      <p className="mt-4 max-w-lg text-center text-sm text-[var(--bb-muted)]">
        لا ننشر على Vercel قبل تفعيل Auth وقواعد Firestore المغلقة.
      </p>
    </Centered>
  );
}
