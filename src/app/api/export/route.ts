import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMonthGroups, getOpeningPeriods, getStructure } from "@/lib/data";
import { parseMonthParam } from "@/lib/dates";
import { getExporter } from "@/lib/exporters";
import { computeMonth } from "@/lib/movements";

// Downloads the monthly form, e.g. /api/export?m=2026-09
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.structureId) return NextResponse.redirect(new URL("/login", req.url));

  const m = parseMonthParam(new URL(req.url).searchParams.get("m"));
  if (!m) return NextResponse.json({ error: "bad_month" }, { status: 400 });

  const structure = await getStructure(user.structureId);
  if (!structure) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [groups, periods] = await Promise.all([
    getMonthGroups(structure.id, m.year, m.month),
    getOpeningPeriods(structure.id),
  ]);
  const file = await getExporter(structure.exporter).export({
    structure,
    movement: computeMonth(groups, m.year, m.month),
    openingPeriods: periods,
  });

  return new Response(Buffer.from(file.data), {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.filename}"`,
      "cache-control": "no-store",
    },
  });
}
