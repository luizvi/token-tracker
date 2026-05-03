import { upsertCurrencyRate, type DbClient } from "@tracker/db";
import { fetchUsdBrlLatest } from "./awesomeapi.js";
import { formatDateBrt } from "../time.js";

export async function updateCurrencyToday(
  db: DbClient,
  now: () => number = Date.now,
): Promise<void> {
  const rate = await fetchUsdBrlLatest();
  const date = formatDateBrt(now());
  upsertCurrencyRate(db, date, rate, "awesomeapi");
}
