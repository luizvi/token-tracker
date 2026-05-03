import { createClient, runMigrations, setSetting } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export function resumeCommand(): void {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  setSetting(db, "daemon.paused", false);
  ui.success("Daemon retomado");
  sqlite.close();
}
