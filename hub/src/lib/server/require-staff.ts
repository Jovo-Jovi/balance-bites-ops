import "server-only";

export class StaffAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type StaffCaller = {
  uid: string;
  email: string;
};

export async function requireStaff(req: Request): Promise<StaffCaller> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    throw new StaffAuthError(401, "سجّل الدخول");
  }
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new StaffAuthError(503, "Firebase غير مضبوط");
  }

  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    },
  );
  if (!lookup.ok) {
    throw new StaffAuthError(401, "انتهت الجلسة — سجّل الدخول ثم أعد المحاولة");
  }
  const body = (await lookup.json()) as {
    users?: { localId?: string; email?: string }[];
  };
  const uid = body.users?.[0]?.localId;
  const email = body.users?.[0]?.email || "";
  if (!uid) {
    throw new StaffAuthError(401, "انتهت الجلسة — سجّل الدخول ثم أعد المحاولة");
  }

  const staffRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/staff/${uid}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (staffRes.status === 404 || staffRes.status === 403) {
    throw new StaffAuthError(403, "الحساب غير مدرج كموظف");
  }
  if (!staffRes.ok) {
    throw new StaffAuthError(403, "تعذر التحقق من الموظف");
  }
  return { uid, email };
}
