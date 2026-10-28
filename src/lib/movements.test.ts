import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMonth, openDays, sumCounts } from "./movements";
import { COUNTRIES, REGIONS } from "./origins";

test("the form has 59 foreign columns and 21 Italian ones", () => {
  assert.equal(COUNTRIES.length, 59);
  assert.equal(REGIONS.length, 21);
});

test("a group counts as arrived, present each night, then departed", () => {
  const m = computeMonth([{ people: 4, originKey: "DE", arrival: "2026-09-14", departure: "2026-09-16" }], 2026, 9);
  assert.equal(m.days.length, 30);
  assert.deepEqual(m.days[13].arrived, { DE: 4 });
  assert.deepEqual(m.days[13].present, { DE: 4 });
  assert.deepEqual(m.days[14].present, { DE: 4 });
  assert.deepEqual(m.days[15].departed, { DE: 4 });
  assert.deepEqual(m.days[15].present, {});
  assert.deepEqual(m.totals.arrived, { DE: 4 });
  assert.deepEqual(m.totals.present, { DE: 8 }); // 2 nights x 4 people
});

test("guests from the previous month are carried over", () => {
  const m = computeMonth(
    [
      { people: 3, originKey: "IT-VEN", arrival: "2026-08-30", departure: "2026-09-02" },
      { people: 2, originKey: "AT", arrival: "2026-08-29", departure: "2026-08-31" }, // gone before September
    ],
    2026,
    9,
  );
  assert.deepEqual(m.carriedOver, { "IT-VEN": 3 });
  assert.deepEqual(m.days[0].present, { "IT-VEN": 3 });
  assert.deepEqual(m.days[1].departed, { "IT-VEN": 3 });
  assert.deepEqual(m.totals.arrived, {});
  assert.deepEqual(m.totals.present, { "IT-VEN": 3 });
});

test("a guest leaving on the 1st is carried over and departs on day 1", () => {
  const m = computeMonth([{ people: 5, originKey: "IT-LOM", arrival: "2026-10-31", departure: "2026-11-01" }], 2026, 11);
  assert.deepEqual(m.carriedOver, { "IT-LOM": 5 });
  assert.deepEqual(m.days[0].departed, { "IT-LOM": 5 });
  assert.equal(sumCounts(m.days[0].present), 0);
});

test("groups staying past the end of the month stay present until the last night", () => {
  const m = computeMonth([{ people: 2, originKey: "NL", arrival: "2027-02-27", departure: "2027-03-03" }], 2027, 2);
  assert.equal(m.days.length, 28);
  assert.deepEqual(m.days[27].present, { NL: 2 });
  assert.deepEqual(m.totals.departed, {});
  assert.deepEqual(m.totals.present, { NL: 4 });
});

test("presenti always equals previous + arrivati - partiti", () => {
  const groups = Array.from({ length: 200 }, (_, i) => {
    const a = 1 + ((i * 7) % 28);
    const len = 1 + ((i * 3) % 5);
    const origin = [...COUNTRIES, ...REGIONS][(i * 11) % 80].key;
    const d = new Date(Date.UTC(2026, 6, a + len));
    return {
      people: 1 + (i % 6),
      originKey: origin,
      arrival: `2026-07-${String(a).padStart(2, "0")}`,
      departure: d.toISOString().slice(0, 10),
    };
  });
  const m = computeMonth(groups, 2026, 7);
  let prev = m.carriedOver;
  for (const day of m.days) {
    for (const o of [...COUNTRIES, ...REGIONS]) {
      const k = o.key;
      assert.equal(day.present[k] ?? 0, (prev[k] ?? 0) + (day.arrived[k] ?? 0) - (day.departed[k] ?? 0));
    }
    prev = day.present;
  }
  // Total nights equals the sum over groups of people x nights spent in July.
  const expected = groups.reduce((s, g) => {
    const start = Math.max(Date.parse(g.arrival), Date.parse("2026-07-01"));
    const end = Math.min(Date.parse(g.departure), Date.parse("2026-08-01"));
    return s + g.people * Math.max(0, (end - start) / 86_400_000);
  }, 0);
  assert.equal(sumCounts(m.totals.present), expected);
});

test("invalid groups are ignored", () => {
  const m = computeMonth(
    [
      { people: 2, originKey: "AT", arrival: "2026-09-10", departure: "2026-09-10" },
      { people: 0, originKey: "AT", arrival: "2026-09-10", departure: "2026-09-11" },
    ],
    2026,
    9,
  );
  assert.deepEqual(m.totals.arrived, {});
});

test("open days come from opening periods and from guests", () => {
  const m = computeMonth([{ people: 2, originKey: "AT", arrival: "2026-11-20", departure: "2026-11-21" }], 2026, 11);
  const open = openDays(m, [{ start: "2026-10-01", end: "2026-11-06" }]);
  assert.equal(open.filter(Boolean).length, 7);
  assert.equal(open[19], true);
  assert.equal(open[20], false); // departure morning only
});
