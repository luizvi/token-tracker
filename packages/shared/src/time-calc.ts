export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export interface TimeCalcConfig {
  timePerInputTokenSeconds: number;
  timePerProcessingOutputTokenSeconds: number;
  timePerReadingTokenSeconds: number;
  cacheReadFactor: number;
}

export interface TimeBlocks {
  inputSeconds: number;
  processingOutputSeconds: number;
  readingSeconds: number;
  totalSeconds: number;
}

export function calculateTimeBlocks(
  tokens: TokenUsage,
  config: TimeCalcConfig,
): TimeBlocks {
  const inputBillableTokens = tokens.input + tokens.cacheCreation;
  const cacheReadEffectiveTokens = tokens.cacheRead * config.cacheReadFactor;

  const inputSeconds =
    (inputBillableTokens + cacheReadEffectiveTokens) *
    config.timePerInputTokenSeconds;

  const processingOutputSeconds =
    tokens.output * config.timePerProcessingOutputTokenSeconds;

  const readingSeconds = tokens.output * config.timePerReadingTokenSeconds;

  const totalSeconds = inputSeconds + processingOutputSeconds + readingSeconds;

  return { inputSeconds, processingOutputSeconds, readingSeconds, totalSeconds };
}
