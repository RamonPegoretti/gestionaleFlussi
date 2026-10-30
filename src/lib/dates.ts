// Calendar dates are plain "YYYY-MM-DD" strings everywhere in the app, so that
// time zones never shift a guest's arrival to the wrong day.

export type ISODate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(s: string): boolean {
  if (!ISO_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function toISO(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: ISODate, n: number): ISODate {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function nightsBetween(arrival: ISODate, departure: ISODate): number {
  const [y1, m1, d1] = arrival.split("-").map(Number);
  const [y2, m2, d2] = departure.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function monthStart(year: number, month: number): ISODate {
  return toISO(year, month, 1);
}

export function monthEnd(year: number, month: number): ISODate {
  return toISO(year, month, daysInMonth(year, month));
}

// "2026-09" <-> { year, month }
export function parseMonthParam(s: string | undefined | null): { year: number; month: number } | null {
  if (!s || !/^\d{4}-\d{2}$/.test(s)) return null;
  const [year, month] = s.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function monthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
