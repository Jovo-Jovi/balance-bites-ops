"use client";

import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "./firebase";
import {
  BB_KEYS,
  EMPTY_DEFAULTS,
  isBbKey,
  type BbKey,
} from "./keys";
import { TENANT_ID } from "./tenant";
import { classifyRemoteSnapshot } from "./cloud-snap";

export type CloudStoreErrorHandler = (message: string, key?: string) => void;
export type CloudStoreConflictHandler = (key: string) => void;

export type CloudKeyDoc = {
  data: unknown;
  updatedAt: unknown;
  updatedBy: string;
  clientWriteId: string;
  prevWriteId?: string;
};

type UiHooks = {
  onError: CloudStoreErrorHandler;
  onConflict: CloudStoreConflictHandler;
};

const pendingWriteIds = new Set<string>();
const lastAppliedWriteId = new Map<string, string>();
const persistChain = new Map<string, Promise<void>>();
const unsubscribers = new Map<string, Unsubscribe>();
const firstSnapDone = new Set<string>();
const listeners = new Set<(key: string) => void>();

export function subscribeCloudStore(listener: (key: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(key: string) {
  listeners.forEach((fn) => fn(key));
}

let hooks: UiHooks = {
  onError: (message) => {
    console.error("[CloudStore]", message);
  },
  onConflict: (key) => {
    console.info("[CloudStore] remote update", key);
  },
};

export function configureCloudStoreUi(next: Partial<UiHooks>) {
  hooks = { ...hooks, ...next };
}

/** Persist already toasted via `onError`. Swallow so ignored promises are not Uncaught. */
export function fireAndForget(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

export function keyDocRef(key: string) {
  return doc(getFirebaseDb(), "tenants", TENANT_ID, "keys", key);
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === "") return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "تعذر الكتابة في التخزين المحلي";
    hooks.onError(`فشل الحفظ المحلي: ${message}`, key);
    throw err;
  }
}

function clearLocal(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function requireUid(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("غير مسجّل الدخول — لا يمكن الحفظ في السحابة");
  }
  return uid;
}

function newWriteId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function decodeCloudData(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function applyRemote(key: string, data: unknown) {
  writeLocal(key, decodeCloudData(data));
  notify(key);
}

export const CloudStore = {
  get<T>(key: string, fallback: T): T {
    return readLocal(key, fallback);
  },

  getVersioned<T>(key: string, fallback: T): { value: T; writeId: string } {
    return { value: readLocal(key, fallback), writeId: lastAppliedWriteId.get(key) || "" };
  },

  /**
   * Drop-in for live `Store.set`: cache locally, then write Firestore.
   * Callers that ignore the promise still get a visible error via `onError`.
   */
  set(key: string, value: unknown): Promise<void> {
    return CloudStore.setFrom(key, value, lastAppliedWriteId.get(key) || "");
  },

  setFrom(key: string, value: unknown, basedOn: string): Promise<void> {
    writeLocal(key, value);
    notify(key);
    return persist(key, value, basedOn);
  },

  remove(key: string): Promise<void> {
    clearLocal(key);
    notify(key);
    return persistDelete(key);
  },

  async hydrate(keys: readonly string[] = BB_KEYS): Promise<void> {
    if (!isFirebaseConfigured() || typeof window === "undefined") return;
    if (!getFirebaseAuth().currentUser) {
      throw new Error("سجّل الدخول قبل مزامنة البيانات");
    }

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const snap = await getDoc(keyDocRef(key));
        if (!snap.exists()) return;
        const payload = snap.data() as CloudKeyDoc;
        if (payload && "data" in payload) {
          const writeId = String(payload.clientWriteId || "");
          if (writeId) lastAppliedWriteId.set(key, writeId);
          applyRemote(key, payload.data);
        }
      }),
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      const first = failed[0] as PromiseRejectedResult;
      const reason =
        first.reason instanceof Error
          ? first.reason.message
          : "تعذر قراءة Firestore";
      hooks.onError(`فشل التحميل من السحابة: ${reason}`);
      throw first.reason;
    }
  },

  /**
   * Live Firestore docs that exist. Missing keys are omitted (no empty dumps).
   * Used for a local zip backup — not a write path.
   */
  async exportExisting(
    keys: readonly string[] = BB_KEYS,
  ): Promise<{ key: string; data: unknown }[]> {
    if (!isFirebaseConfigured() || typeof window === "undefined") {
      throw new Error("Firebase غير مضبوط");
    }
    if (!getFirebaseAuth().currentUser) {
      throw new Error("سجّل الدخول قبل تحميل النسخة");
    }

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        const snap = await getDoc(keyDocRef(key));
        if (!snap.exists()) return null;
        const payload = snap.data() as CloudKeyDoc;
        if (!payload || !("data" in payload)) return null;
        return { key, data: decodeCloudData(payload.data) };
      }),
    );

    const rows: { key: string; data: unknown }[] = [];
    for (const r of results) {
      if (r.status === "rejected") {
        const reason =
          r.reason instanceof Error ? r.reason.message : "تعذر قراءة Firestore";
        hooks.onError(`فشل التحميل من السحابة: ${reason}`);
        throw r.reason;
      }
      if (r.value) rows.push(r.value);
    }
    return rows;
  },

  watchKey(key: string): Unsubscribe {
    if (!isFirebaseConfigured()) return () => undefined;
    unsubscribers.get(key)?.();
    firstSnapDone.delete(key);

    const unsub = onSnapshot(
      keyDocRef(key),
      (snap) => {
        if (!snap.exists()) {
          firstSnapDone.add(key);
          return;
        }
        const payload = snap.data() as CloudKeyDoc;
        const writeId = String(payload.clientWriteId || "");
        const kind = classifyRemoteSnapshot({
          exists: true,
          writeId,
          pendingHasWriteId: Boolean(writeId && pendingWriteIds.has(writeId)),
          lastApplied: lastAppliedWriteId.get(key) || "",
          alreadyWatching: firstSnapDone.has(key),
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });
        if (writeId && pendingWriteIds.has(writeId) && !snap.metadata.hasPendingWrites) {
          pendingWriteIds.delete(writeId);
        }
        if (writeId && !snap.metadata.hasPendingWrites) lastAppliedWriteId.set(key, writeId);
        applyRemote(key, payload.data);
        firstSnapDone.add(key);
        if (kind === "conflict") hooks.onConflict(key);
      },
      (err) => {
        hooks.onError(`انقطع التزامن (${key}): ${err.message}`, key);
      },
    );
    unsubscribers.set(key, unsub);
    return unsub;
  },

  watchAll(keys: readonly string[] = BB_KEYS): () => void {
    const stops = keys.map((key) => CloudStore.watchKey(key));
    return () => stops.forEach((stop) => stop());
  },

  stopAll() {
    unsubscribers.forEach((stop) => stop());
    unsubscribers.clear();
    firstSnapDone.clear();
    pendingWriteIds.clear();
  },

  /** Drop every `bb_*` cache entry. Does not touch other origin keys. */
  clearLocalCache() {
    lastAppliedWriteId.clear();
    pendingWriteIds.clear();
    for (const key of BB_KEYS) clearLocal(key);
    for (const key of BB_KEYS) notify(key);
  },
};

function queuePersist(key: string, job: () => Promise<void>): Promise<void> {
  const prev = persistChain.get(key) ?? Promise.resolve();
  const next = prev.then(job, job);
  persistChain.set(
    key,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

async function readStoredWriteId(key: string): Promise<string> {
  try {
    const snap = await getDocFromServer(keyDocRef(key));
    if (!snap.exists()) return "";
    return String((snap.data() as CloudKeyDoc).clientWriteId || "");
  } catch {
    const snap = await getDoc(keyDocRef(key));
    if (!snap.exists()) return "";
    return String((snap.data() as CloudKeyDoc).clientWriteId || "");
  }
}

async function persist(key: string, value: unknown, _prevWriteId = ""): Promise<void> {
  if (!isFirebaseConfigured()) {
    hooks.onError("Firebase غير مضبوط — الحفظ محلي فقط", key);
    return;
  }
  if (!isBbKey(key)) {
    hooks.onError(`مفتاح غير مدرج في السحابة — حُفظ محلياً فقط: ${key}`, key);
    return;
  }
  return queuePersist(key, async () => {
    const clientWriteId = newWriteId();
    let basedOn = "";
    try {
      const uid = requireUid();
      basedOn = await readStoredWriteId(key);
      if (basedOn) lastAppliedWriteId.set(key, basedOn);
      pendingWriteIds.add(clientWriteId);
      await setDoc(keyDocRef(key), {
        data: value,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
        clientWriteId,
        prevWriteId: basedOn,
      });
      lastAppliedWriteId.set(key, clientWriteId);
    } catch (err) {
      pendingWriteIds.delete(clientWriteId);
      const message = await classifyPersistError(err, key, basedOn);
      hooks.onError(message, key);
      throw err instanceof Error ? err : new Error(message);
    }
  });
}

async function persistDelete(key: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    requireUid();
    await deleteDoc(keyDocRef(key));
  } catch (err) {
    const message = formatWriteError(err);
    hooks.onError(message, key);
    throw err instanceof Error ? err : new Error(message);
  }
}

function firebaseCode(err: unknown): string {
  return typeof err === "object" && err && "code" in err
    ? String((err as { code: string }).code)
    : "";
}

function isPermissionDenied(err: unknown): boolean {
  const code = firebaseCode(err);
  const message = err instanceof Error ? err.message : String(err);
  return code.includes("permission-denied") || message.includes("permission");
}

function genericWriteError(err: unknown, key?: string): string {
  const message = err instanceof Error ? err.message : String(err);
  return key
    ? `فشل الحفظ في السحابة (${key}): ${message}`
    : `فشل الحفظ في السحابة: ${message}`;
}

/**
 * permission-denied is not always a CAS miss. `prevWriteId` is the token we
 * sent, not proof the server rejected a version mismatch. Probe the doc
 * (reads use a separate rule) only on that error when we sent a token.
 */
async function classifyPersistError(
  err: unknown,
  key: string,
  prevWriteId: string,
): Promise<string> {
  if (!isPermissionDenied(err) || !prevWriteId) {
    return formatWriteError(err, { docExists: Boolean(prevWriteId) });
  }
  try {
    const snap = await getDoc(keyDocRef(key));
    if (!snap.exists()) {
      return `فشل الحفظ في السحابة (${key})`;
    }
    const stored = String((snap.data() as CloudKeyDoc).clientWriteId || "");
    if (stored !== prevWriteId) {
      return formatWriteError(err, { docExists: true });
    }
    return "رُفض الحفظ: القواعد غير منشورة أو قديمة";
  } catch (probeErr) {
    if (isPermissionDenied(probeErr)) {
      return formatWriteError(err);
    }
    return genericWriteError(err);
  }
}

function formatWriteError(err: unknown, ctx?: { docExists?: boolean }): string {
  const code = firebaseCode(err);
  const message = err instanceof Error ? err.message : String(err);
  if (isPermissionDenied(err)) {
    if (ctx?.docExists) {
      return "تغيرت البيانات على جهاز آخر ولم يُحفظ التعديل — أعد المحاولة";
    }
    return "رُفض الحفظ: الحساب غير مدرج كموظف أو القواعد غير منشورة";
  }
  if (code.includes("unauthenticated")) {
    return "انتهت الجلسة — سجّل الدخول ثم احفظ مرة أخرى";
  }
  if (message.toLowerCase().includes("exceed") || message.includes("1 MiB")) {
    return "المستند أكبر من حد Firestore (1 ميغابايت) — يجب تقسيم المفتاح";
  }
  return genericWriteError(err);
}

/** Live-app shaped Store: get is sync; set writes local then cloud. */
export const Store = {
  get<T>(key: string, fallback: T): T {
    if (isBbKey(key) && fallback === undefined) {
      return CloudStore.get(key, EMPTY_DEFAULTS[key] as T);
    }
    return CloudStore.get(key, fallback);
  },
  set(key: string, value: unknown) {
    void CloudStore.set(key, value);
  },
  remove(key: string) {
    void CloudStore.remove(key);
  },
};

export type { BbKey };
