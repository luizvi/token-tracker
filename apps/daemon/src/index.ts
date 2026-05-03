import { createClient, runMigrations, seedDatabase, getSetting } from "@tracker/db";
import { getClaudeOAuthToken } from "@tracker/shared";
import { ClaudeCodeJsonlSource } from "./ingestor/claude-code-source.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { withDaemonRun } from "./runs.js";
import { runTick, runRefineAndEstimateBatch } from "./scheduler.js";
import { setRefinerPrompts } from "./refiner/prompts.js";
import { updateCurrencyToday } from "./currency/updater.js";
import { formatDateBrt } from "./time.js";
import { HaikuClient } from "./refiner/haiku-client.js";
import { backupSqlite } from "./backup/backup.js";
import { join } from "node:path";

const log = createLogger("[daemon]");

async function main() {
  const cfg = loadConfig(process.env);
  log.info("boot", { trackerRoot: cfg.trackerRoot, dbPath: cfg.dbPath, claudeProjectsDir: cfg.claudeProjectsDir });

  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  seedDatabase(db);

  const source = new ClaudeCodeJsonlSource(cfg.claudeProjectsDir);

  let lastCurrencyDate = "";
  let lastBackupDate = "";

  async function tick() {
    const paused = getSetting<boolean>(db, "daemon.paused");
    if (paused === true) {
      log.info("daemon paused via setting, skipping tick");
      return;
    }

    try {
      await withDaemonRun(db, "tick", async (m) => {
        const result = await runTick(db, source);
        m.filesScanned = result.filesScanned;
        m.filesProcessed = result.filesProcessed;
        m.tasksCreated = result.tasksClosedIdle;
      });
    } catch (err) {
      log.error("tick failed", err);
    }

    const today = formatDateBrt(Date.now());
    if (lastCurrencyDate !== today) {
      try {
        await withDaemonRun(db, "currency", async () => {
          await updateCurrencyToday(db);
        });
        lastCurrencyDate = today;
      } catch (err) {
        log.warn("currency update failed", err);
      }
    }

    const hour = new Date().getHours();
    if (hour >= 3 && hour < 4 && lastBackupDate !== today) {
      try {
        await withDaemonRun(db, "backup", async () => {
          await backupSqlite(cfg.dbPath, join(cfg.trackerRoot, "data", "backups"));
        });
        lastBackupDate = today;
      } catch (err) { log.warn("backup failed", err); }
    }

    // Resolve credenciais a cada tick — assim pegamos rotações que o Claude Code
    // faz no Keychain sem precisar reiniciar o daemon nem editar .env.
    const oauthToken = cfg.anthropicAuthToken ?? (await getClaudeOAuthToken());
    if (cfg.anthropicApiKey || oauthToken) {
      setRefinerPrompts({
        refine: getSetting<string>(db, "haiku.refinePrompt") ?? null,
        estimate: getSetting<string>(db, "haiku.estimatePrompt") ?? null,
      });
      try {
        await withDaemonRun(db, "haiku-batch", async () => {
          const haikuClient = new HaikuClient({
            ...(cfg.anthropicApiKey ? { apiKey: cfg.anthropicApiKey } : {}),
            ...(oauthToken ? { authToken: oauthToken } : {}),
            model: getSetting<string>(db, "haiku.model") ?? "claude-haiku-4-5-20251001",
            requestsPerSecond: getSetting<number>(db, "haiku.requestsPerSecond") ?? 1,
          });
          await runRefineAndEstimateBatch(db, haikuClient, 5);
        });
      } catch (err) {
        log.warn("haiku batch failed", err);
      }
    }
  }

  await tick();
  setInterval(() => { void tick(); }, cfg.tickIntervalMs);

  process.on("SIGINT", () => { log.info("shutdown"); sqlite.close(); process.exit(0); });
  process.on("SIGTERM", () => { log.info("shutdown"); sqlite.close(); process.exit(0); });
}

main().catch((err) => {
  console.error("fatal", err);
  process.exit(1);
});
