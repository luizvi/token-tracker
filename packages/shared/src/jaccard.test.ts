import { describe, expect, it } from "vitest";
import { jaccardSimilarity, tokenize } from "./jaccard.js";

describe("tokenize", () => {
  it("normaliza para lowercase, remove pontuação, ignora tokens curtos e stopwords", () => {
    const tokens = tokenize("O Sinusal está com bug no checkout. Vamos corrigir!");
    expect(tokens).toContain("sinusal");
    expect(tokens).toContain("checkout");
    expect(tokens).toContain("corrigir");
    expect(tokens).not.toContain("o");
    expect(tokens).not.toContain("com");
    expect(tokens).not.toContain("no");
  });

  it("ignora tokens com menos de 4 chars", () => {
    const tokens = tokenize("um dois tres bug");
    expect(tokens).not.toContain("um");
    expect(tokens).not.toContain("bug");
  });
});

describe("jaccardSimilarity", () => {
  it("retorna 1 para textos idênticos", () => {
    expect(jaccardSimilarity("hotfix sinusal pagamento", "hotfix sinusal pagamento")).toBe(1);
  });

  it("retorna 0 para textos sem palavras em comum", () => {
    expect(jaccardSimilarity("hotfix sinusal", "componente dashboard")).toBe(0);
  });

  it("retorna valor entre 0 e 1 para overlap parcial", () => {
    const sim = jaccardSimilarity(
      "hotfix sinusal pagamento clinica",
      "hotfix sinusal exame paciente",
    );
    expect(sim).toBeCloseTo(2 / 6, 5);
  });

  it("retorna 0 quando ambos os textos só têm stopwords", () => {
    expect(jaccardSimilarity("o que e", "a o e")).toBe(0);
  });
});
