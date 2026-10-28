import { asc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BackIcon } from "@/components/topbar";
import { getDb, schema } from "@/db";
import { requireStructureUser } from "@/lib/auth";
import { getOpeningPeriods, getStructure } from "@/lib/data";
import {
  addLogin,
  addPeriod,
  changePassword,
  logout,
  removeLogin,
  removePeriod,
  setLanguage,
  updateStructure,
} from "./actions";

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const user = await requireStructureUser();
  const structure = await getStructure(user.structureId);
  if (!structure) redirect("/login");
  const t = await getTranslations("settings");
  const locale = await getLocale();
  const { ok, err } = await searchParams;
  const isOwner = user.role === "owner" || user.role === "superadmin";
  const db = await getDb();
  const [periods, logins] = await Promise.all([
    getOpeningPeriods(structure.id),
    db
      .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email, role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.structureId, structure.id))
      .orderBy(asc(schema.user.name)),
  ]);

  return (
    <main className="page">
      <header className="topbar">
        <a className="back-link" href="/">
          <BackIcon />
          {t("back")}
        </a>
        <span style={{ marginLeft: "auto" }} className="muted">
          {user.name} · {user.email}
        </span>
        {user.role === "superadmin" && (
          <a className="topbar-link" href="/admin">
            {t("admin")}
          </a>
        )}
        <form action={logout}>
          <button className="btn ghost">{t("logout")}</button>
        </form>
      </header>
      <h1 className="title">{t("title")}</h1>

      {ok && <p className="notice" role="status">{t("saved")}</p>}
      {err && <p className="notice warn" role="alert">{t(`err.${err}` as "err.structure")}</p>}

      <section className="settings-section">
        <h2 className="section">{t("language")}</h2>
        <form action={setLanguage} className="inline-form" style={{ marginTop: 16 }}>
          {(["it", "en", "de"] as const).map((l) => (
            <button key={l} name="locale" value={l} className={l === locale ? "btn" : "btn ghost"}>
              {t(`lang.${l}`)}
            </button>
          ))}
        </form>
      </section>

      <section className="settings-section">
        <h2 className="section">{t("structure")}</h2>
        <form action={updateStructure} className="form-grid">
          <label>
            {t("name")}
            <input name="name" defaultValue={structure.name} required disabled={!isOwner} />
          </label>
          <label>
            {t("istatCode")}
            <input name="istatCode" defaultValue={structure.istatCode} disabled={!isOwner} />
          </label>
          <label>
            {t("comune")}
            <input name="comune" defaultValue={structure.comune} disabled={!isOwner} />
          </label>
          <label>
            {t("beds")}
            <input name="beds" type="number" min={0} defaultValue={structure.beds} disabled={!isOwner} />
          </label>
          {isOwner && (
            <div>
              <button className="btn">{t("save")}</button>
            </div>
          )}
        </form>
      </section>

      <section className="settings-section">
        <h2 className="section">{t("periods")}</h2>
        <p className="muted">{t("periodsHelp")}</p>
        {periods.length > 0 && (
          <div className="table-wrap">
            <table className="grid" style={{ minWidth: 0, maxWidth: 560 }}>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.start.split("-").reverse().join(".")} → {p.end.split("-").reverse().join(".")}
                    </td>
                    <td className="num">
                      {isOwner && (
                        <form action={removePeriod}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn link">{t("remove")}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isOwner && (
          <form action={addPeriod} className="inline-form form-grid" style={{ maxWidth: "none" }}>
            <label>
              {t("from")}
              <input name="start" type="date" required />
            </label>
            <label>
              {t("to")}
              <input name="end" type="date" required />
            </label>
            <button className="btn">{t("addPeriod")}</button>
          </form>
        )}
      </section>

      <section className="settings-section">
        <h2 className="section">{t("logins")}</h2>
        <div className="table-wrap">
          <table className="grid" style={{ minWidth: 0 }}>
            <tbody>
              {logins.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.name}</td>
                  <td>{l.email}</td>
                  <td className="muted">{t(`role.${l.role}` as "role.staff")}</td>
                  <td className="num">
                    {isOwner && l.id !== user.id && l.role !== "superadmin" && (
                      <form action={removeLogin}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="btn link">{t("remove")}</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isOwner && (
          <form action={addLogin} className="form-grid">
            <label>
              {t("loginName")}
              <input name="name" required />
            </label>
            <label>
              {t("email")}
              <input name="email" type="email" required />
            </label>
            <label>
              {t("password")}
              <input name="password" type="password" minLength={8} required autoComplete="new-password" />
            </label>
            <label>
              {t("roleLabel")}
              <select name="role" defaultValue="staff">
                <option value="staff">{t("role.staff")}</option>
                <option value="owner">{t("role.owner")}</option>
              </select>
            </label>
            <div>
              <button className="btn">{t("addLogin")}</button>
            </div>
          </form>
        )}
      </section>

      <section className="settings-section">
        <h2 className="section">{t("changePassword")}</h2>
        <form action={changePassword} className="form-grid">
          <label>
            {t("currentPassword")}
            <input name="current" type="password" required autoComplete="current-password" />
          </label>
          <label>
            {t("newPassword")}
            <input name="next" type="password" minLength={8} required autoComplete="new-password" />
          </label>
          <div>
            <button className="btn">{t("save")}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
