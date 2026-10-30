import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveGroup, type SaveResult } from "@/lib/data";
import type { GroupDraft } from "@/lib/group-input";

// Receives new, changed or deleted groups: one from the form, or many at once
// when a device comes back online.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.structureId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { groups?: unknown } | null;
  if (!body || !Array.isArray(body.groups) || body.groups.length > 500) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const results: SaveResult[] = [];
  for (const g of body.groups as GroupDraft[]) {
    results.push(await saveGroup(user.structureId, user.id, g));
  }
  return NextResponse.json({ results });
}
