"use client";

import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

export type StaffRole = "owner" | "staff";

export type StaffProfile = {
  uid: string;
  email: string;
  role: StaffRole;
};

export async function fetchStaffProfile(
  uid: string,
): Promise<StaffProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "staff", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as { email?: string; role?: string };
  const role: StaffRole = data.role === "owner" ? "owner" : "staff";
  return {
    uid,
    email: data.email || "",
    role,
  };
}
