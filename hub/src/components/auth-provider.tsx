"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isFirebaseConfigured } from "@/lib/firebase-config";
import { useToast } from "./toast";

type AuthUser = {
  uid: string;
  email: string | null;
};

type AuthState = {
  configured: boolean;
  loading: boolean;
  user: AuthUser | null;
  staff: { uid: string; email: string; role: "owner" | "staff" } | null;
  storeReady: boolean;
  error: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const configured = isFirebaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [staff, setStaff] = useState<AuthState["staff"]>(null);
  const [storeReady, setStoreReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void import("@/lib/cloud-store").then(({ configureCloudStoreUi }) => {
      configureCloudStoreUi({
        onError: (message) => toast.push(message, "bad"),
        onConflict: (key) =>
          toast.push(`تم تحديث ${key} من جهاز أو تبويب آخر`, "warn"),
      });
    });
  }, [toast]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    let unsub = () => {};

    void (async () => {
      try {
        const { getFirebaseAuth } = await import("@/lib/firebase");
        const { onAuthStateChanged } = await import("firebase/auth");
        const { CloudStore } = await import("@/lib/cloud-store");
        const { fetchStaffProfile } = await import("@/lib/staff");
        if (cancelled) return;

        const auth = getFirebaseAuth();
        unsub = onAuthStateChanged(auth, async (next) => {
          setError(null);
          setStoreReady(false);
          CloudStore.stopAll();
          if (!next) {
            setUser(null);
            setStaff(null);
            setLoading(false);
            return;
          }
          setUser({ uid: next.uid, email: next.email });
          try {
            const profile = await fetchStaffProfile(next.uid);
            setStaff(profile);
            if (profile) {
              await CloudStore.hydrate();
              CloudStore.watchAll();
              setStoreReady(true);
            }
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "تعذر التحقق من الموظف";
            setError(message);
            toast.push(message, "bad");
          } finally {
            setLoading(false);
          }
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "تعذر تشغيل Firebase";
        setError(message);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsub();
      void import("@/lib/cloud-store").then(({ CloudStore }) =>
        CloudStore.stopAll(),
      );
    };
  }, [configured, toast]);

  const value = useMemo<AuthState>(
    () => ({
      configured,
      loading,
      user,
      staff,
      storeReady,
      error,
      signInEmail: async (email, password) => {
        setError(null);
        const { getFirebaseAuth } = await import("@/lib/firebase");
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        try {
          await signInWithEmailAndPassword(
            getFirebaseAuth(),
            email,
            password,
          );
        } catch (err) {
          throw new Error(mapAuthError(err));
        }
      },
      signInGoogle: async () => {
        setError(null);
        const { getFirebaseAuth } = await import("@/lib/firebase");
        const { GoogleAuthProvider, signInWithPopup } = await import(
          "firebase/auth"
        );
        try {
          await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
        } catch (err) {
          throw new Error(mapAuthError(err));
        }
      },
      signOut: async () => {
        const { CloudStore } = await import("@/lib/cloud-store");
        const { getFirebaseAuth } = await import("@/lib/firebase");
        const { signOut: firebaseSignOut } = await import("firebase/auth");
        CloudStore.stopAll();
        await firebaseSignOut(getFirebaseAuth());
      },
    }),
    [configured, loading, user, staff, storeReady, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function mapAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: string }).code)
      : "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "بيانات الدخول غير صحيحة";
  }
  if (code === "auth/user-not-found") {
    return "لا يوجد حساب بهذا البريد — أنشئ المستخدم من Firebase Console";
  }
  if (code === "auth/too-many-requests") {
    return "محاولات كثيرة. انتظر ثم أعد المحاولة";
  }
  if (code === "auth/unauthorized-domain") {
    return "النطاق غير مصرّح في Firebase Auth (أضف localhost أو نطاق Vercel)";
  }
  if (code === "auth/popup-closed-by-user") {
    return "أُغلق نافذة جوجل";
  }
  if (code === "auth/network-request-failed") {
    return "تعذر الاتصال. تحقق من الشبكة";
  }
  if (code === "auth/invalid-api-key") {
    return "مفتاح Firebase غير صالح — تحقق من hub/.env.local وأعد تشغيل الخادم";
  }
  return err instanceof Error ? err.message : "فشل تسجيل الدخول";
}
