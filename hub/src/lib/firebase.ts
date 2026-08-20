"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseWebConfig } from "./firebase-config";

export {
  isFirebaseConfigured,
  isStorageEnabled,
  getFirebaseWebConfig,
} from "./firebase-config";

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase client SDK runs in the browser only.");
  }
  if (getApps().length) return getApp();
  return initializeApp(getFirebaseWebConfig());
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
