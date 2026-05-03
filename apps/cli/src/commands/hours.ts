import prompts from "prompts";
import { createClient, runMigrations, listTasks, updateTask } from "@tracker/db";
import { recomputeBillableHours } from "@tracker/daemon/biller/biller";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function hoursCommand(opts: { client?: string }): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const filter: { clientId?: string } = {};
  if (opts.client) filter.clientId = opts.client;

  const tasks = listTasks(db, filter).filter((t) => t.humanHoursEstimate === null);
  if (tasks.length === 0) { ui.success("Nenhuma task pendente de input de horas"); sqlite.close(); return; }

  ui.info(`${tasks.length} tasks sem horas humanas:`);
  for (const t of tasks.slice(0, 20)) {
    const r = await prompts({
      type: "number",
      name: "hours",
      message: `[${t.title.slice(0, 40)}] horas humanas (Enter pula)`,
      initial: 0,
      float: true,
    });
    if (r.hours && r.hours > 0) {
      updateTask(db, t.id, { humanHoursEstimate: r.hours, humanHoursSource: "manual" });
      recomputeBillableHours(db, t.id);
      ui.success(`OK ${r.hours}h`);
    }
  }

  sqlite.close();
}
