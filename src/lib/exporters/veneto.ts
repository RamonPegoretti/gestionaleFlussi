// Veneto exporter: fills the ISTAT IST_00139 Excel form ("30 giorni" sheet used at
// Rifugio Antelao) with a month of movements.
//
// The template has one block of three rows per day (arrivati / partiti / presenti)
// for 30 days. For months with 28, 29 or 31 days the day blocks are rebuilt with
// the template's own styles, so the layout stays the same.

import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { COUNTRIES, REGIONS } from "../origins";
import { openDays, type Counts } from "../movements";
import type { ExportInput, ExportFile, Exporter } from "./types";

const TEMPLATE = path.join(process.cwd(), "templates", "veneto", "ist00139.xlsx");

const MONTHS_IT = [
  "GENNAIO",
  "FEBBRAIO",
  "MARZO",
  "APRILE",
  "MAGGIO",
  "GIUGNO",
  "LUGLIO",
  "AGOSTO",
  "SETTEMBRE",
  "OTTOBRE",
  "NOVEMBRE",
  "DICEMBRE",
];

// Column numbers (A = 1).
const COL_FIRST_COUNTRY = 3; // C
const COL_TOTAL_FOREIGN = COL_FIRST_COUNTRY + COUNTRIES.length; // BJ
const COL_FIRST_REGION = COL_TOTAL_FOREIGN + 1; // BK
const COL_TOTAL_ITALY = COL_FIRST_REGION + REGIONS.length; // CF
const COL_TOTAL = COL_TOTAL_ITALY + 1; // CG
const COL_BEDS = COL_TOTAL + 1; // CH  "Letti disponibili"
const COL_LAST = COL_BEDS + 2; // CJ  (CI, CJ: hotel-only room counts, left empty)

const ROW_PREV = 9;
const ROW_FIRST_DAY = 10;
const TEMPLATE_DAYS = 30;
const TEMPLATE_TOTALS = ROW_FIRST_DAY + 3 * TEMPLATE_DAYS; // 100
const TEMPLATE_LAST_ROW = 136;

export const ORIGIN_COLUMNS: Record<string, number> = Object.fromEntries([
  ...COUNTRIES.map((o, i) => [o.key, COL_FIRST_COUNTRY + i]),
  ...REGIONS.map((o, i) => [o.key, COL_FIRST_REGION + i]),
]);

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const L = (col: number, row: number) => `${colLetter(col)}${row}`;

type RowSnapshot = { height?: number; styles: Partial<ExcelJS.Style>[] };

function snapshotRow(ws: ExcelJS.Worksheet, row: number): RowSnapshot {
  const r = ws.getRow(row);
  const styles: Partial<ExcelJS.Style>[] = [];
  for (let c = 1; c <= COL_LAST; c++) styles[c] = structuredClone(r.getCell(c).style ?? {});
  return { height: r.height, styles };
}

function applyRow(ws: ExcelJS.Worksheet, row: number, snap: RowSnapshot) {
  const r = ws.getRow(row);
  if (snap.height) r.height = snap.height;
  for (let c = 1; c <= COL_LAST; c++) r.getCell(c).style = structuredClone(snap.styles[c]);
}

function originSums(counts: Counts) {
  let foreign = 0;
  let italy = 0;
  for (const o of COUNTRIES) foreign += counts[o.key] ?? 0;
  for (const o of REGIONS) italy += counts[o.key] ?? 0;
  return { foreign, italy, total: foreign + italy };
}

// Writes one row of origin numbers plus the three total columns as formulas
// (with their results, so the file reads right even without recalculation).
function writeOriginRow(
  ws: ExcelJS.Worksheet,
  row: number,
  value: (col: number, key: string) => ExcelJS.CellValue,
  counts: Counts,
) {
  for (const [key, col] of Object.entries(ORIGIN_COLUMNS)) ws.getCell(row, col).value = value(col, key);
  const s = originSums(counts);
  ws.getCell(row, COL_TOTAL_FOREIGN).value = {
    formula: `SUM(${L(COL_FIRST_COUNTRY, row)}:${L(COL_TOTAL_FOREIGN - 1, row)})`,
    result: s.foreign,
  };
  ws.getCell(row, COL_TOTAL_ITALY).value = {
    formula: `SUM(${L(COL_FIRST_REGION, row)}:${L(COL_TOTAL_ITALY - 1, row)})`,
    result: s.italy,
  };
  ws.getCell(row, COL_TOTAL).value = {
    formula: `${L(COL_TOTAL_ITALY, row)}+${L(COL_TOTAL_FOREIGN, row)}`,
    result: s.total,
  };
}

export async function buildVenetoWorkbook(input: ExportInput): Promise<ExcelJS.Workbook> {
  const { structure, movement, openingPeriods } = input;
  const nDays = movement.days.length;

  const wb = new ExcelJS.Workbook();
  // (ExcelJS types predate the current Node Buffer type.)
  await wb.xlsx.load((await readFile(TEMPLATE)) as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];

  // 1. Remember the template's styles, then wipe everything below the header.
  const dayRows = [snapshotRow(ws, ROW_FIRST_DAY), snapshotRow(ws, ROW_FIRST_DAY + 1), snapshotRow(ws, ROW_FIRST_DAY + 2)];
  const lastDayRows = [
    snapshotRow(ws, TEMPLATE_TOTALS - 3),
    snapshotRow(ws, TEMPLATE_TOTALS - 2),
    snapshotRow(ws, TEMPLATE_TOTALS - 1),
  ];
  const totalRows = [snapshotRow(ws, TEMPLATE_TOTALS), snapshotRow(ws, TEMPLATE_TOTALS + 1), snapshotRow(ws, TEMPLATE_TOTALS + 2)];

  for (const key of Object.keys((ws as unknown as { _merges: Record<string, unknown> })._merges)) {
    if (Number(key.replace(/^[A-Z]+/, "")) >= ROW_FIRST_DAY) ws.unMergeCells(key);
  }
  for (let row = ROW_FIRST_DAY; row <= Math.max(TEMPLATE_LAST_ROW, ROW_FIRST_DAY + 3 * nDays + 3); row++) {
    const r = ws.getRow(row);
    for (let c = 1; c <= COL_LAST; c++) {
      const cell = r.getCell(c);
      cell.value = null;
      cell.style = {};
    }
  }

  // 2. Header.
  const open = openDays(movement, openingPeriods);
  ws.getCell("B2").value = structure.name.toUpperCase();
  ws.getCell("C3").value = structure.istatCode;
  ws.getCell("I3").value = open.filter(Boolean).length;
  ws.getCell("I4").value = MONTHS_IT[movement.month - 1];
  ws.getCell("B5").value = structure.comune.toUpperCase();

  // 3. "Presenze del giorno precedente".
  writeOriginRow(ws, ROW_PREV, (_c, key) => movement.carriedOver[key] ?? 0, movement.carriedOver);

  // 4. One block of three rows per day.
  movement.days.forEach((day, i) => {
    const rA = ROW_FIRST_DAY + 3 * i;
    const rP = rA + 1;
    const rN = rA + 2;
    const styles = i === nDays - 1 ? lastDayRows : dayRows;
    applyRow(ws, rA, styles[0]);
    applyRow(ws, rP, styles[1]);
    applyRow(ws, rN, styles[2]);

    ws.getCell(rA, 2).value = "arrivati";
    ws.getCell(rP, 1).value = day.day;
    ws.getCell(rP, 2).value = "partiti";
    ws.getCell(rN, 2).value = "presenti";

    writeOriginRow(ws, rA, (_c, key) => day.arrived[key] ?? 0, day.arrived);
    writeOriginRow(ws, rP, (_c, key) => day.departed[key] ?? 0, day.departed);
    writeOriginRow(
      ws,
      rN,
      (col, key) => ({
        formula: `(${L(col, rA - 1)}+${L(col, rA)})-${L(col, rP)}`,
        result: day.present[key] ?? 0,
      }),
      day.present,
    );

    ws.getCell(rA, COL_BEDS).value = open[i] ? structure.beds : 0;
    for (let c = COL_BEDS; c <= COL_LAST; c++) ws.mergeCells(rA, c, rN, c);
  });

  // 5. Monthly totals.
  const rT = ROW_FIRST_DAY + 3 * nDays;
  totalRows.forEach((snap, k) => applyRow(ws, rT + k, snap));
  ws.getCell(rT, 2).value = "arrivati";
  ws.getCell(rT + 1, 1).value = "TOTALE";
  ws.getCell(rT + 1, 2).value = "partiti";
  ws.getCell(rT + 2, 2).value = "presenti";
  const totals = [movement.totals.arrived, movement.totals.departed, movement.totals.present];
  totals.forEach((counts, k) => {
    const row = rT + k;
    writeOriginRow(
      ws,
      row,
      (col, key) => ({
        formula: movement.days.map((_d, i) => L(col, ROW_FIRST_DAY + 3 * i + k)).join("+"),
        result: counts[key] ?? 0,
      }),
      counts,
    );
  });
  const lastDayRow = rT - 1;
  ws.getCell(rT, COL_BEDS).value = {
    formula: `SUM(${L(COL_BEDS, ROW_FIRST_DAY)}:${L(COL_BEDS, lastDayRow)})`,
    result: open.reduce((s, o) => s + (o ? structure.beds : 0), 0),
  };
  for (let c = COL_BEDS + 1; c <= COL_LAST; c++) {
    ws.getCell(rT, c).value = {
      formula: `SUM(${L(c, ROW_FIRST_DAY)}:${L(c, lastDayRow)})`,
      result: 0,
    };
  }
  for (let c = COL_BEDS; c <= COL_LAST; c++) ws.mergeCells(rT, c, rT + 2, c);

  // 6. Keep the sheet tidy: filter range, frozen panes, recalc on open.
  wb.definedNames.remove("'30 giorni'!$A$7:$CG$99", "Excel_BuiltIn__FilterDatabase");
  ws.name = `${nDays} giorni`;
  wb.definedNames.add(`'${ws.name}'!$A$7:$CG$${lastDayRow}`, "Excel_BuiltIn__FilterDatabase");
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 8, topLeftCell: "C9", activeCell: "C10", zoomScale: 75 }];
  wb.calcProperties = { fullCalcOnLoad: true };

  return wb;
}

export const venetoExporter: Exporter = {
  id: "veneto",
  label: "Veneto · ISTAT IST_00139",
  async export(input: ExportInput): Promise<ExportFile> {
    const wb = await buildVenetoWorkbook(input);
    const buf = await wb.xlsx.writeBuffer();
    const { year, month } = input.movement;
    const code = input.structure.istatCode || "struttura";
    return {
      filename: `ISTAT_${code}_${year}-${String(month).padStart(2, "0")}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: new Uint8Array(buf as ArrayBuffer),
    };
  },
};
