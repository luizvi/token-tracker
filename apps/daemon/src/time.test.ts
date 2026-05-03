import { describe, expect, it } from "vitest";
import { formatDateBrt, isInNightWindow, nowMs } from "./time.js";

describe("time helpers", () => {
  it("formatDateBrt converte epoch ms para 'YYYY-MM-DD' em horário BRT", () => {
    // 2026-05-02T03:00:00Z = 2026-05-02 00:00 BRT (UTC-3)
    const utcMs = Date.UTC(2026, 4, 2, 3, 0, 0);
    expect(formatDateBrt(utcMs)).toBe("2026-05-02");
  });

  it("isInNightWindow retorna true para 23h-09h", () => {
    const utcMs23 = Date.UTC(2026, 4, 3, 2, 0, 0); // 23:00 BRT do dia 2
    const utcMs03 = Date.UTC(2026, 4, 2, 6, 0, 0); // 03:00 BRT
    const utcMs10 = Date.UTC(2026, 4, 2, 13, 0, 0); // 10:00 BRT
    expect(isInNightWindow(utcMs23, 23, 9)).toBe(true);
    expect(isInNightWindow(utcMs03, 23, 9)).toBe(true);
    expect(isInNightWindow(utcMs10, 23, 9)).toBe(false);
  });

  it("nowMs retorna número crescente", () => {
    const a = nowMs();
    const b = nowMs();
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
