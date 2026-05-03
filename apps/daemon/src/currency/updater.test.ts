import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  createClient, runMigrations, getCurrencyRate, type DbClient,
} from "@tracker/db";
import { updateCurrencyToday } from "./updater.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});
afterEach(() => { vi.restoreAllMocks(); });

describe("updateCurrencyToday", () => {
  it("salva rate retornada pela API com source=awesomeapi", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ USDBRL: { bid: "4.97" } }),
    } as Response);
    const date = "2026-05-02";
    await updateCurrencyToday(db, () => Date.UTC(2026, 4, 2, 12, 0, 0));
    expect(getCurrencyRate(db, date)?.usdBrl).toBeCloseTo(4.97, 5);
    expect(getCurrencyRate(db, date)?.source).toBe("awesomeapi");
    close();
  });
});
