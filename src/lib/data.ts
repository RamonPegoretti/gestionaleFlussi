import "server-only";
import { and, asc, count, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { monthEnd, monthStart } from "./dates";
import type { GroupDraft } from "./group-input";
import { validateGroup } from "./group-input";

// Every function here takes the structure id of the logged-in user and filters by it.

export async function getStructure(structureId: string) {
  const db = await getDb();
  const [s] = await db.select().from(schema.structures).where(eq(schema.structures.id, structureId));
  return s ?? null;
}

export async function getOpeningPeriods(structureId: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.openingPeriods)
    .where(eq(schema.openingPeriods.structureId, structureId))
    .orderBy(asc(schema.openingPeriods.start));
}

export type GroupRow = typeof schema.groups.$inferSelect;

// Groups that touch the month: arrive in it, leave in it, or stay across it.
// A group leaving on day 1 is included because it counts as departed that day.
export async function getMonthGroups(structureId: string, year: number, month: number): Promise<GroupRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.groups)
    .where(
      and(
        eq(schema.groups.structureId, structureId),
        isNull(schema.groups.deletedAt),
        lte(schema.groups.arrival, monthEnd(year, month)),
        gte(schema.groups.departure, monthStart(year, month)),
      ),
    )
    .orderBy(asc(schema.groups.arrival), asc(schema.groups.createdAt));
}

export async function getRecentGroups(structureId: string, year: number, month: number, limit: number) {
  const db = await getDb();
  return db
    .select()
    .from(schema.groups)
    .where(
      and(
        eq(schema.groups.structureId, structureId),
        isNull(schema.groups.deletedAt),
        lte(schema.groups.arrival, monthEnd(year, month)),
        gte(schema.groups.arrival, monthStart(year, month)),
      ),
    )
    .orderBy(desc(schema.groups.arrival), desc(schema.groups.createdAt))
    .limit(limit);
}

export async function getGroup(structureId: string, id: string) {
  const db = await getDb();
  const [g] = await db
    .select()
    .from(schema.groups)
    .where(and(eq(schema.groups.id, id), eq(schema.groups.structureId, structureId), isNull(schema.groups.deletedAt)));
  return g ?? null;
}

export type SaveResult =
  | { id: string; status: "saved" | "deleted" | "stale" }
  | { id: string; status: "invalid"; errors: string[] };

// Creates, updates or deletes a group. Used by the form and by offline sync, so
// it is idempotent: sending the same change twice gives the same result.
// When two devices edit the same group, the change made last wins.
export async function saveGroup(structureId: string, userId: string, draft: GroupDraft): Promise<SaveResult> {
  const errors = validateGroup(draft);
  if (errors.length) return { id: draft.id, status: "invalid", errors };
  const updatedAt = new Date(draft.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return { id: draft.id, status: "invalid", errors: ["updatedAt"] };

  const db = await getDb();
  const [existing] = await db.select().from(schema.groups).where(eq(schema.groups.id, draft.id));
  if (existing && existing.structureId !== structureId) return { id: draft.id, status: "invalid", errors: ["id"] };
  if (existing && existing.updatedAt > updatedAt) return { id: draft.id, status: "stale" };

  if (draft.deleted) {
    if (existing && !existing.deletedAt) {
      await db
        .update(schema.groups)
        .set({ deletedAt: new Date(), updatedAt })
        .where(eq(schema.groups.id, draft.id));
      await logEvent(structureId, userId, draft.id, "delete", existing);
    }
    return { id: draft.id, status: "deleted" };
  }

  const values = {
    people: draft.people,
    originKey: draft.originKey,
    arrival: draft.arrival,
    departure: draft.departure,
    updatedAt,
  };
  if (existing) {
    await db.update(schema.groups).set({ ...values, deletedAt: null }).where(eq(schema.groups.id, draft.id));
    await logEvent(structureId, userId, draft.id, "update", { before: existing, after: values });
  } else {
    await db
      .insert(schema.groups)
      .values({ id: draft.id, structureId, createdBy: userId, ...values })
      .onConflictDoNothing();
    await logEvent(structureId, userId, draft.id, "create", values);
  }
  return { id: draft.id, status: "saved" };
}

async function logEvent(structureId: string, userId: string, groupId: string, action: string, data: unknown) {
  const db = await getDb();
  await db.insert(schema.groupEvents).values({ structureId, userId, groupId, action, data });
}

// Origins this structure uses most, to show them first in the picker.
export async function getFrequentOrigins(structureId: string, limit = 30): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ key: schema.groups.originKey, n: count() })
    .from(schema.groups)
    .where(and(eq(schema.groups.structureId, structureId), isNull(schema.groups.deletedAt)))
    .groupBy(schema.groups.originKey)
    .orderBy(desc(count()))
    .limit(limit);
  return rows.map((r) => r.key);
}
