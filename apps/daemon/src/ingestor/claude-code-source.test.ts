import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeCodeJsonlSource } from "./claude-code-source.js";

let testDir: string;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "tracker-source-"));
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("ClaudeCodeJsonlSource.listFiles", () => {
  it("descobre todos os .jsonl em <root>/<project>/<uuid>.jsonl", async () => {
    mkdirSync(join(testDir, "-Users-luiz-dev-csp"), { recursive: true });
    mkdirSync(join(testDir, "-Users-luiz-dev-sinusal-sinusal-legado"), { recursive: true });
    writeFileSync(join(testDir, "-Users-luiz-dev-csp", "abc.jsonl"), "");
    writeFileSync(join(testDir, "-Users-luiz-dev-sinusal-sinusal-legado", "xyz.jsonl"), "");
    writeFileSync(join(testDir, "-Users-luiz-dev-csp", "abc.json"), ""); // ignorado

    const src = new ClaudeCodeJsonlSource(testDir);
    const files = await src.listFiles();
    expect(files).toHaveLength(2);
    expect(files.find((f) => f.sessionId === "abc")?.projectDir).toContain("csp");
    expect(files.find((f) => f.sessionId === "xyz")?.projectDir).toContain("sinusal");
  });

  it("retorna size e mtime corretos", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "uuid.jsonl");
    writeFileSync(file, "hello\n");

    const src = new ClaudeCodeJsonlSource(testDir);
    const files = await src.listFiles();
    expect(files[0]!.sizeBytes).toBe(6);
    expect(files[0]!.mtimeMs).toBeGreaterThan(0);
  });
});

describe("ClaudeCodeJsonlSource.readDelta", () => {
  it("lê todas as mensagens válidas a partir de offset 0", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "uuid.jsonl");
    const lines = [
      JSON.stringify({ type: "last-prompt", leafUuid: "x" }),
      JSON.stringify({
        type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "Oi" },
      }),
      JSON.stringify({
        type: "assistant", uuid: "a1", timestamp: "2026-05-02T10:00:05Z",
        message: { role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: "Olá!" }],
          usage: { input_tokens: 5, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
      }),
    ];
    writeFileSync(path, lines.join("\n") + "\n");

    const src = new ClaudeCodeJsonlSource(testDir);
    const files = await src.listFiles();
    const delta = await src.readDelta(files[0]!, 0);
    expect(delta.messages).toHaveLength(2); // ignora last-prompt
    expect(delta.messages[0]!.uuid).toBe("u1");
    expect(delta.messages[1]!.uuid).toBe("a1");
    expect(delta.toOffset).toBe(files[0]!.sizeBytes);
  });

  it("lê apenas o delta a partir do offset informado", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "uuid.jsonl");
    const line1 = JSON.stringify({
      type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
      message: { role: "user", content: "Primeira" },
    });
    const line2 = JSON.stringify({
      type: "user", uuid: "u2", timestamp: "2026-05-02T10:00:10Z",
      message: { role: "user", content: "Segunda" },
    });
    writeFileSync(path, line1 + "\n" + line2 + "\n");

    const src = new ClaudeCodeJsonlSource(testDir);
    const files = await src.listFiles();
    const offsetAfterFirst = Buffer.byteLength(line1 + "\n", "utf8");
    const delta = await src.readDelta(files[0]!, offsetAfterFirst);
    expect(delta.messages).toHaveLength(1);
    expect(delta.messages[0]!.uuid).toBe("u2");
  });
});
