import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, listTasks, createProject, upsertSession,
  type DbClient, getSetting,
} from "@tracker/db";
import { DEFAULT_SETTINGS } from "@tracker/shared";
import { processMessages } from "./detector.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "sess", projectId, jsonlPath: "/p/sess.jsonl" }).id;
});

describe("processMessages", () => {
  it("primeira sequência user/assistant cria 1 task open", async () => {
    await processMessages(db, sessionId, projectId, [
      { uuid: "u1", role: "user", timestampMs: 1000, text: "começar feature", tokens: undefined as never},
      { uuid: "a1", role: "assistant", timestampMs: 2000, text: "ok!", model: "claude-sonnet-4-6",
        tokens: { input: 10, output: 5, cacheRead: 0, cacheCreation: 0 } },
    ], DEFAULT_SETTINGS.detection);
    const tasks = listTasks(db, { sessionId });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.status).toBe("open");
    expect(tasks[0]!.tokensInput).toBe(10);
    expect(tasks[0]!.tokensOutput).toBe(5);
    close();
  });

  it("nova msg user com gap longo + tópico diferente → close + new task", async () => {
    await processMessages(db, sessionId, projectId, [
      { uuid: "u1", role: "user", timestampMs: Date.UTC(2026, 4, 2, 13, 0, 0),
        text: "feature pagamento clinica", tokens: undefined as never},
      { uuid: "a1", role: "assistant", timestampMs: Date.UTC(2026, 4, 2, 13, 0, 5),
        text: "ok", model: "claude-sonnet-4-6",
        tokens: { input: 5, output: 5, cacheRead: 0, cacheCreation: 0 } },
      { uuid: "u2", role: "user", timestampMs: Date.UTC(2026, 4, 2, 14, 0, 0),
        text: "componente dashboard heatmap", tokens: undefined as never},
      { uuid: "a2", role: "assistant", timestampMs: Date.UTC(2026, 4, 2, 14, 0, 5),
        text: "ok", model: "claude-sonnet-4-6",
        tokens: { input: 5, output: 5, cacheRead: 0, cacheCreation: 0 } },
    ], DEFAULT_SETTINGS.detection);
    const tasks = listTasks(db, { sessionId });
    expect(tasks.length).toBe(2);
    const closed = tasks.find((t) => t.status === "closed");
    const open = tasks.find((t) => t.status === "open");
    expect(closed).toBeTruthy();
    expect(open).toBeTruthy();
    close();
  });

  it("agrega tokens corretamente sobre múltiplas mensagens da mesma task", async () => {
    await processMessages(db, sessionId, projectId, [
      { uuid: "u1", role: "user", timestampMs: 1000, text: "feature x", tokens: undefined as never},
      { uuid: "a1", role: "assistant", timestampMs: 2000, text: "ok", model: "claude-sonnet-4-6",
        tokens: { input: 10, output: 5, cacheRead: 100, cacheCreation: 50 } },
      { uuid: "u2", role: "user", timestampMs: 3000, text: "feature x continua", tokens: undefined as never},
      { uuid: "a2", role: "assistant", timestampMs: 4000, text: "ok2", model: "claude-sonnet-4-6",
        tokens: { input: 20, output: 10, cacheRead: 0, cacheCreation: 0 } },
    ], DEFAULT_SETTINGS.detection);
    const tasks = listTasks(db, { sessionId });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.tokensInput).toBe(30);
    expect(tasks[0]!.tokensOutput).toBe(15);
    expect(tasks[0]!.tokensCacheRead).toBe(100);
    expect(tasks[0]!.tokensCacheCreation).toBe(50);
    close();
  });

  it("calcula time blocks e cost após agregar tokens", async () => {
    // seed pricing já feito implicitamente pelo seedDatabase no setup? Não — adicionar aqui:
    const { seedDatabase } = await import("@tracker/db");
    seedDatabase(db);
    // Use 2026 timestamp to match seeded pricing (valid_from: 2026-01-01)
    const ts2026 = Date.parse("2026-05-02T10:00:00Z");
    await processMessages(db, sessionId, projectId, [
      { uuid: "u1", role: "user", timestampMs: ts2026, text: "feature x", tokens: undefined as never},
      { uuid: "a1", role: "assistant", timestampMs: ts2026 + 1000, text: "ok", model: "claude-sonnet-4-6",
        tokens: { input: 1000, output: 200, cacheRead: 0, cacheCreation: 0 } },
    ], DEFAULT_SETTINGS.detection);
    const t = listTasks(db, { sessionId })[0]!;
    expect(t.timeTotalSeconds).toBeGreaterThan(0);
    expect(t.costUsd).toBeGreaterThan(0);
  });
});
