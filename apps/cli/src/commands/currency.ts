import { createClient, runMigrations, upsertCurrencyRate } from "@tracker/db";
import { updateCurrencyToday } from "@tracker/daemon/currency/updater";
import { formatDateBrt } from "@tracker/daemon/time";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function currencyCommand(opts: { manual?: number }): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  if (opts.manual !== undefined) {
    const date = formatDateBrt(Date.now());
    upsertCurrencyRate(db, date, opts.manual, "manual");
    ui.success(`Cotação manual ${date} = ${opts.manual}`);
  } else {
    await updateCurrencyToday(db);
    ui.success("Cotação atualizada via AwesomeAPI");
  }
  sqlite.close();
}
