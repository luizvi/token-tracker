import { describe, expect, it } from "vitest";
import { buildRefinePrompt, parseRefineResponse, buildEstimatePrompt, parseEstimateResponse } from "./prompts.js";

describe("buildRefinePrompt", () => {
  it("inclui contexto do projeto e mensagens", () => {
    const p = buildRefinePrompt({
      projectName: "Sinusal",
      messages: [
        { role: "user", text: "preciso corrigir bug do cálculo de pagamento" },
        { role: "assistant", text: "vou investigar o ExameController..." },
      ],
    });
    expect(p.system).toContain("título");
    expect(p.user).toContain("Sinusal");
    expect(p.user).toContain("preciso corrigir");
  });
});

describe("parseRefineResponse", () => {
  it("extrai title + category de JSON válido", () => {
    const out = parseRefineResponse('{"title":"Bug cálculo pagamento","category":"hotfix"}');
    expect(out.title).toBe("Bug cálculo pagamento");
    expect(out.category).toBe("hotfix");
  });

  it("aceita JSON dentro de markdown code block", () => {
    const out = parseRefineResponse('```json\n{"title":"X","category":"feature"}\n```');
    expect(out.title).toBe("X");
  });

  it("retorna nulls quando JSON malformado", () => {
    const out = parseRefineResponse("isso não é JSON");
    expect(out.title).toBeNull();
    expect(out.category).toBeNull();
  });
});

describe("buildEstimatePrompt", () => {
  it("monta prompt para estimativa de horas humanas", () => {
    const p = buildEstimatePrompt({
      title: "Refatorar service de pagamentos",
      description: "extrair lógica de juros para classe separada",
      filesTouched: ["app/Services/PagamentoService.php"],
    });
    expect(p.system).toContain("horas");
    expect(p.user).toContain("Refatorar");
  });
});

describe("parseEstimateResponse", () => {
  it("extrai hours numérico e reasoning", () => {
    const r = parseEstimateResponse('{"hours": 2.5, "reasoning": "task simples"}');
    expect(r.hours).toBe(2.5);
    expect(r.reasoning).toBe("task simples");
  });

  it("retorna null quando JSON inválido", () => {
    expect(parseEstimateResponse("inválido").hours).toBeNull();
  });
});
