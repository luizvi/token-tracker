import { Command } from "commander";
import { versionCommand } from "./commands/version.js";
import { statusCommand } from "./commands/status.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name("lv-tracker")
    .description("CLI do LV Dev Tracker")
    .version("0.1.0");

  program.command("version").description("Versão").action(versionCommand);
  program.command("status").description("Status do daemon e dashboard").action(statusCommand);

  await program.parseAsync(argv);
}
