import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createClient as createDb, runMigrations, getSessionByJsonlPath,
  listProjects, type DbClient,
} from "@tracker/db";
import { ClaudeCodeJsonlSource } from "./claude-code-source.js";
import { ingestAllPending } from "./ingestor.js";

let testDir: string;
let db: DbClient;
let closeDb: () => void;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "tracker-ingest-"));
  const h = createDb(":memory:");
  db = h.db; closeDb = () => h.sqlite.close();
  runMigrations(db);
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  closeDb();
});

function writeJsonl(path: string, lines: object[]) {
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
}

describe("ingestAllPending", () => {
  it("descobre arquivos, cria projects/sessions e retorna buffers", async () => {
    const dir = join(testDir, "-Users-luiz-dev-csp");
    mkdirSync(dir, { recursive: true });
    writeJsonl(join(dir, "abc.jsonl"), [
      { type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "Olá" } },
      { type: "assistant", uuid: "a1", timestamp: "2026-05-02T10:00:05Z",
        message: {
          role: "assistant", model: "claude-sonnet-4-6",
          content: [{ type: "text", text: "Oi!" }],
          usage: { input_tokens: 5, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        }
      },
    ]);
    const source = new ClaudeCodeJsonlSource(testDir);
    const buffers = await ingestAllPending(db, source);
    expect(buffers).toHaveLength(1);
    expect(buffers[0]!.messages).toHaveLength(2);
    const projects = listProjects(db);
    expect(projects).toHaveLength(1);
    expect(projects[0]!.slug).toBe("csp");
    expect(getSessionByJsonlPath(db, join(dir, "abc.jsonl"))).not.toBeNull();
  });

  it("não re-processa arquivos sem delta (mesmo offset)", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    writeJsonl(join(dir, "x.jsonl"), [
      { type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "A" } },
    ]);
    const source = new ClaudeCodeJsonlSource(testDir);
    await ingestAllPending(db, source);
    const second = await ingestAllPending(db, source);
    expect(second).toHaveLength(0);
  });

  it("processa apenas o delta após reescrita", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "x.jsonl");
    writeJsonl(file, [
      { type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "A" } },
    ]);
    const source = new ClaudeCodeJsonlSource(testDir);
    await ingestAllPending(db, source);

    // append nova linha
    const newLine = JSON.stringify({
      type: "user", uuid: "u2", timestamp: "2026-05-02T10:01:00Z",
      message: { role: "user", content: "B" },
    });
    const { appendFileSync } = await import("node:fs");
    appendFileSync(file, newLine + "\n");

    const second = await ingestAllPending(db, source);
    expect(second).toHaveLength(1);
    expect(second[0]!.messages).toHaveLength(1);
    expect(second[0]!.messages[0]!.uuid).toBe("u2");
  });
});
