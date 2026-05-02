import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import {
  insertPricing, findPricingFor, listAllPricing, updatePricing, deletePricing,
} from "./pricing.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("pricing", () => {
  it("findPricingFor escolhe a row com valid_from <= ts e valid_until > ts (ou null)", () => {
    insertPricing(db, {
      model: "claude-sonnet-4-6",
      inputPerMtok: 3, outputPerMtok: 15, cacheReadPerMtok: 0.3, cacheCreationPerMtok: 3.75,
      validFrom: 1000, validUntil: 2000, source: "manual",
    });
    insertPricing(db, {
      model: "claude-sonnet-4-6",
      inputPerMtok: 3.5, outputPerMtok: 17, cacheReadPerMtok: 0.35, cacheCreationPerMtok: 4,
      validFrom: 2000, validUntil: null, source: "manual",
    });
    const old = findPricingFor(db, "claude-sonnet-4-6", 1500);
    expect(old?.inputPerMtok).toBe(3);
    const current = findPricingFor(db, "claude-sonnet-4-6", 3000);
    expect(current?.inputPerMtok).toBe(3.5);
    close();
  });

  it("findPricingFor retorna null se modelo desconhecido", () => {
    expect(findPricingFor(db, "claude-unknown", 1000)).toBeNull();
    close();
  });

  it("listAllPricing retorna todas as rows", () => {
    insertPricing(db, { model: "a", inputPerMtok: 1, outputPerMtok: 2, cacheReadPerMtok: 0, cacheCreationPerMtok: 0, validFrom: 0, validUntil: null, source: "x" });
    insertPricing(db, { model: "b", inputPerMtok: 1, outputPerMtok: 2, cacheReadPerMtok: 0, cacheCreationPerMtok: 0, validFrom: 0, validUntil: null, source: "x" });
    expect(listAllPricing(db)).toHaveLength(2);
    close();
  });
});
