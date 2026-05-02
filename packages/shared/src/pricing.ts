import seedJson from "./pricing/anthropic.json" with { type: "json" };

export interface TokensForCost {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export interface PricingRow {
  model: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheReadPerMtok: number;
  cacheCreationPerMtok: number;
  validFromMs: number;
  validUntilMs: number | null;
  source?: string;
}

const PER_MTOK = 1_000_000;

export function calculateCost(tokens: TokensForCost, p: PricingRow): number {
  return (
    (tokens.input * p.inputPerMtok +
      tokens.output * p.outputPerMtok +
      tokens.cacheRead * p.cacheReadPerMtok +
      tokens.cacheCreation * p.cacheCreationPerMtok) /
    PER_MTOK
  );
}

export function loadAnthropicPricingSeed(): PricingRow[] {
  return seedJson.pricings.map((p) => ({
    model: p.model,
    inputPerMtok: p.input_per_mtok,
    outputPerMtok: p.output_per_mtok,
    cacheReadPerMtok: p.cache_read_per_mtok,
    cacheCreationPerMtok: p.cache_creation_per_mtok,
    validFromMs: Date.parse(p.valid_from),
    validUntilMs: p.valid_until ? Date.parse(p.valid_until) : null,
    source: p.source,
  }));
}
