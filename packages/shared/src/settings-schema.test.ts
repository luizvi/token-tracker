import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  parseSettingValue,
  SETTINGS_SCHEMAS,
} from "./settings-schema.js";

describe("DEFAULT_SETTINGS", () => {
  it("contém todas as chaves esperadas com defaults documentados", () => {
    expect(DEFAULT_SETTINGS.timePerInputTokenSeconds).toBe(0.5);
    expect(DEFAULT_SETTINGS.timePerProcessingOutputTokenSeconds).toBe(0.05);
    expect(DEFAULT_SETTINGS.timePerReadingTokenSeconds).toBe(0.15);
    expect(DEFAULT_SETTINGS.cacheReadFactor).toBe(0.1);
    expect(DEFAULT_SETTINGS.billableFactorDefault).toBe(0.4);
    expect(DEFAULT_SETTINGS.detection.gapMinutesBase).toBe(30);
    expect(DEFAULT_SETTINGS.detection.nightHoursStart).toBe(23);
    expect(DEFAULT_SETTINGS.detection.nightHoursEnd).toBe(9);
    expect(DEFAULT_SETTINGS.detection.semanticThreshold).toBe(0.65);
    expect(DEFAULT_SETTINGS.detection.idleCloseHours).toBe(6);
    expect(DEFAULT_SETTINGS.haiku.autoRefineAboveTokens).toBe(5000);
    expect(DEFAULT_SETTINGS.haiku.autoEstimateHours).toBe(true);
    expect(DEFAULT_SETTINGS.currency.preferredDisplay).toBe("USD");
  });
});

describe("parseSettingValue", () => {
  it("aceita valor válido conforme schema da chave", () => {
    expect(parseSettingValue("billableFactorDefault", 0.5)).toBe(0.5);
  });

  it("rejeita valor fora do range", () => {
    expect(() => parseSettingValue("billableFactorDefault", -1)).toThrow();
    expect(() => parseSettingValue("billableFactorDefault", 2)).toThrow();
  });

  it("aceita enum válido", () => {
    expect(parseSettingValue("currency.preferredDisplay", "BRL")).toBe("BRL");
  });

  it("rejeita enum inválido", () => {
    expect(() => parseSettingValue("currency.preferredDisplay", "EUR")).toThrow();
  });

  it("rejeita chave desconhecida", () => {
    expect(() => parseSettingValue("foo.bar" as never, 1)).toThrow();
  });
});

describe("SETTINGS_SCHEMAS", () => {
  it("tem schema para todas as chaves de DEFAULT_SETTINGS (recursivo)", () => {
    function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
      return Object.entries(obj).flatMap(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        return typeof v === "object" && v !== null && !Array.isArray(v)
          ? flatten(v as Record<string, unknown>, key)
          : [key];
      });
    }
    const flatKeys = flatten(DEFAULT_SETTINGS);
    for (const key of flatKeys) {
      expect(SETTINGS_SCHEMAS).toHaveProperty(key);
    }
  });
});
