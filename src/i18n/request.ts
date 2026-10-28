import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["it", "en", "de"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "locale";

// Italian by default; English and German are chosen in the settings and kept in a cookie.
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: AppLocale = (LOCALES as readonly string[]).includes(value ?? "") ? (value as AppLocale) : "it";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Europe/Rome",
  };
});
