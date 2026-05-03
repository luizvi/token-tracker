import { createClient, runMigrations, listDaemonRuns } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export function logsCommand(opts: { tail?: boolean; errors?: boolean }): void {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  const runs = listDaemonRuns(db, { limit: opts.tail ? 20 : 50 });
  const filtered = opts.errors ? runs.filter((r) => !r.ok) : runs;
  ui.table(filtered.map((r) => ({
    started: new Date(r.startedAt).toISOString().slice(0, 19).replace("T", " "),
    kind: r.kind,
    ok: r.ok ? "✓" : "✗",
    files: `${r.filesProcessed}/${r.filesScanned}`,
    tasks: `${r.tasksCreated}+${r.tasksUpdated}`,
    duration: r.endedAt ? `${((r.endedAt - r.startedAt) / 1000).toFixed(2)}s` : "running",
  })));
  sqlite.close();
}
