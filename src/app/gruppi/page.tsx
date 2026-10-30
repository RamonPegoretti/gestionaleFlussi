import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { GroupTable } from "@/components/group-table";
import { Topbar } from "@/components/topbar";
import { requireStructureUser } from "@/lib/auth";
import { getMonthGroups, getStructure } from "@/lib/data";
import { monthName, resolveMonth } from "@/lib/month";
import type { Locale } from "@/lib/origins";

export default async function Groups({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireStructureUser();
  const structure = await getStructure(user.structureId);
  if (!structure) redirect("/login");
  const month = resolveMonth((await searchParams).m);
  const t = await getTranslations("home");
  const tg = await getTranslations("groups");
  const locale = (await getLocale()) as Locale;
  const groups = await getMonthGroups(structure.id, month.year, month.month);
  return (
    <main className="page">
      <Topbar structure={structure} month={month} basePath="/gruppi" />
      <h1 className="title">{tg("title", { month: monthName(month.year, month.month, locale) })}</h1>
      <p className="muted">{tg("intro")}</p>
      <p>
        <a href={`/gruppo/nuovo?m=${month.param}`} style={{ fontWeight: 600 }}>
          + {t("addGroup")}
        </a>
      </p>
      {groups.length === 0 ? (
        <p className="muted">{t("noGroups")}</p>
      ) : (
        <div className="table-wrap">
          <GroupTable
            groups={groups}
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
    </main>
  );
}
