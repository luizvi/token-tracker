import { Command } from "commander";
import { versionCommand } from "./commands/version.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";
import { backfillCommand } from "./commands/backfill.js";
import { tasksRecentCommand } from "./commands/tasks-recent.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name("lv-tracker")
    .description("CLI do LV Dev Tracker")
    .version("0.1.0");

  program.command("version").description("Versão").action(versionCommand);
  program.command("status").description("Status do daemon e dashboard").action(statusCommand);
  program.command("sync").description("Força tick imediato").action(syncCommand);
  program.command("backfill").description("Processa todo histórico").action(backfillCommand);

  const tasksCmd = new Command("tasks").description("Listagem de tasks");
  tasksCmd
    .command("recent")
    .option("-n, --limit <n>", "limite", parseInt)
    .description("Tasks recentes")
    .action((opts: { limit?: number }) => tasksRecentCommand(opts));
  program.addCommand(tasksCmd);

  await program.parseAsync(argv);
}
