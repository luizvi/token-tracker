import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type DbClient = BetterSQLite3Database<typeof schema>;

export interface ClientHandles {
  sqlite: Database.Database;
  db: DbClient;
}

export function createClient(path: string): ClientHandles {
  const sqlite = new Database(path);
  if (path !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("temp_store = MEMORY");
  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}
