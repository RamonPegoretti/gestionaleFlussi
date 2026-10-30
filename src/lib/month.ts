import { monthParam, parseMonthParam, shiftMonth, todayISO } from "./dates";

export type MonthRef = { year: number; month: number; param: string; prev: string; next: string };

// Reads "?m=2026-09"; defaults to the current month.
export function resolveMonth(m: string | string[] | undefined): MonthRef {
  const parsed = parseMonthParam(typeof m === "string" ? m : undefined);
  const today = todayISO();
  const { year, month } = parsed ?? { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const p = shiftMonth(year, month, -1);
  const n = shiftMonth(year, month, 1);
  return {
    year,
    month,
    param: monthParam(year, month),
    prev: monthParam(p.year, p.month),
    next: monthParam(n.year, n.month),
  };
}

export function monthName(year: number, month: number, locale: string): string {
  const s = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

export function longDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
