import { createClient, runMigrations, listTasks, listProjects } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function tasksRecentCommand(opts: { limit?: number }): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const limit = opts.limit ?? 20;
  const tasks = listTasks(db, {}).slice(0, limit);
  const projects = listProjects(db);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "?";

  ui.table(tasks.map((t) => ({
    started: new Date(t.startedAt).toISOString().slice(0, 16).replace("T", " "),
    project: projectName(t.projectId).slice(0, 14),
    title: t.title.slice(0, 50),
    status: t.status,
    tokens: t.tokensInput + t.tokensOutput,
    cost: ui.formatUsd(t.costUsd),
    time: ui.formatDuration(t.timeTotalSeconds),
  })));

  sqlite.close();
}
