import { nightsBetween } from "@/lib/dates";
import { shortDate } from "@/lib/month";
import { originLabel, type Locale } from "@/lib/origins";

export function GroupTable({
  groups,
  locale,
  month,
  labels,
}: {
  groups: { id: string; originKey: string; people: number; arrival: string; departure: string }[];
  locale: Locale;
  month: string;
  labels: Record<"origin" | "people" | "arrival" | "departure" | "nights" | "actions" | "edit", string>;
}) {
  return (
    <table className="grid">
      <thead>
        <tr>
          <th>{labels.origin}</th>
          <th className="num">{labels.people}</th>
          <th style={{ paddingLeft: 32 }}>{labels.arrival}</th>
          <th>{labels.departure}</th>
          <th className="num">{labels.nights}</th>
          <th>
            <span className="sr-only">{labels.actions}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <tr key={g.id}>
            <td style={{ fontWeight: 500 }}>{originLabel(g.originKey, locale)}</td>
            <td className="num strong">{g.people}</td>
            <td style={{ paddingLeft: 32 }}>{shortDate(g.arrival)}</td>
            <td>{shortDate(g.departure)}</td>
            <td className="num">{nightsBetween(g.arrival, g.departure)}</td>
            <td className="num" style={{ padding: "4px 0" }}>
              <a href={`/gruppo/${g.id}?m=${month}`} style={{ display: "inline-flex", alignItems: "center", minHeight: 40, padding: "0 14px", fontWeight: 500 }}>
                {labels.edit}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
