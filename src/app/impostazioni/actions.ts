"use server";

import { and, eq, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { LOCALE_COOKIE, LOCALES } from "@/i18n/request";
import { getAuth, getCurrentUser, requireRole, requireStructureUser } from "@/lib/auth";
import { isISODate } from "@/lib/dates";
import { createLogin } from "@/lib/logins";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (q: string) => redirect(`/impostazioni?${q}`);

export async function setLanguage(f: FormData) {
  const locale = str(f, "locale");
  if ((LOCALES as readonly string[]).includes(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  back("ok=language");
}

async function requireOwner() {
  const u = await requireStructureUser();
  if (u.role !== "owner" && u.role !== "superadmin") back("err=forbidden");
  return u;
}

export async function updateStructure(f: FormData) {
  const u = await requireOwner();
  const beds = Number(str(f, "beds"));
  const name = str(f, "name");
  if (!name || !Number.isInteger(beds) || beds < 0 || beds > 10000) back("err=structure");
  const db = await getDb();
  await db
    .update(schema.structures)
    .set({ name, istatCode: str(f, "istatCode"), comune: str(f, "comune"), beds })
    .where(eq(schema.structures.id, u.structureId));
  back("ok=structure");
}

export async function addPeriod(f: FormData) {
  const u = await requireOwner();
  const start = str(f, "start");
  const end = str(f, "end");
  if (!isISODate(start) || !isISODate(end) || end < start) back("err=period");
  const db = await getDb();
  await db.insert(schema.openingPeriods).values({ structureId: u.structureId, start, end });
  back("ok=period");
}

export async function removePeriod(f: FormData) {
  const u = await requireOwner();
  const db = await getDb();
  await db
    .delete(schema.openingPeriods)
    .where(and(eq(schema.openingPeriods.id, str(f, "id")), eq(schema.openingPeriods.structureId, u.structureId)));
  back("ok=period");
}

export async function addLogin(f: FormData) {
  const u = await requireOwner();
  const role = str(f, "role") === "owner" ? "owner" : "staff";
  const res = await createLogin({
    name: str(f, "name"),
    email: str(f, "email"),
    password: String(f.get("password") ?? ""),
    role,
    structureId: u.structureId,
  });
  back(res.ok ? "ok=login" : `err=${res.error}`);
}

export async function removeLogin(f: FormData) {
  const u = await requireOwner();
  const db = await getDb();
  // Never yourself, and only logins of your own structure.
  await db
    .delete(schema.user)
    .where(
      and(
        eq(schema.user.id, str(f, "id")),
        eq(schema.user.structureId, u.structureId),
        ne(schema.user.id, u.id),
        ne(schema.user.role, "superadmin"),
      ),
    );
  back("ok=login");
}

export async function changePassword(f: FormData) {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  const auth = await getAuth();
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: String(f.get("current") ?? ""),
        newPassword: String(f.get("next") ?? ""),
        revokeOtherSessions: false,
      },
    });
  } catch {
    back("err=password");
  }
  back("ok=password");
}

export async function logout() {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

// Admin only: work inside another structure.
export async function switchStructure(f: FormData) {
  const u = await requireRole("superadmin");
  const db = await getDb();
  await db.update(schema.user).set({ structureId: str(f, "id") }).where(eq(schema.user.id, u.id));
  redirect("/");
}
