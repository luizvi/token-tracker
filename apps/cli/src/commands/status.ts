import { createClient, runMigrations, listDaemonRuns, getLatestCurrencyRate } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export function statusCommand(): void {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const latestRuns = listDaemonRuns(db, { limit: 5 });
  const lastTick = latestRuns.find((r) => r.kind === "tick");
  const lastError = latestRuns.find((r) => !r.ok);
  const rate = getLatestCurrencyRate(db);

  ui.info(`DB: ${cfg.dbPath}`);
  ui.info(`Claude projects: ${cfg.claudeProjectsDir}`);

  if (lastTick) {
    const ageMin = Math.round((Date.now() - lastTick.startedAt) / 60_000);
    if (lastTick.ok) ui.success(`Último tick OK há ${ageMin}min — ${lastTick.filesProcessed} arquivos`);
    else ui.error(`Último tick falhou há ${ageMin}min`);
  } else {
    ui.warn("Nenhum tick registrado ainda");
  }

  if (lastError) {
    ui.error(`Última falha (${lastError.kind}): ${lastError.errors ?? "(sem detalhes)"}`);
  }

  if (rate) {
    ui.info(`Cotação USD-BRL: ${rate.usdBrl.toFixed(4)} (${rate.date}, ${rate.source})`);
  } else {
    ui.warn("Cotação USD-BRL não registrada");
  }

  sqlite.close();
}
