// Turns guest groups into the daily numbers of the ISTAT form.
//
// A group arriving on day A and leaving on day D counts as:
//   - "arrivati" on A,
//   - "partiti" on D,
//   - "presenti" on every night from A to D-1.
// This is the same rule as the paper form: presenti = previous + arrivati - partiti.

import { daysInMonth, monthStart, toISO, type ISODate } from "./dates";

export type GroupInput = {
  people: number;
  originKey: string;
  arrival: ISODate;
  departure: ISODate;
};

export type Counts = Record<string, number>;

export type DayMovement = {
  day: number;
  date: ISODate;
  arrived: Counts;
  departed: Counts;
  present: Counts;
};

export type MonthMovement = {
  year: number;
  month: number;
  // Guests still present on the night before day 1 ("Presenze del giorno precedente").
  carriedOver: Counts;
  days: DayMovement[];
  totals: { arrived: Counts; departed: Counts; present: Counts };
};

function add(counts: Counts, key: string, n: number) {
  counts[key] = (counts[key] ?? 0) + n;
}

export function sumCounts(counts: Counts): number {
  let total = 0;
  for (const v of Object.values(counts)) total += v;
  return total;
}

export function computeMonth(groups: GroupInput[], year: number, month: number): MonthMovement {
  const n = daysInMonth(year, month);
  const first = monthStart(year, month);

  const carriedOver: Counts = {};
  const days: DayMovement[] = Array.from({ length: n }, (_, i) => ({
    day: i + 1,
    date: toISO(year, month, i + 1),
    arrived: {},
    departed: {},
    present: {},
  }));
  const byDate = new Map(days.map((d) => [d.date, d]));

  for (const g of groups) {
    if (g.departure <= g.arrival || g.people <= 0) continue;
    if (g.arrival < first && g.departure >= first) add(carriedOver, g.originKey, g.people);
    const a = byDate.get(g.arrival);
    if (a) add(a.arrived, g.originKey, g.people);
    const d = byDate.get(g.departure);
    if (d) add(d.departed, g.originKey, g.people);
  }

  // Roll the presences forward day by day, exactly as the form's formulas do.
  let prev: Counts = carriedOver;
  for (const day of days) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(day.arrived), ...Object.keys(day.departed)]);
    for (const k of keys) {
      const v = (prev[k] ?? 0) + (day.arrived[k] ?? 0) - (day.departed[k] ?? 0);
      if (v !== 0) day.present[k] = v;
    }
    prev = day.present;
  }

  const totals = { arrived: {} as Counts, departed: {} as Counts, present: {} as Counts };
  for (const day of days) {
    for (const [k, v] of Object.entries(day.arrived)) add(totals.arrived, k, v);
    for (const [k, v] of Object.entries(day.departed)) add(totals.departed, k, v);
    for (const [k, v] of Object.entries(day.present)) add(totals.present, k, v);
  }

  return { year, month, carriedOver, days, totals };
}

// A day counts as open if it falls in an opening period, or if guests are there anyway.
export function openDays(
  movement: MonthMovement,
  periods: { start: ISODate; end: ISODate }[],
): boolean[] {
  return movement.days.map((d) => {
    const inPeriod = periods.some((p) => p.start <= d.date && d.date <= p.end);
    return inPeriod || sumCounts(d.arrived) > 0 || sumCounts(d.present) > 0;
  });
}
