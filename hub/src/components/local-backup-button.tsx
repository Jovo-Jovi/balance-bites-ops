"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { useToast } from "./toast";
import { downloadLocalBackup } from "@/lib/local-backup";

export function LocalBackupButton({
  lang = "ar",
  tone = "ghost",
}: {
  lang?: "ar" | "en";
  tone?: "ghost" | "primary";
}) {
  const { storeReady } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const idle = lang === "en" ? "Download backup" : "تحميل نسخة محلية";
  const working = lang === "en" ? "Downloading…" : "جاري التنزيل…";

  return (
    <button
      type="button"
      disabled={!storeReady || busy}
      onClick={() => {
        setBusy(true);
        void downloadLocalBackup()
          .then((out) => {
            if (out.assetsSkipped) {
              toast.push(
                lang === "en"
                  ? `Saved invoice and customer data in ${out.filename} (${out.keys.length} keys). Label images were skipped because cloud storage is off.`
                  : `حُفظت بيانات الفواتير والعملاء في ${out.filename} (${out.keys.length} مفتاح). تُخطّيت صور الملصقات لأن التخزين السحابي غير مفعّل.`,
                "warn",
              );
              return;
            }
            toast.push(
              lang === "en"
                ? `Saved ${out.filename} (${out.keys.length} keys · ${out.assets} assets)`
                : `حُفظ ${out.filename} (${out.keys.length} مفتاح · ${out.assets} ملف ملصق)`,
              "ok",
            );
          })
          .catch((err) => {
            toast.push(
              err instanceof Error ? err.message : "تعذر تحميل النسخة",
              "bad",
            );
          })
          .finally(() => setBusy(false));
      }}
      className={`bb-btn rounded-[var(--bb-radius)] sm:w-auto disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "primary"
          ? "border border-[var(--bb-btn)] bg-[var(--bb-btn)] text-[var(--bb-btn-text)] hover:bg-[var(--bb-btn-hover)] hover:text-[var(--bb-btn-hover-text)]"
          : "border border-[var(--bb-line)]"
      }`}
      data-tone={tone === "primary" ? undefined : "ghost"}
    >
      {busy ? working : idle}
    </button>
  );
}
