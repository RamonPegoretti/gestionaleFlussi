// Creating logins. Kept apart from auth.ts so scripts (seed) can use it outside Next.js.

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Role = "owner" | "staff" | "superadmin";

// Creates a login with an email and password, the same way Better Auth's sign-up does.
export async function createLogin(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  structureId: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: "email_taken" | "weak_password" }> {
  if (input.password.length < 8) return { ok: false, error: "weak_password" };
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  const existing = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, email));
  if (existing.length) return { ok: false, error: "email_taken" };
  const id = randomUUID();
  const now = new Date();
  await db.insert(schema.user).values({
    id,
    name: input.name.trim() || email,
    email,
    emailVerified: true,
    role: input.role,
    structureId: input.structureId,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, id };
}

// True until the very first login has been created (a fresh database).
export async function hasNoLogins(): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
  return rows.length === 0;
}
