import { createClient, runMigrations, seedDatabase, listTasks, getSetting, getSessionById, updateTask } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ClaudeCodeJsonlSource } from "@tracker/daemon/ingestor/claude-code-source";
import { ingestAllPending } from "@tracker/daemon/ingestor/ingestor";
import { processMessages } from "@tracker/daemon/detector/detector";
import { ui } from "../ui.js";

export async function backfillCommand(): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  seedDatabase(db);

  const before = listTasks(db, {}).length;
  ui.info(`Antes: ${before} tasks`);

  const source = new ClaudeCodeJsonlSource(cfg.claudeProjectsDir);
  const deltas = await ingestAllPending(db, source);
  ui.info(`Processando ${deltas.length} arquivos...`);

  const settings = {
    gapMinutesBase: getSetting<number>(db, "detection.gapMinutesBase") ?? 30,
    nightHoursStart: getSetting<number>(db, "detection.nightHoursStart") ?? 23,
    nightHoursEnd: getSetting<number>(db, "detection.nightHoursEnd") ?? 9,
    semanticThreshold: getSetting<number>(db, "detection.semanticThreshold") ?? 0.65,
    resumeKeywords: getSetting<string[]>(db, "detection.resumeKeywords") ?? [],
    newTopicKeywords: getSetting<string[]>(db, "detection.newTopicKeywords") ?? [],
  };

  for (const delta of deltas) {
    const session = getSessionById(db, delta.file.sessionId);
    if (!session) continue;
    await processMessages(db, delta.file.sessionId, session.projectId, delta.messages, settings);
  }

  // Marca tasks recém-criadas como backfilled
  const after = listTasks(db, {});
  const newCount = after.length - before;
  const newOnes = after.slice(0, newCount);
  for (const t of newOnes) updateTask(db, t.id, { isBackfilled: true });

  ui.success(`Backfill OK: ${newCount} tasks novas marcadas como backfilled`);
  sqlite.close();
}
