import { desc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { currencyRates } from "../schema.js";

export type CurrencyRateRow = typeof currencyRates.$inferSelect;

export function upsertCurrencyRate(db: DbClient, date: string, usdBrl: number, source: string): void {
  const row = { date, usdBrl, source, fetchedAt: Date.now() };
  db.insert(currencyRates).values(row).onConflictDoUpdate({
    target: currencyRates.date,
    set: { usdBrl, source, fetchedAt: row.fetchedAt },
  }).run();
}

export function getCurrencyRate(db: DbClient, date: string): CurrencyRateRow | null {
  return db.select().from(currencyRates).where(eq(currencyRates.date, date)).all()[0] ?? null;
}

export function getLatestCurrencyRate(db: DbClient): CurrencyRateRow | null {
  return db.select().from(currencyRates).orderBy(desc(currencyRates.date)).limit(1).all()[0] ?? null;
}
