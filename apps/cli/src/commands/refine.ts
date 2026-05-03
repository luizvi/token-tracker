import { createClient, runMigrations, getTaskById, listTasks, listProjects } from "@tracker/db";
import { HaikuClient } from "@tracker/daemon/refiner/haiku-client";
import { HaikuRefiner, refineTask } from "@tracker/daemon/refiner/refiner";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function refineCommand(taskIds: string[], opts: { backfilled?: boolean; project?: string }): Promise<void> {
  const cfg = loadConfig(process.env);
  if (!cfg.anthropicApiKey) { ui.error("ANTHROPIC_API_KEY não configurada"); process.exit(1); }

  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const client = new HaikuClient({ apiKey: cfg.anthropicApiKey, model: "claude-haiku-4-5-20251001" });
  const refiner = new HaikuRefiner(client);

  let targets: string[] = taskIds;
  if (opts.backfilled) {
    const filter: { projectId?: string } = {};
    if (opts.project) {
      const p = listProjects(db).find((p) => p.slug === opts.project);
      if (p) filter.projectId = p.id;
    }
    targets = listTasks(db, filter).filter((t) => t.isBackfilled && !t.refinedByHaiku).map((t) => t.id);
  }

  ui.info(`Refinando ${targets.length} tasks...`);
  for (const id of targets) {
    try {
      await refineTask(db, id, refiner);
      const t = getTaskById(db, id);
      ui.success(`${id} → ${t?.title}`);
    } catch (err) {
      ui.error(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  sqlite.close();
}
