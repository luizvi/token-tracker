import { eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { settings } from "../schema.js";

export function getSetting<T = unknown>(db: DbClient, key: string): T | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).all()[0];
  return row ? (JSON.parse(row.valueJson) as T) : null;
}

export function setSetting(db: DbClient, key: string, value: unknown): void {
  const row = { key, valueJson: JSON.stringify(value), updatedAt: Date.now() };
  db.insert(settings).values(row).onConflictDoUpdate({
    target: settings.key,
    set: { valueJson: row.valueJson, updatedAt: row.updatedAt },
  }).run();
}

export function getAllSettings(db: DbClient): Record<string, unknown> {
  const rows = db.select().from(settings).all();
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = JSON.parse(r.valueJson);
  return out;
}
