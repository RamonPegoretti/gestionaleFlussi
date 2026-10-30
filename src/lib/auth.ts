import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema, type DB } from "@/db";
import type { Role } from "./logins";

export type { Role };

function createAuth(db: DB) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    // Accounts are created by the structure's owner (or by the admin), never by self sign-up.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
    session: { expiresIn: 60 * 60 * 24 * 60 }, // stay logged in for 60 days on a shared PC
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "staff" },
        structureId: { type: "string", input: false, required: false },
      },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { auth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  globalForAuth.auth ??= getDb().then(createAuth);
  return globalForAuth.auth;
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  structureId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const auth = await getAuth();
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & { role?: string; structureId?: string | null };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role as Role) ?? "staff",
    structureId: u.structureId ?? null,
  };
}

// For pages and actions that work inside one structure. Every query must use
// the returned structureId, so that a rifugio only ever sees its own data.
export async function requireStructureUser(): Promise<CurrentUser & { structureId: string }> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!u.structureId) redirect(u.role === "superadmin" ? "/admin" : "/login?e=nostructure");
  return u as CurrentUser & { structureId: string };
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!roles.includes(u.role)) redirect("/");
  return u;
}
