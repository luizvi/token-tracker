import { describe, expect, it } from "vitest";
import { redact } from "./redact.js";

describe("redact", () => {
  it("redige AKIA AWS access key id", () => {
    const out = redact("Use AKIAIOSFODNN7EXAMPLE para acessar S3");
    expect(out).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(out).toContain("[REDACTED:AWS_ACCESS_KEY]");
  });

  it("redige Anthropic API key", () => {
    const out = redact("ANTHROPIC_API_KEY=sk-ant-api03-abcdef1234567890abcdef1234567890");
    expect(out).not.toContain("sk-ant-api03-abcdef1234567890abcdef1234567890");
    expect(out).toContain("[REDACTED:ANTHROPIC_API_KEY]");
  });

  it("redige GitHub PAT", () => {
    const out = redact("token: ghp_abcdef1234567890ABCDEF1234567890abcd");
    expect(out).not.toContain("ghp_abcdef1234567890ABCDEF1234567890abcd");
    expect(out).toContain("[REDACTED:GITHUB_PAT]");
  });

  it("redige Bearer tokens longos", () => {
    const out = redact("Authorization: Bearer abc123XYZ456def789ghi012jkl345mno678pqr901");
    expect(out).not.toContain("abc123XYZ456def789ghi012jkl345mno678pqr901");
    expect(out).toContain("[REDACTED:BEARER]");
  });

  it("redige linhas estilo .env com password", () => {
    const out = redact("DB_PASSWORD=super-secret-123\nDB_HOST=localhost");
    expect(out).not.toContain("super-secret-123");
    expect(out).toContain("[REDACTED:ENV_PASSWORD]");
    expect(out).toContain("DB_HOST=localhost");
  });

  it("redige Stripe live keys", () => {
    const out = redact("stripe key sk_live_abcdef1234567890ABCDEFGHIJK");
    expect(out).not.toContain("sk_live_abcdef1234567890ABCDEFGHIJK");
    expect(out).toContain("[REDACTED:STRIPE_KEY]");
  });

  it("preserva texto sem segredos", () => {
    const safe = "Esta é uma mensagem sem nada sensível, só código normal.";
    expect(redact(safe)).toBe(safe);
  });

  it("aplica múltiplos padrões no mesmo texto", () => {
    const out = redact("AKIAIOSFODNN7EXAMPLE e sk-ant-api03-abcdef1234567890abcdef1234567890");
    expect(out).toContain("[REDACTED:AWS_ACCESS_KEY]");
    expect(out).toContain("[REDACTED:ANTHROPIC_API_KEY]");
  });
});
