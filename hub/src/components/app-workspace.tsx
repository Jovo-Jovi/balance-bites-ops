"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./auth-provider";
import { BrandLockup } from "./brand-lockup";
import { TENANT_NAME } from "@/lib/tenant";
import { RequireStaff } from "./require-staff";
import {
  WORKSPACE_APPS,
  getTool,
  getWorkspaceApp,
  type AppId,
} from "@/lib/workspace";
import { InvoiceApp } from "./invoices/invoice-app";
import { DesignApp } from "./design/design-app";
import { FinanceApp } from "./finance/finance-app";

export function WorkspaceScreen({ appId }: { appId: AppId }) {
  const app = getWorkspaceApp(appId);
  return (
    <RequireStaff dir={app.dir} lang={app.lang}>
      <Suspense
        fallback={
          <p className="py-16 text-center text-[var(--bb-muted)]">
            {app.lang === "ar" ? "جاري التحميل…" : "Loading…"}
          </p>
        }
      >
        <AppWorkspace appId={appId} />
      </Suspense>
    </RequireStaff>
  );
}

export function AppWorkspace({ appId }: { appId: AppId }) {
  const app = getWorkspaceApp(appId);
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tool = getTool(app, params.get("tab"));

  function openTab(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", id);
    router.replace(`${pathname}?${next.toString()}`);
    window.scrollTo(0, 0);
  }

  return (
    <div dir={app.dir} lang={app.lang} className="flex min-h-0 flex-1 flex-col">
      <header className="bb-glass sticky top-0 z-20 px-3 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/"
            aria-label="Balance Bites — الرئيسية"
            className="w-fit rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-gold)]"
          >
            <BrandLockup />
          </Link>
          <nav
            aria-label={app.lang === "ar" ? "التطبيقات" : "Apps"}
            className="grid grid-cols-3 gap-1 sm:gap-2"
          >
            {WORKSPACE_APPS.map((item) => {
              const current = item.id === app.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={`bb-btn flex items-center justify-center rounded-[var(--bb-radius)] px-2 text-center text-xs leading-tight sm:text-sm ${
                    current
                      ? "border border-[var(--bb-btn)] bg-[var(--bb-btn)] text-[var(--bb-btn-text)]"
                      : "border border-[var(--bb-line)] text-[var(--bb-text)]"
                  }`}
                  data-tone={current ? undefined : "ghost"}
                >
                  <span className="block truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>
          <p className="hidden text-end text-sm text-[var(--bb-muted)] lg:block">
            <span className="font-label tracking-[0.18em] uppercase">
              {app.en}
            </span>
          </p>
        </div>
      </header>

      <div
        className="bb-tabstrip mt-3 overflow-x-auto pb-1"
        role="tablist"
        aria-label={app.lang === "ar" ? "الأدوات" : "Tools"}
      >
        <div className="flex w-max min-w-full gap-2">
          {app.tools.map((item) => {
            const selected = item.id === tool.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => openTab(item.id)}
                className={`bb-btn shrink-0 rounded-full px-4 text-sm ${
                  selected
                    ? "border border-[var(--bb-title)] bg-[var(--bb-title)] text-[var(--bb-panel)]"
                    : "bb-glass text-[var(--bb-text)]"
                }`}
                data-tone={selected ? undefined : "ghost"}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="mx-auto mt-4 flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-4 lg:max-w-6xl lg:flex-row lg:gap-6">
        {appId === "invoices" ? (
          <section className="bb-glass min-w-0 flex-1 p-4 sm:p-6">
            <p className="font-label text-[10px] tracking-[0.22em] text-[var(--bb-muted)] uppercase">
              {tool.en}
            </p>
            <h1 className="mt-1 mb-4 text-[clamp(1.35rem,2.6vw,1.85rem)] text-[var(--bb-title)]">
              {tool.label}
            </h1>
            <InvoiceApp tab={tool.id} />
          </section>
        ) : appId === "design" ? (
          <section className="bb-sheet min-w-0 flex-1 p-4 sm:p-6">
            <p className="font-label text-[10px] tracking-[0.22em] text-[var(--bb-muted)] uppercase">
              {tool.en}
            </p>
            <h1 className="mt-1 mb-4 text-[clamp(1.35rem,2.6vw,1.85rem)] text-[var(--bb-title)]">
              {tool.label}
            </h1>
            <DesignApp tab={tool.id} />
          </section>
        ) : (
          <section className="bb-glass min-w-0 flex-1 p-4 sm:p-6">
            <p className="font-label text-[10px] tracking-[0.22em] text-[var(--bb-muted)] uppercase">
              {tool.en}
            </p>
            <h1 className="mt-1 mb-4 text-[clamp(1.35rem,2.6vw,1.85rem)] text-[var(--bb-title)]">
              {tool.label}
            </h1>
            <FinanceApp tab={tool.id} />
          </section>
        )}
      </main>

      <footer className="bb-glass mt-4 flex flex-col items-stretch gap-3 px-4 py-3 text-sm text-[var(--bb-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span className="text-center sm:text-start">{TENANT_NAME}</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="bb-btn inline-flex items-center justify-center rounded-[var(--bb-radius)] border border-[var(--bb-line)] sm:w-auto"
            data-tone="ghost"
          >
            {app.lang === "ar" ? "الرئيسية" : "Hub"}
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="bb-btn rounded-[var(--bb-radius)] border border-[var(--bb-line)] sm:w-auto"
            data-tone="ghost"
          >
            {app.signOutLabel}
          </button>
        </div>
      </footer>
    </div>
  );
}
