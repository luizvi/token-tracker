import { getLatestCurrencyRate } from "@tracker/db";
import { getDb } from "./db";

export function getUsdBrlRate(): number {
  const latest = getLatestCurrencyRate(getDb());
  return latest?.usdBrl ?? 5;
}
