import { Command } from "commander";
import { versionCommand } from "./commands/version.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";
import { backfillCommand } from "./commands/backfill.js";
import { tasksRecentCommand } from "./commands/tasks-recent.js";
import { hoursCommand } from "./commands/hours.js";
import { refineCommand } from "./commands/refine.js";
import { pricingAddCommand } from "./commands/pricing.js";
import { currencyCommand } from "./commands/currency.js";
import { pauseCommand } from "./commands/pause.js";
import { resumeCommand } from "./commands/resume.js";
import { logsCommand } from "./commands/logs.js";
import { openCommand } from "./commands/open.js";

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

  program.command("hours")
    .option("--client <id>", "filtrar por cliente")
    .description("Input interativo de horas humanas")
    .action((opts: { client?: string }) => hoursCommand(opts));

  program.command("refine [taskIds...]")
    .option("--backfilled", "todos os backfilled não refinados")
    .option("--project <slug>", "filtrar por projeto")
    .description("Refinar tarefas via Haiku")
    .action((taskIds: string[], opts: { backfilled?: boolean; project?: string }) =>
      refineCommand(taskIds, opts));

  const pricingCmd = new Command("pricing").description("Gerencia model_pricing");
  pricingCmd.command("add").description("Adiciona row").action(pricingAddCommand);
  program.addCommand(pricingCmd);

  program.command("currency")
    .option("--manual <value>", "set manual rate", parseFloat)
    .description("Atualiza ou define cotação manual")
    .action((opts: { manual?: number }) => currencyCommand(opts));

  program.command("pause").description("Pausa daemon").action(pauseCommand);
  program.command("resume").description("Retoma daemon").action(resumeCommand);
  program.command("logs")
    .option("--tail", "tail")
    .option("--errors", "só erros")
    .description("Mostra daemon_runs")
    .action((opts: { tail?: boolean; errors?: boolean }) => logsCommand(opts));
  program.command("open").description("Abre dashboard").action(openCommand);

  await program.parseAsync(argv);
}
