import prompts from "prompts";
import { createClient, runMigrations, insertPricing } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function pricingAddCommand(): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const r = await prompts([
    { type: "text", name: "model", message: "Modelo" },
    { type: "number", name: "input", message: "Input $/MTok", float: true },
    { type: "number", name: "output", message: "Output $/MTok", float: true },
    { type: "number", name: "cacheRead", message: "Cache read $/MTok", float: true, initial: 0 },
    { type: "number", name: "cacheCreation", message: "Cache creation $/MTok", float: true, initial: 0 },
    { type: "text", name: "validFrom", message: "Valid from (YYYY-MM-DD)" },
  ]);

  insertPricing(db, {
    model: r.model as string,
    inputPerMtok: r.input as number,
    outputPerMtok: r.output as number,
    cacheReadPerMtok: r.cacheRead as number,
    cacheCreationPerMtok: r.cacheCreation as number,
    validFrom: Date.parse(`${r.validFrom as string}T00:00:00Z`),
    validUntil: null,
    source: "manual",
  });
  ui.success("Pricing adicionado");
  sqlite.close();
}
