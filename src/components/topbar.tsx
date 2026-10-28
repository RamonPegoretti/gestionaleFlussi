import { getLocale, getTranslations } from "next-intl/server";
import { monthName, type MonthRef } from "@/lib/month";

type Props = {
  structure: { name: string; istatCode: string; comune: string };
  month: MonthRef;
  // Page that the month arrows link to, e.g. "/" or "/gruppi".
  basePath: string;
};

export async function Topbar({ structure, month, basePath }: Props) {
  const t = await getTranslations("nav");
  const locale = await getLocale();
  const meta = [structure.istatCode, structure.comune].filter(Boolean).join(" · ");
  return (
    <header className="topbar">
      <a className="brand" href={`/?m=${month.param}`}>
        {structure.name}
      </a>
      <span className="topbar-meta">{meta}</span>
      <span className="month-switch">
        <a href={`${basePath}?m=${month.prev}`} aria-label={t("prevMonth")}>
          ‹
        </a>
        <span>{monthName(month.year, month.month, locale)}</span>
        <a href={`${basePath}?m=${month.next}`} aria-label={t("nextMonth")}>
          ›
        </a>
      </span>
      <a className="topbar-link" href={`/gruppi?m=${month.param}`}>
        {t("groups")}
      </a>
      <a className="topbar-link" href={`/mese?m=${month.param}`}>
        {t("table")}
      </a>
      <a className="topbar-link" href="/impostazioni">
        {t("settings")}
      </a>
    </header>
  );
}

export function PlusIcon({ size = 44 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
      <path d="M12 4v16" />
      <path d="M4 12h16" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
      <path d="M12 3v13" />
      <path d="m6 10 6 6 6-6" />
      <path d="M4 21h16" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}
