// Applies the SQL migrations in ./drizzle to the Neon database in DATABASE_URL.
// (Locally, without DATABASE_URL, the embedded database migrates itself.)

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL not set: nothing to do (the local database migrates itself).");
    return;
  }
  await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
