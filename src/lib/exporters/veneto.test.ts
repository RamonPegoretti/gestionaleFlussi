import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { computeMonth } from "../movements";
import { venetoExporter } from "./veneto";

const structure = { name: "Rifugio Antelao", istatCode: "P0250390001", comune: "Pieve di Cadore", beds: 24 };

async function reload(data: Uint8Array) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data.buffer as ArrayBuffer);
  return wb.worksheets[0];
}

// ExcelJS does not write a cached result of 0, so a formula without one reads as 0.
const num = (v: ExcelJS.CellValue) =>
  typeof v === "object" && v !== null && "formula" in v ? ((v as { result?: number }).result ?? 0) : v;

test("November: same layout as the template, with the numbers filled in", async () => {
  const movement = computeMonth(
    [
      { people: 4, originKey: "DE", arrival: "2026-10-31", departure: "2026-11-02" },
      { people: 7, originKey: "IT-VEN", arrival: "2026-11-01", departure: "2026-11-02" },
    ],
    2026,
    11,
  );
  const file = await venetoExporter.export({
    structure,
    movement,
    openingPeriods: [{ start: "2026-11-01", end: "2026-11-06" }],
  });
  assert.equal(file.filename, "ISTAT_P0250390001_2026-11.xlsx");
  const ws = await reload(file.data);

  assert.equal(ws.name, "30 giorni");
  assert.equal(ws.getCell("A8").value, "GIORNO");
  assert.equal(ws.getCell("M8").value, "germania");
  assert.equal(ws.getCell("BP8").value, "veneto");
  assert.equal(ws.getCell("B2").value, "RIFUGIO ANTELAO");
  assert.equal(ws.getCell("C3").value, "P0250390001");
  assert.equal(ws.getCell("I3").value, 6);
  assert.equal(ws.getCell("I4").value, "NOVEMBRE");
  assert.equal(ws.getCell("B5").value, "PIEVE DI CADORE");

  // Germany (column M) carried over from October.
  assert.equal(ws.getCell("M9").value, 4);
  // Day 1: Veneto arrives (BP), Germany still present.
  assert.equal(ws.getCell("BP10").value, 7);
  assert.equal(num(ws.getCell("BP12").value), 7);
  assert.equal(num(ws.getCell("M12").value), 4);
  assert.equal(num(ws.getCell("CG12").value), 11);
  // Day 2: everybody leaves.
  assert.equal(ws.getCell("A14").value, 2);
  assert.equal(ws.getCell("M14").value, 4);
  assert.equal(ws.getCell("BP14").value, 7);
  assert.equal(num(ws.getCell("CG15").value), 0);
  // Formulas are kept.
  assert.deepEqual((ws.getCell("C12").value as ExcelJS.CellFormulaValue).formula, "(C9+C10)-C11");
  // Totals row stays at row 100, as in the template.
  assert.equal(ws.getCell("A101").value, "TOTALE");
  assert.equal(num(ws.getCell("CG100").value), 7);
  assert.equal(num(ws.getCell("CG101").value), 11);
  assert.equal(num(ws.getCell("CG102").value), 11);
  // Beds on open days only.
  assert.equal(ws.getCell("CH10").value, 24);
  assert.equal(ws.getCell("CH28").value, 0);
  assert.equal(num(ws.getCell("CH100").value), 6 * 24);
});

test("31-day and 28-day months get the right number of day blocks", async () => {
  for (const [year, month, days] of [
    [2026, 8, 31],
    [2027, 2, 28],
  ] as const) {
    const movement = computeMonth(
      [{ people: 2, originKey: "AT", arrival: `${year}-${String(month).padStart(2, "0")}-${days}`, departure: "2030-01-01" }],
      year,
      month,
    );
    const file = await venetoExporter.export({ structure, movement, openingPeriods: [] });
    const ws = await reload(file.data);
    const rT = 10 + 3 * days;
    assert.equal(ws.name, `${days} giorni`);
    assert.equal(ws.getCell(rT - 2, 1).value, days);
    assert.equal(ws.getCell(rT + 1, 1).value, "TOTALE");
    assert.equal(ws.getCell(rT, 3).value && num(ws.getCell(rT, 3).value), 2);
    assert.equal(ws.getCell(rT + 4, 1).value, null);
    assert.equal(ws.getCell("I3").value, 1);
  }
});
