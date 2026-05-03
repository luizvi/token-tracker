import { createClient, runMigrations, seedDatabase } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ClaudeCodeJsonlSource } from "@tracker/daemon/ingestor/claude-code-source";
import { runTick } from "@tracker/daemon/scheduler";
import { ui } from "../ui.js";

export async function syncCommand(): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  seedDatabase(db);

  ui.info("Forçando tick...");
  const source = new ClaudeCodeJsonlSource(cfg.claudeProjectsDir);
  const m = await runTick(db, source);
  ui.success(`Sync OK — ${m.filesProcessed} arquivos com delta, ${m.tasksClosedIdle} tasks fechadas por idle`);
  sqlite.close();
}
