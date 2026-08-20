import { DEFAULT_TENANT_ID } from "./keys";

export const TENANT_ID =
  process.env.NEXT_PUBLIC_BB_TENANT_ID || DEFAULT_TENANT_ID;

export const TENANT_NAME =
  process.env.NEXT_PUBLIC_BB_TENANT_NAME || "Balance Bites";
