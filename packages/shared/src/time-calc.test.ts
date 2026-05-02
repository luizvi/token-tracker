import { describe, expect, it } from "vitest";
import { calculateTimeBlocks, type TimeCalcConfig, type TokenUsage } from "./time-calc.js";

const defaultConfig: TimeCalcConfig = {
  timePerInputTokenSeconds: 0.5,
  timePerProcessingOutputTokenSeconds: 0.05,
  timePerReadingTokenSeconds: 0.15,
  cacheReadFactor: 0.1,
};

describe("calculateTimeBlocks", () => {
  it("zera todos os blocos quando todos os tokens são zero", () => {
    const tokens: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    const result = calculateTimeBlocks(tokens, defaultConfig);
    expect(result).toEqual({
      inputSeconds: 0,
      processingOutputSeconds: 0,
      readingSeconds: 0,
      totalSeconds: 0,
    });
  });

  it("calcula bloco input incluindo cache_creation full e cache_read com fator", () => {
    const tokens: TokenUsage = { input: 100, output: 0, cacheRead: 200, cacheCreation: 50 };
    const result = calculateTimeBlocks(tokens, defaultConfig);
    expect(result.inputSeconds).toBeCloseTo(85, 5);
    expect(result.processingOutputSeconds).toBe(0);
    expect(result.readingSeconds).toBe(0);
    expect(result.totalSeconds).toBeCloseTo(85, 5);
  });

  it("calcula bloco processing+output e reading sobre output_tokens", () => {
    const tokens: TokenUsage = { input: 0, output: 1000, cacheRead: 0, cacheCreation: 0 };
    const result = calculateTimeBlocks(tokens, defaultConfig);
    expect(result.processingOutputSeconds).toBeCloseTo(50, 5);
    expect(result.readingSeconds).toBeCloseTo(150, 5);
    expect(result.totalSeconds).toBeCloseTo(200, 5);
  });

  it("respeita config customizada (override de constantes)", () => {
    const tokens: TokenUsage = { input: 100, output: 100, cacheRead: 0, cacheCreation: 0 };
    const custom: TimeCalcConfig = {
      timePerInputTokenSeconds: 1,
      timePerProcessingOutputTokenSeconds: 1,
      timePerReadingTokenSeconds: 1,
      cacheReadFactor: 0,
    };
    const result = calculateTimeBlocks(tokens, custom);
    expect(result.inputSeconds).toBe(100);
    expect(result.processingOutputSeconds).toBe(100);
    expect(result.readingSeconds).toBe(100);
    expect(result.totalSeconds).toBe(300);
  });
});
