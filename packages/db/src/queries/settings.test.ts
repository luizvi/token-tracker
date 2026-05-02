import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { getSetting, setSetting, getAllSettings } from "./settings.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("settings", () => {
  it("setSetting + getSetting roundtrip JSON", () => {
    setSetting(db, "billableFactorDefault", 0.55);
    expect(getSetting(db, "billableFactorDefault")).toBe(0.55);
    close();
  });

  it("getSetting retorna null se chave não existe", () => {
    expect(getSetting(db, "nada.naoexiste")).toBeNull();
    close();
  });

  it("setSetting é idempotente — sobrescreve valor", () => {
    setSetting(db, "x", 1);
    setSetting(db, "x", 2);
    expect(getSetting(db, "x")).toBe(2);
    close();
  });

  it("getAllSettings retorna todas as chaves persistidas", () => {
    setSetting(db, "a", 1);
    setSetting(db, "b", "str");
    const all = getAllSettings(db);
    expect(all).toEqual({ a: 1, b: "str" });
    close();
  });
});
