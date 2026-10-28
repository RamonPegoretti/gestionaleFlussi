import { getLocale, getTranslations } from "next-intl/server";
import { BackIcon } from "@/components/topbar";
import { GroupForm } from "@/components/group-form";
import { monthName, type MonthRef } from "@/lib/month";
import { COUNTRIES } from "@/lib/origins";

const DEFAULT_FOREIGN = ["DE", "AT", "NL", "CZ", "PL", "CH", "FR", "BE", "GB", "ES", "DK", "SI", "HU", "SE", "US", "IL", "AU", "CA", "X_EUR"];

type Props = {
  structureName: string;
  month: MonthRef;
  frequent: string[];
  initial: { id?: string; people: number | null; originKey: string | null; arrival: string; departure: string };
  startToday?: boolean;
};

export async function GroupPage({ structureName, month, frequent, initial, startToday }: Props) {
  const t = await getTranslations("group");
  const locale = await getLocale();
  const foreign = new Set(COUNTRIES.map((c) => c.key));
  const frequentCountries = [...new Set([...frequent.filter((k) => foreign.has(k)), ...DEFAULT_FOREIGN])];
  const backHref = `/?m=${month.param}`;
  return (
    <main className="page">
      <header className="topbar">
        <a className="back-link" href={backHref}>
          <BackIcon />
          {t("back")}
        </a>
        <span style={{ marginLeft: "auto" }} className="muted">
          {structureName} · {monthName(month.year, month.month, locale)}
        </span>
      </header>
      <h1 className="title">{initial.id ? t("editTitle") : t("newTitle")}</h1>
      <GroupForm initial={initial} frequentCountries={frequentCountries} backHref={backHref} startToday={startToday} />
    </main>
  );
}
