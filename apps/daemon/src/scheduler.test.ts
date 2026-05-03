import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createClient, runMigrations, seedDatabase, listTasks, type DbClient,
} from "@tracker/db";
import { ClaudeCodeJsonlSource } from "./ingestor/claude-code-source.js";
import { runTick } from "./scheduler.js";

let testDir: string;
let db: DbClient;
let closeDb: () => void;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "tracker-tick-"));
  const h = createClient(":memory:");
  db = h.db; closeDb = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  closeDb();
});

describe("runTick", () => {
  it("ingere JSONL e cria tasks com cost computado", async () => {
    const dir = join(testDir, "-Users-luiz-dev-csp");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "abc.jsonl");
    writeFileSync(path, [
      JSON.stringify({ type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "feature pagamento" } }),
      JSON.stringify({ type: "assistant", uuid: "a1", timestamp: "2026-05-02T10:00:30Z",
        message: { role: "assistant", model: "claude-sonnet-4-6",
          content: [{ type: "text", text: "ok" }],
          usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }),
    ].join("\n") + "\n");

    const source = new ClaudeCodeJsonlSource(testDir);
    const metrics = await runTick(db, source);
    expect(metrics.filesProcessed).toBeGreaterThan(0);
    const tasks = listTasks(db, {});
    expect(tasks.length).toBe(1);
    expect(tasks[0]!.tokensInput).toBe(100);
    expect(tasks[0]!.timeTotalSeconds).toBeGreaterThan(0);
    expect(tasks[0]!.costUsd).toBeGreaterThan(0);
  });
});
