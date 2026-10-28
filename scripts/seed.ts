// First setup: creates Rifugio Antelao and the admin login.
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run db:seed
// Safe to run twice: existing structure and login are left alone.

import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { createLogin } from "../src/lib/logins";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");

  const db = await getDb();
  let [structure] = await db.select().from(schema.structures).where(eq(schema.structures.istatCode, "P0250390001"));
  if (!structure) {
    [structure] = await db
      .insert(schema.structures)
      .values({ name: "Rifugio Antelao", istatCode: "P0250390001", comune: "Pieve di Cadore", beds: 24 })
      .returning();
    console.log("Created structure", structure.name);
  }

  const res = await createLogin({ name: "Admin", email, password, role: "superadmin", structureId: structure.id });
  console.log(res.ok ? `Created login ${email}` : `Login not created: ${res.error}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
