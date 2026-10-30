import { asc, count, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { BackIcon } from "@/components/topbar";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { EXPORTERS } from "@/lib/exporters";
import { switchStructure } from "../impostazioni/actions";
import { createStructure } from "./actions";

// For the app's administrator: all structures, and adding a new one.
export default async function Admin({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const user = await requireRole("superadmin");
  const t = await getTranslations("admin");
  const ts = await getTranslations("settings");
  const { ok, err } = await searchParams;
  const db = await getDb();
  const structures = await db
    .select({
      id: schema.structures.id,
      name: schema.structures.name,
      istatCode: schema.structures.istatCode,
      comune: schema.structures.comune,
      groups: count(schema.groups.id),
    })
    .from(schema.structures)
    .leftJoin(schema.groups, eq(schema.groups.structureId, schema.structures.id))
    .groupBy(schema.structures.id)
    .orderBy(asc(schema.structures.name));

  return (
    <main className="page">
      <header className="topbar">
        <a className="back-link" href="/">
          <BackIcon />
          {ts("back")}
        </a>
      </header>
      <h1 className="title">{t("title")}</h1>
      {ok && <p className="notice">{ts("saved")}</p>}
      {err && <p className="notice warn">{ts(`err.${err}` as "err.structure")}</p>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>{ts("name")}</th>
              <th>{ts("istatCode")}</th>
              <th>{ts("comune")}</th>
              <th className="num">{t("groups")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {structures.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td>{s.istatCode}</td>
                <td>{s.comune}</td>
                <td className="num">{s.groups}</td>
                <td className="num">
                  {s.id === user.structureId ? (
                    <span className="muted">{t("current")}</span>
                  ) : (
                    <form action={switchStructure}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn link">{t("open")}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="settings-section">
        <h2 className="section">{t("newStructure")}</h2>
        <form action={createStructure} className="form-grid">
          <label>
            {ts("name")}
            <input name="name" required />
          </label>
          <label>
            {ts("istatCode")}
            <input name="istatCode" />
          </label>
          <label>
            {ts("comune")}
            <input name="comune" />
          </label>
          <label>
            {ts("beds")}
            <input name="beds" type="number" min={0} defaultValue={0} />
          </label>
          <label>
            {t("exporter")}
            <select name="exporter">
              {Object.values(EXPORTERS).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("ownerName")}
            <input name="ownerName" required />
          </label>
          <label>
            {t("ownerEmail")}
            <input name="ownerEmail" type="email" required />
          </label>
          <label>
            {t("ownerPassword")}
            <input name="ownerPassword" type="password" minLength={8} required autoComplete="new-password" />
          </label>
          <div>
            <button className="btn">{t("create")}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
