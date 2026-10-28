import { redirect } from "next/navigation";
import { GroupPage } from "@/components/group-page";
import { requireStructureUser } from "@/lib/auth";
import { getFrequentOrigins, getStructure } from "@/lib/data";
import { addDays, monthStart, todayISO } from "@/lib/dates";
import { resolveMonth } from "@/lib/month";

export default async function NewGroup({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireStructureUser();
  const structure = await getStructure(user.structureId);
  if (!structure) redirect("/login");
  const month = resolveMonth((await searchParams).m);
  const today = todayISO();
  // Today when adding in the current month, otherwise the 1st of the month on screen.
  const arrival = today.startsWith(month.param) ? today : monthStart(month.year, month.month);
  return (
    <GroupPage
      structureName={structure.name}
      month={month}
      frequent={await getFrequentOrigins(structure.id)}
      initial={{ people: null, originKey: null, arrival, departure: addDays(arrival, 1) }}
      startToday={arrival === today}
    />
  );
}
