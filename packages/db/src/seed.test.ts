import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "./client.js";
import { runMigrations } from "./migrate.js";
import { seedDatabase } from "./seed.js";
import { getAllSettings, getSetting } from "./queries/settings.js";
import { listAllPricing } from "./queries/pricing.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("seedDatabase", () => {
  it("popula settings com todos os defaults flat-keyed", () => {
    seedDatabase(db);
    expect(getSetting(db, "billableFactorDefault")).toBe(0.4);
    expect(getSetting(db, "detection.gapMinutesBase")).toBe(30);
    expect(getSetting(db, "haiku.autoEstimateHours")).toBe(true);
    expect(getSetting(db, "currency.preferredDisplay")).toBe("USD");
    close();
  });

  it("popula model_pricing com seed Anthropic", () => {
    seedDatabase(db);
    const rows = listAllPricing(db);
    const models = rows.map((r) => r.model);
    expect(models).toContain("claude-opus-4-7");
    expect(models).toContain("claude-sonnet-4-6");
    expect(models).toContain("claude-haiku-4-5-20251001");
    close();
  });

  it("seed é idempotente — chamar 2× não duplica settings", () => {
    seedDatabase(db);
    seedDatabase(db);
    const all = getAllSettings(db);
    expect(Object.keys(all).filter((k) => k === "billableFactorDefault")).toHaveLength(1);
    close();
  });

  it("seed é idempotente — pricing não duplica para mesmo modelo+valid_from", () => {
    seedDatabase(db);
    const before = listAllPricing(db).length;
    seedDatabase(db);
    const after = listAllPricing(db).length;
    expect(after).toBe(before);
    close();
  });
});
