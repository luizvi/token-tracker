import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { upsertCurrencyRate, getCurrencyRate, getLatestCurrencyRate } from "./currency.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("currency", () => {
  it("upsert + get retorna a rate gravada", () => {
    upsertCurrencyRate(db, "2026-05-02", 4.97, "awesomeapi");
    expect(getCurrencyRate(db, "2026-05-02")?.usdBrl).toBe(4.97);
    close();
  });

  it("upsert sobrescreve quando data já existe", () => {
    upsertCurrencyRate(db, "2026-05-02", 4.97, "awesomeapi");
    upsertCurrencyRate(db, "2026-05-02", 4.99, "manual");
    const r = getCurrencyRate(db, "2026-05-02")!;
    expect(r.usdBrl).toBe(4.99);
    expect(r.source).toBe("manual");
    close();
  });

  it("getLatestCurrencyRate retorna a data mais recente", () => {
    upsertCurrencyRate(db, "2026-04-30", 4.95, "awesomeapi");
    upsertCurrencyRate(db, "2026-05-02", 4.97, "awesomeapi");
    expect(getLatestCurrencyRate(db)?.date).toBe("2026-05-02");
    close();
  });

  it("getLatestCurrencyRate retorna null se vazio", () => {
    expect(getLatestCurrencyRate(db)).toBeNull();
    close();
  });
});
