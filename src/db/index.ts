// Database connection.
// - With DATABASE_URL set (Vercel + Neon): Neon's serverless HTTP driver.
// - Without it (local development and tests): PGlite, a Postgres that runs inside
//   Node and stores its data in .data/pglite. Migrations run automatically.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type DB = ReturnType<typeof drizzleNeon<typeof schema>>;

const globalForDb = globalThis as unknown as { db?: Promise<DB> };

async function createPglite(dataDir?: string): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) await mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  // Same query API as the Neon driver for everything the app uses.
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!globalForDb.db) {
    const url = process.env.DATABASE_URL;
    if (url) {
      globalForDb.db = Promise.resolve(drizzleNeon(neon(url), { schema }));
    } else {
      const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
      globalForDb.db = createPglite(dir === "memory" ? undefined : dir);
    }
  }
  return globalForDb.db;
}

export { schema };
