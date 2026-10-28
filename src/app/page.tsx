import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AddShortcut } from "@/components/add-shortcut";
import { GroupTable } from "@/components/group-table";
import { DownloadIcon, PlusIcon, Topbar } from "@/components/topbar";
import { requireStructureUser } from "@/lib/auth";
import { getMonthGroups, getStructure } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { longDate, monthName, resolveMonth } from "@/lib/month";
import { computeMonth, sumCounts } from "@/lib/movements";
import { COUNTRIES, originLabel, type Locale } from "@/lib/origins";

const FOREIGN = new Set(COUNTRIES.map((c) => c.key));

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireStructureUser();
  const structure = await getStructure(user.structureId);
  if (!structure) redirect("/login");

  const month = resolveMonth((await searchParams).m);
  const t = await getTranslations("home");
  const locale = (await getLocale()) as Locale;
  const groups = await getMonthGroups(structure.id, month.year, month.month);
  const mv = computeMonth(groups, month.year, month.month);

  // Tonight if we are looking at the current month, otherwise the month's last night.
  const today = todayISO();
  const isCurrent = today.slice(0, 7) === month.param;
  const focus = isCurrent ? mv.days.find((d) => d.date === today)! : mv.days[mv.days.length - 1];

  const arrived = sumCounts(mv.totals.arrived);
  const nights = sumCounts(mv.totals.present);
  const foreign = Object.entries(mv.totals.arrived).reduce((s, [k, v]) => s + (FOREIGN.has(k) ? v : 0), 0);
  const arrivingGroups = groups.filter((g) => g.arrival.startsWith(month.param)).length;

  const perNight = mv.days.map((d) => sumCounts(d.present));
  const peak = Math.max(0, ...perNight);
  const peakDay = peak > 0 ? mv.days[perNight.indexOf(peak)] : null;

  const origins = Object.entries(mv.totals.arrived).sort((a, b) => b[1] - a[1]);
  const top = origins.slice(0, 6);
  const rest = origins.slice(6);
  const maxOrigin = top[0]?.[1] ?? 1;

  const recent = [...groups]
    .filter((g) => g.arrival.startsWith(month.param))
    .sort((a, b) => (b.arrival === a.arrival ? +b.createdAt - +a.createdAt : b.arrival.localeCompare(a.arrival)))
    .slice(0, 8);

  const kpis = [
    {
      label: isCurrent ? t("presentTonight") : t("presentLastNight"),
      value: sumCounts(focus.present),
      sub: t("movesOfDay", { arrived: sumCounts(focus.arrived), departed: sumCounts(focus.departed) }),
    },
    { label: t("arrivals"), value: arrived, sub: t("groupsCount", { count: arrivingGroups }) },
    { label: t("nights"), value: nights, sub: t("nightsSub") },
    {
      label: t("foreign"),
      value: arrived ? `${Math.round((foreign / arrived) * 100)}%` : "–",
      sub: t("foreignSub", { foreign, total: arrived }),
    },
  ];

  return (
    <main className="page">
      <AddShortcut href={`/gruppo/nuovo?m=${month.param}`} />
      <Topbar structure={structure} month={month} basePath="/" />

      <div className="actions">
        <a className="btn-add" href={`/gruppo/nuovo?m=${month.param}`}>
          <span className="label">
            <PlusIcon />
            {t("addGroup")}
          </span>
          <span className="hint">{t("addGroupHint")}</span>
        </a>
        <a className="btn-download" href={`/api/export?m=${month.param}`} download>
          <span className="label">
            <DownloadIcon />
            {t("download")}
          </span>
          <span className="sub">{monthName(month.year, month.month, locale)} · IST_00139 · .xlsx</span>
        </a>
      </div>

      <section className="kpis" aria-label={t("numbersOf", { month: monthName(month.year, month.month, locale) })}>
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </section>

      <div className="split">
        <section className="main" aria-labelledby="chart-title">
          <h2 className="section" id="chart-title">
            {t("presentPerNight")}
          </h2>
          <p className="muted" style={{ margin: "2px 0 0" }}>
            {peakDay ? t("peak", { date: longDate(peakDay.date, locale), count: peak }) : t("noGuests")}
          </p>
          <div className="bars" role="img" aria-label={t("chartLabel", { peak })}>
            {perNight.map((n, i) => (
              <div
                key={i}
                className={n === 0 ? "empty" : peakDay && i === perNight.indexOf(peak) ? "peak" : undefined}
                style={n === 0 ? undefined : { height: `${Math.round((n / peak) * 100)}%` }}
                title={`${i + 1}: ${n}`}
              />
            ))}
          </div>
          <div className="bars-axis">
            <span>1</span>
            <span>8</span>
            <span>15</span>
            <span>22</span>
            <span>{mv.days.length}</span>
          </div>
        </section>

        <section className="side" aria-labelledby="origins-title">
          <h2 className="section" id="origins-title" style={{ marginBottom: 12 }}>
            {t("arrivalsByOrigin")}
          </h2>
          {top.length === 0 && <p className="muted">{t("noArrivals")}</p>}
          {top.map(([key, v]) => (
            <div className="origin-row" key={key}>
              <span>{originLabel(key, locale)}</span>
              <span className="track">
                <span className="fill" style={{ width: `${Math.round((v / maxOrigin) * 100)}%` }} />
              </span>
              <span className="n">{v}</span>
            </div>
          ))}
          {rest.length > 0 && (
            <div className="origin-row">
              <span>{t("otherOrigins", { count: rest.length })}</span>
              <span className="track">
                <span
                  className="fill"
                  style={{ width: `${Math.min(100, Math.round((rest.reduce((s, [, v]) => s + v, 0) / maxOrigin) * 100))}%` }}
                />
              </span>
              <span className="n">{rest.reduce((s, [, v]) => s + v, 0)}</span>
            </div>
          )}
        </section>
      </div>

      <section style={{ marginTop: 48 }} aria-labelledby="groups-title">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <h2 className="section" id="groups-title">
            {t("latestGroups")}
          </h2>
          <a href={`/gruppi?m=${month.param}`} style={{ fontWeight: 500 }}>
            {t("allGroups", { count: groups.length })} →
          </a>
        </div>
        {recent.length === 0 ? (
          <p className="muted">{t("noGroups")}</p>
        ) : (
          <div className="table-wrap">
            <GroupTable
              groups={recent}
              locale={locale}
              month={month.param}
              labels={{
                origin: t("colOrigin"),
                people: t("colPeople"),
                arrival: t("colArrival"),
                departure: t("colDeparture"),
                nights: t("colNights"),
                actions: t("colActions"),
                edit: t("edit"),
              }}
            />
          </div>
        )}
      </section>
    </main>
  );
}
