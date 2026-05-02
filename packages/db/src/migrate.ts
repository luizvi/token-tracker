import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { DbClient } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function runMigrations(db: DbClient): void {
  migrate(db, { migrationsFolder: join(__dirname, "migrations") });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { createClient } = await import("./client.js");
  const path = process.env.TRACKER_DB_PATH ?? "data/tracker.db";
  const { sqlite, db } = createClient(path);
  runMigrations(db);
  sqlite.close();
  console.log(`✓ Migrations applied to ${path}`);
}
