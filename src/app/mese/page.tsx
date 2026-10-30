import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { requireStructureUser } from "@/lib/auth";
import { getMonthGroups, getOpeningPeriods, getStructure } from "@/lib/data";
import { monthName, resolveMonth } from "@/lib/month";
import { computeMonth, openDays, type Counts } from "@/lib/movements";
import { ORIGINS, REGIONS, type Locale } from "@/lib/origins";

const ITALY = new Set(REGIONS.map((r) => r.key));

function split(c: Counts) {
  let it = 0;
  let foreign = 0;
  for (const [k, v] of Object.entries(c)) {
    if (ITALY.has(k)) it += v;
    else foreign += v;
  }
  return { it, foreign, total: it + foreign };
}

// The month as the form will show it: one line per day, then totals per origin.
export default async function MonthTable({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireStructureUser();
  const structure = await getStructure(user.structureId);
  if (!structure) redirect("/login");
  const month = resolveMonth((await searchParams).m);
  const t = await getTranslations("table");
  const locale = (await getLocale()) as Locale;
  const [groups, periods] = await Promise.all([
    getMonthGroups(structure.id, month.year, month.month),
    getOpeningPeriods(structure.id),
  ]);
  const mv = computeMonth(groups, month.year, month.month);
  const open = openDays(mv, periods);
  const prev = split(mv.carriedOver);
  const tot = { a: split(mv.totals.arrived), d: split(mv.totals.departed), p: split(mv.totals.present) };
  const origins = ORIGINS.filter((o) => mv.totals.arrived[o.key] || mv.totals.present[o.key] || mv.carriedOver[o.key]);

  return (
    <main className="page">
      <Topbar structure={structure} month={month} basePath="/mese" />
      <h1 className="title">{monthName(month.year, month.month, locale)}</h1>
      <p className="muted">{t("intro", { open: open.filter(Boolean).length })}</p>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>{t("day")}</th>
              <th className="num">{t("arrivedIt")}</th>
              <th className="num">{t("arrivedForeign")}</th>
              <th className="num">{t("departed")}</th>
              <th className="num">{t("present")}</th>
              <th className="num">{t("beds")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="muted">{t("carriedOver")}</td>
              <td />
              <td />
              <td />
              <td className="num">{prev.total}</td>
              <td />
            </tr>
            {mv.days.map((d, i) => {
              const a = split(d.arrived);
              return (
                <tr key={d.day} className={open[i] ? undefined : "closed"}>
                  <td>{d.day}</td>
                  <td className="num">{a.it || ""}</td>
                  <td className="num">{a.foreign || ""}</td>
                  <td className="num">{split(d.departed).total || ""}</td>
                  <td className="num strong">{split(d.present).total}</td>
                  <td className="num">{open[i] ? structure.beds : t("closed")}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>{t("total")}</td>
              <td className="num">{tot.a.it}</td>
              <td className="num">{tot.a.foreign}</td>
              <td className="num">{tot.d.total}</td>
              <td className="num">{tot.p.total}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <h2 className="section" style={{ marginTop: 48 }}>
        {t("byOrigin")}
      </h2>
      {origins.length === 0 ? (
        <p className="muted">{t("empty")}</p>
      ) : (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>{t("origin")}</th>
                <th className="num">{t("carriedOverShort")}</th>
                <th className="num">{t("arrived")}</th>
                <th className="num">{t("departed")}</th>
                <th className="num">{t("nights")}</th>
              </tr>
            </thead>
            <tbody>
              {origins.map((o) => (
                <tr key={o.key}>
                  <td>{o[locale]}</td>
                  <td className="num">{mv.carriedOver[o.key] ?? 0}</td>
                  <td className="num">{mv.totals.arrived[o.key] ?? 0}</td>
                  <td className="num">{mv.totals.departed[o.key] ?? 0}</td>
                  <td className="num strong">{mv.totals.present[o.key] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
