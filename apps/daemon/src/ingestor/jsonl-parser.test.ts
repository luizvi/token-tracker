import { describe, expect, it } from "vitest";
import { parseJsonlLine } from "./jsonl-parser.js";

describe("parseJsonlLine", () => {
  it("ignora linhas que não são user/assistant", () => {
    expect(parseJsonlLine('{"type":"last-prompt","leafUuid":"x"}')).toBeNull();
    expect(parseJsonlLine('{"type":"permission-mode","permissionMode":"x"}')).toBeNull();
    expect(parseJsonlLine('{"type":"system","content":"x"}')).toBeNull();
  });

  it("parseia mensagem user com text content", () => {
    const line = JSON.stringify({
      type: "user",
      uuid: "u-1",
      timestamp: "2026-05-02T15:30:00Z",
      message: { role: "user", content: "Olá" },
    });
    const msg = parseJsonlLine(line);
    expect(msg?.role).toBe("user");
    expect(msg?.uuid).toBe("u-1");
    expect(msg?.text).toBe("Olá");
    expect(msg?.timestampMs).toBe(Date.parse("2026-05-02T15:30:00Z"));
  });

  it("parseia mensagem assistant com tokens e modelo", () => {
    const line = JSON.stringify({
      type: "assistant",
      uuid: "a-1",
      timestamp: "2026-05-02T15:31:00Z",
      message: {
        role: "assistant",
        model: "claude-opus-4-7",
        content: [{ type: "text", text: "Oi!" }],
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          cache_read_input_tokens: 500,
          cache_creation_input_tokens: 50,
        },
      },
    });
    const msg = parseJsonlLine(line);
    expect(msg?.role).toBe("assistant");
    expect(msg?.text).toBe("Oi!");
    expect(msg?.model).toBe("claude-opus-4-7");
    expect(msg?.tokens).toEqual({ input: 100, output: 20, cacheRead: 500, cacheCreation: 50 });
  });

  it("retorna null para linhas malformadas", () => {
    expect(parseJsonlLine("{")).toBeNull();
    expect(parseJsonlLine("not-json")).toBeNull();
    expect(parseJsonlLine("")).toBeNull();
  });

  it("extrai tool_uses de assistant content array", () => {
    const line = JSON.stringify({
      type: "assistant",
      uuid: "a-2",
      timestamp: "2026-05-02T15:32:00Z",
      message: {
        role: "assistant",
        model: "claude-sonnet-4-6",
        content: [
          { type: "text", text: "Vou rodar o teste." },
          { type: "tool_use", name: "Bash", input: { command: "pnpm test" } },
        ],
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    });
    const msg = parseJsonlLine(line);
    expect(msg?.toolUses).toEqual([{ name: "Bash", input: { command: "pnpm test" } }]);
  });
});
