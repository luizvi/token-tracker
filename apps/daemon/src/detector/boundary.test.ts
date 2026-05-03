import { describe, expect, it } from "vitest";
import { decideBoundary } from "./boundary.js";
import { DEFAULT_SETTINGS } from "@tracker/shared";

const settings = DEFAULT_SETTINGS.detection;

function userMsg(text: string, hourBrt: number, gapMin = 0): { ts: number; text: string } {
  // Constrói epoch em BRT
  const utcHour = hourBrt + 3; // BRT to UTC
  return {
    ts: Date.UTC(2026, 4, 2, utcHour, 0, 0) + gapMin * 60_000,
    text,
  };
}

describe("decideBoundary", () => {
  it("primeira mensagem cria nova tarefa", () => {
    const m = userMsg("começar feature de pagamento", 10);
    const d = decideBoundary({
      newUser: m,
      prevAssistantTs: null,
      lastUserText: null,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("start");
  });

  it("retoma tarefa quando gap pequeno e mesmo tópico", () => {
    const prev = userMsg("começar feature de pagamento", 10);
    const next = userMsg("e agora vamos validar o input", 10, 5);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("continue");
  });

  it("'voltando' explícito → continue mesmo após gap longo", () => {
    const prev = userMsg("começar feature de pagamento", 10);
    const next = userMsg("voltando — vamos seguir aquela feature", 14, 0);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("continue");
    expect(d.reason).toContain("resume");
  });

  it("nova msg dentro da janela noturna após gap → pause", () => {
    const prev = userMsg("trabalhar feature", 22);
    const next = userMsg("uma observação rápida", 23, 60);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("pause");
  });

  it("mudança de skill → close + start", () => {
    const prev = userMsg("vamos trabalhar pagamentos", 10);
    const next = userMsg("agora outra coisa, vamos depurar", 10, 5);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: "brainstorming",
      currentSkill: "debugging",
      settings,
    });
    expect(d.action).toBe("close-and-start");
  });

  it("gap longo e jaccard baixo → close + start", () => {
    const prev = userMsg("feature pagamento clinica", 14);
    const next = userMsg("componente dashboard heatmap", 16, 60);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("close-and-start");
    expect(d.confidence).toBeGreaterThan(0);
  });

  it("gap longo mas jaccard alto → continue (ambíguo)", () => {
    const prev = userMsg("feature pagamento clinica boleto", 14);
    const next = userMsg("feature pagamento clinica boleto continuar", 14, 60);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("continue");
    expect(d.confidence).toBeLessThan(1);
  });
});
