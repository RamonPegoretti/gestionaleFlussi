"use server";

import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { createLogin } from "@/lib/logins";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// A new rifugio: the structure plus its owner's login. No code changes needed.
export async function createStructure(f: FormData) {
  await requireRole("superadmin");
  const name = str(f, "name");
  const beds = Number(str(f, "beds") || 0);
  if (!name || !Number.isInteger(beds) || beds < 0) redirect("/admin?err=structure");
  const db = await getDb();
  const [s] = await db
    .insert(schema.structures)
    .values({ name, istatCode: str(f, "istatCode"), comune: str(f, "comune"), beds, exporter: str(f, "exporter") || "veneto" })
    .returning();
  const res = await createLogin({
    name: str(f, "ownerName"),
    email: str(f, "ownerEmail"),
    password: String(f.get("ownerPassword") ?? ""),
    role: "owner",
    structureId: s.id,
  });
  redirect(res.ok ? "/admin?ok=1" : `/admin?err=${res.error}`);
}
