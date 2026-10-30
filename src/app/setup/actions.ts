"use server";

import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { createLogin, hasNoLogins } from "@/lib/logins";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// First start on a new database: creates the first structure and the administrator.
// Does nothing once any login exists.
export async function setupFirstRun(f: FormData) {
  if (!(await hasNoLogins())) redirect("/login");
  const name = str(f, "name");
  const beds = Number(str(f, "beds") || 0);
  const password = String(f.get("password") ?? "");
  if (!name || !Number.isInteger(beds) || beds < 0) redirect("/setup?err=structure");
  if (password.length < 8) redirect("/setup?err=weak_password");

  const db = await getDb();
  const [structure] = await db
    .insert(schema.structures)
    .values({ name, istatCode: str(f, "istatCode"), comune: str(f, "comune"), beds })
    .returning();
  const res = await createLogin({
    name: str(f, "adminName"),
    email: str(f, "email"),
    password,
    role: "superadmin",
    structureId: structure.id,
  });
  redirect(res.ok ? "/login" : `/setup?err=${res.error}`);
}
