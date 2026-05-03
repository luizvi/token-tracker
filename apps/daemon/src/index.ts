import { createClient, runMigrations, seedDatabase } from "@tracker/db";
import { ClaudeCodeJsonlSource } from "./ingestor/claude-code-source.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { withDaemonRun } from "./runs.js";
import { runTick } from "./scheduler.js";
import { updateCurrencyToday } from "./currency/updater.js";
import { formatDateBrt } from "./time.js";

const log = createLogger("[daemon]");

async function main() {
  const cfg = loadConfig(process.env);
  log.info("boot", { trackerRoot: cfg.trackerRoot, dbPath: cfg.dbPath, claudeProjectsDir: cfg.claudeProjectsDir });

  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  seedDatabase(db);

  const source = new ClaudeCodeJsonlSource(cfg.claudeProjectsDir);

  let lastCurrencyDate = "";

  async function tick() {
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
