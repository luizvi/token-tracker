import { createClient, runMigrations, seedDatabase, type DbClient } from "@tracker/db";
import { join } from "node:path";

let cachedDb: DbClient | null = null;

function resolveDbPath(): string {
  if (process.env.TRACKER_DB_PATH) return process.env.TRACKER_DB_PATH;
  const root = process.env.TRACKER_ROOT ?? join(process.env.HOME ?? "", "dev", "tracker");
  return join(root, "data", "tracker.db");
}

export function getDb(): DbClient {
  if (!cachedDb) {
    const { db } = createClient(resolveDbPath());
    runMigrations(db);
    seedDatabase(db);
    cachedDb = db;
  }
  return cachedDb;
}
