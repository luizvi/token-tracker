import { createClient, runMigrations, setSetting } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export function pauseCommand(): void {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  setSetting(db, "daemon.paused", true);
  ui.success("Daemon marcado como paused (próximo tick respeitará a flag)");
  sqlite.close();
}
