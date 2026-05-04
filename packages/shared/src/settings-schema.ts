import { z } from "zod";

export const DEFAULT_SETTINGS = {
  // Defaults calibrados em 2026-05: Opus produz ~75 tok/s, input é processado em batch.
  // Os valores antigos (0.5/0.05/0.15) inflavam tempo input em ~1000x.
  timePerInputTokenSeconds: 0.0008,
  timePerProcessingOutputTokenSeconds: 0.013,
  timePerReadingTokenSeconds: 0.04,
  cacheReadFactor: 0.05,
  billableFactorDefault: 0.4,
  // Tolerância (em pontos percentuais) pro classificador "abaixo / no ponto / acima" do limite.
  billableTolerancePercentBelow: 15,
  billableTolerancePercentAbove: 10,
  // Tolerâncias separadas pra custo de IA vs orçamento (monthlyAverageCostUsd).
  costTolerancePercentBelow: 25,
  costTolerancePercentAbove: 15,
  detection: {
    // Gap maior reduz fragmentação. Em 90min você levanta pra tomar café e não vira task nova.
    gapMinutesBase: 90,
    nightHoursStart: 23,
    nightHoursEnd: 9,
    // Limiar mais permissivo (~0.3) — só quebra quando o assunto realmente mudou.
    semanticThreshold: 0.3,
    resumeKeywords: ["voltando", "retomando", "continua", "vamos seguir", "volta"],
    newTopicKeywords: ["agora", "outra coisa", "muda de assunto", "novo "],
    idleCloseHours: 6,
    // Tasks abaixo deste limiar (em segundos) são tratadas como ruído e ocultadas
    // por padrão na UI — não destruídas; aparecem se "mostrar curtas" estiver ativo.
    minTaskDurationSeconds: 30,
  },
  haiku: {
    autoRefineAboveTokens: 5000,
    autoEstimateHours: true,
    maxConcurrent: 3,
    requestsPerSecond: 1,
    model: "claude-haiku-4-5-20251001",
    // Vazio → usa DEFAULT_REFINE_SYSTEM/DEFAULT_ESTIMATE_SYSTEM em apps/daemon/src/refiner/prompts.ts.
    refinePrompt: "",
    estimatePrompt: "",
  },
  insights: {
    model: "claude-sonnet-4-6",
  },
  anthropic: {
    /** Tipo de plano contratado. Insights usam isso pra contextualizar o "custo IA" como informativo. */
    planType: "max20_200" as "free" | "pro_20" | "max5_100" | "max20_200" | "api_paygo" | "custom",
    /** Override do custo mensal real do plano em USD. null = usa o padrão do planType. */
    planMonthlyCostUsd: null as number | null,
  },
  currency: {
    preferredDisplay: "USD" as "USD" | "BRL",
    fetchAtHourBrt: 6,
  },
  dashboard: {
    /** Nome exibido no header da sidebar. Personalize livremente. */
    brandName: "token-tracker",
    /** Tagline pequena abaixo do nome. Vazio esconde. */
    brandTagline: "Local-first analytics",
    /** Cor de destaque (hex #RRGGBB) aplicada ao nome da brand. */
    brandAccent: "#22c55e",
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
  "billableTolerancePercentBelow": z.number().nonnegative().lte(100),
  "billableTolerancePercentAbove": z.number().nonnegative().lte(100),
  "costTolerancePercentBelow": z.number().nonnegative().lte(100),
  "costTolerancePercentAbove": z.number().nonnegative().lte(100),
  "detection.gapMinutesBase": positiveInt,
  "detection.nightHoursStart": hour,
  "detection.nightHoursEnd": hour,
  "detection.semanticThreshold": factor01,
  "detection.resumeKeywords": stringArray,
  "detection.newTopicKeywords": stringArray,
  "detection.idleCloseHours": positiveInt,
  "detection.minTaskDurationSeconds": z.number().int().nonnegative(),
  "haiku.autoRefineAboveTokens": positiveInt,
  "haiku.autoEstimateHours": z.boolean(),
  "haiku.maxConcurrent": positiveInt,
  "haiku.requestsPerSecond": positiveInt,
  "haiku.model": z.string().min(1),
  "haiku.refinePrompt": z.string(),
  "haiku.estimatePrompt": z.string(),
  "insights.model": z.string().min(1),
  "anthropic.planType": z.enum(["free", "pro_20", "max5_100", "max20_200", "api_paygo", "custom"]),
  "anthropic.planMonthlyCostUsd": z.number().nonnegative().nullable(),
  "currency.preferredDisplay": z.enum(["USD", "BRL"]),
  "currency.fetchAtHourBrt": hour,
  "dashboard.brandName": z.string().min(1).max(40),
  "dashboard.brandTagline": z.string().max(80),
  "dashboard.brandAccent": z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use formato hex #RRGGBB"),
};

export type SettingKey = keyof typeof SETTINGS_SCHEMAS;

export function parseSettingValue(key: SettingKey, value: unknown): unknown {
  const schema = SETTINGS_SCHEMAS[key];
  if (!schema) throw new Error(`Unknown settings key: ${String(key)}`);
  return schema.parse(value);
}

/** Custo mensal estimado do plano Anthropic em USD. */
export const ANTHROPIC_PLAN_COSTS: Record<string, { label: string; monthlyUsd: number | null }> = {
  free: { label: "Free (sem limite real, melhor-esforço)", monthlyUsd: 0 },
  pro_20: { label: "Pro — $20/mês", monthlyUsd: 20 },
  max5_100: { label: "Max 5× — $100/mês", monthlyUsd: 100 },
  max20_200: { label: "Max 20× — $200/mês", monthlyUsd: 200 },
  api_paygo: { label: "API pay-as-you-go (cobra por uso)", monthlyUsd: null },
  custom: { label: "Custom", monthlyUsd: null },
};

export function planMonthlyCostUsd(planType: string, override: number | null): number | null {
  if (override !== null) return override;
  return ANTHROPIC_PLAN_COSTS[planType]?.monthlyUsd ?? null;
}
