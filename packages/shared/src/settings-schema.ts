import { z } from "zod";

export const DEFAULT_SETTINGS = {
  timePerInputTokenSeconds: 0.5,
  timePerProcessingOutputTokenSeconds: 0.05,
  timePerReadingTokenSeconds: 0.15,
  cacheReadFactor: 0.1,
  billableFactorDefault: 0.4,
  detection: {
    gapMinutesBase: 30,
    nightHoursStart: 23,
    nightHoursEnd: 9,
    semanticThreshold: 0.65,
    resumeKeywords: ["voltando", "retomando", "continua", "vamos seguir", "volta"],
    newTopicKeywords: ["agora", "outra coisa", "muda de assunto", "novo "],
    idleCloseHours: 6,
  },
  haiku: {
    autoRefineAboveTokens: 5000,
    autoEstimateHours: true,
    maxConcurrent: 3,
    requestsPerSecond: 1,
  },
  currency: {
    preferredDisplay: "USD" as "USD" | "BRL",
    fetchAtHourBrt: 6,
  },
} as const;

export type Settings = typeof DEFAULT_SETTINGS;

const positiveFiniteFactor = z.number().nonnegative().lte(1000);
const factor01 = z.number().nonnegative().lte(1);
const hour = z.number().int().min(0).max(23);
const positiveInt = z.number().int().positive();
const stringArray = z.array(z.string().min(1));

export const SETTINGS_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "timePerInputTokenSeconds": positiveFiniteFactor,
  "timePerProcessingOutputTokenSeconds": positiveFiniteFactor,
  "timePerReadingTokenSeconds": positiveFiniteFactor,
  "cacheReadFactor": factor01,
  "billableFactorDefault": factor01,
  "detection.gapMinutesBase": positiveInt,
  "detection.nightHoursStart": hour,
  "detection.nightHoursEnd": hour,
  "detection.semanticThreshold": factor01,
  "detection.resumeKeywords": stringArray,
  "detection.newTopicKeywords": stringArray,
  "detection.idleCloseHours": positiveInt,
  "haiku.autoRefineAboveTokens": positiveInt,
  "haiku.autoEstimateHours": z.boolean(),
  "haiku.maxConcurrent": positiveInt,
  "haiku.requestsPerSecond": positiveInt,
  "currency.preferredDisplay": z.enum(["USD", "BRL"]),
  "currency.fetchAtHourBrt": hour,
};

export type SettingKey = keyof typeof SETTINGS_SCHEMAS;

export function parseSettingValue(key: SettingKey, value: unknown): unknown {
  const schema = SETTINGS_SCHEMAS[key];
  if (!schema) throw new Error(`Unknown settings key: ${String(key)}`);
  return schema.parse(value);
}
