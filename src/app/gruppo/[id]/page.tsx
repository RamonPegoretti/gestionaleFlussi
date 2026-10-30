import { notFound, redirect } from "next/navigation";
import { GroupPage } from "@/components/group-page";
import { requireStructureUser } from "@/lib/auth";
import { getFrequentOrigins, getGroup, getStructure } from "@/lib/data";
import { resolveMonth } from "@/lib/month";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditGroup({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireStructureUser();
  const structure = await getStructure(user.structureId);
  if (!structure) redirect("/login");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const group = await getGroup(structure.id, id);
  if (!group) notFound();
  const month = resolveMonth((await searchParams).m ?? group.arrival.slice(0, 7));
  return (
    <GroupPage
      structureName={structure.name}
      month={month}
      frequent={await getFrequentOrigins(structure.id)}
      initial={{
        id: group.id,
        people: group.people,
        originKey: group.originKey,
        arrival: group.arrival,
        departure: group.departure,
      }}
    />
  );
}
