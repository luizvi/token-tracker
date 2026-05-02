export interface RedactPattern {
  kind: string;
  regex: RegExp;
}

export const REDACT_PATTERNS: RedactPattern[] = [
  { kind: "ANTHROPIC_API_KEY", regex: /sk-ant-api\d{2}-[A-Za-z0-9_-]{20,}/g },
  { kind: "AWS_ACCESS_KEY", regex: /AKIA[0-9A-Z]{16}/g },
  { kind: "GITHUB_PAT", regex: /gh[ousp]_[A-Za-z0-9]{36,}/g },
  { kind: "STRIPE_KEY", regex: /(?:sk|pk|rk)_live_[A-Za-z0-9]{20,}/g },
  { kind: "BEARER", regex: /Bearer\s+[A-Za-z0-9_\-.]{30,}/gi },
  {
    kind: "ENV_PASSWORD",
    regex: /^([A-Z_][A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|KEY))=(?!\[REDACTED).+$/gm,
  },
];
