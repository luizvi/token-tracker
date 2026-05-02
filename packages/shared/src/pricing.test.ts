import { describe, expect, it } from "vitest";
import {
  calculateCost,
  type PricingRow,
  type TokensForCost,
  loadAnthropicPricingSeed,
} from "./pricing.js";

const sonnetPricing: PricingRow = {
  model: "claude-sonnet-4-6",
  inputPerMtok: 3,
  outputPerMtok: 15,
  cacheReadPerMtok: 0.3,
  cacheCreationPerMtok: 3.75,
  validFromMs: 0,
  validUntilMs: null,
};

describe("calculateCost", () => {
  it("calcula custo zero para zero tokens", () => {
    const tokens: TokensForCost = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    expect(calculateCost(tokens, sonnetPricing)).toBe(0);
  });

  it("calcula custo do Sonnet com 1M tokens input + 1M output", () => {
    const tokens: TokensForCost = {
      input: 1_000_000,
      output: 1_000_000,
      cacheRead: 0,
      cacheCreation: 0,
    };
    expect(calculateCost(tokens, sonnetPricing)).toBeCloseTo(18, 5);
  });

  it("calcula custo proporcional incluindo caches", () => {
    const tokens: TokensForCost = {
      input: 100_000,
      output: 50_000,
      cacheRead: 200_000,
      cacheCreation: 10_000,
    };
    expect(calculateCost(tokens, sonnetPricing)).toBeCloseTo(1.1475, 5);
  });
});

describe("loadAnthropicPricingSeed", () => {
  it("carrega seed JSON com pelo menos os 3 modelos atuais", () => {
    const seed = loadAnthropicPricingSeed();
    const models = seed.map((p) => p.model);
    expect(models).toContain("claude-opus-4-7");
    expect(models).toContain("claude-sonnet-4-6");
    expect(models).toContain("claude-haiku-4-5-20251001");
  });

  it("converte valid_from string para epoch ms", () => {
    const seed = loadAnthropicPricingSeed();
    for (const row of seed) {
      expect(typeof row.validFromMs).toBe("number");
      expect(row.validFromMs).toBeGreaterThan(0);
    }
  });
});
