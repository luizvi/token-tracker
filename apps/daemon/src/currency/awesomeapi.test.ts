import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fetchUsdBrlLatest } from "./awesomeapi.js";

describe("fetchUsdBrlLatest", () => {
  beforeEach(() => { vi.spyOn(globalThis, "fetch"); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("parseia resposta válida", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ USDBRL: { bid: "4.97", code: "USD", codein: "BRL" } }),
    } as Response);
    const rate = await fetchUsdBrlLatest();
    expect(rate).toBeCloseTo(4.97, 5);
  });

  it("lança em response não-OK", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(fetchUsdBrlLatest()).rejects.toThrow();
  });
});
