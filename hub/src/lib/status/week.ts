import { pad2 } from "@/lib/invoices/helpers";

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Monday of the ISO week containing `iso` (local). */
export function mondayOf(iso: string): string {
  const d = parseIsoDate(iso) ?? new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function currentWeek(): { start: string; end: string } {
  const start = mondayOf(isoDate(new Date()));
  return { start, end: addDaysIso(start, 6) };
}

export function formatDmY(iso: string) {
  const d = parseIsoDate(iso);
  if (!d) return iso || "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function weekLabel(start: string, end: string) {
  return `${formatDmY(start)} – ${formatDmY(end)}`;
}

export function inInclusiveRange(iso: string, from: string, to: string) {
  const day = String(iso || "").slice(0, 10);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
