"use client";

import { ToastProvider } from "./toast";
import { AuthProvider } from "./auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
