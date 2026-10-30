import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { hasNoLogins } from "@/lib/logins";
import { setupFirstRun } from "./actions";

// Shown only on a brand-new database, before anyone can log in.
export default async function Setup({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  if (!(await hasNoLogins())) redirect("/login");
  const t = await getTranslations("setup");
  const ts = await getTranslations("settings");
  const { err } = await searchParams;
  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <header className="topbar">
        <span className="brand">Gestionale Flussi</span>
      </header>
      <h1 className="title">{t("title")}</h1>
      <p className="muted">{t("intro")}</p>
      {err && <p className="notice warn">{ts(`err.${err}` as "err.structure")}</p>}
      <form action={setupFirstRun} className="form-grid">
        <h2 className="section">{ts("structure")}</h2>
        <label>
          {ts("name")}
          <input name="name" defaultValue="Rifugio Antelao" required />
        </label>
        <label>
          {ts("istatCode")}
          <input name="istatCode" defaultValue="P0250390001" />
        </label>
        <label>
          {ts("comune")}
          <input name="comune" defaultValue="Pieve di Cadore" />
        </label>
        <label>
          {ts("beds")}
          <input name="beds" type="number" min={0} defaultValue={24} />
        </label>
        <h2 className="section" style={{ marginTop: 16 }}>
          {t("admin")}
        </h2>
        <label>
          {ts("loginName")}
          <input name="adminName" required />
        </label>
        <label>
          {ts("email")}
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          {ts("password")}
          <input name="password" type="password" minLength={8} required autoComplete="new-password" />
        </label>
        <button className="btn-primary">{t("submit")}</button>
      </form>
    </main>
  );
}
