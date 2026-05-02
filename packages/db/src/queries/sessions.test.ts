import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createProject } from "./projects.js";
import {
  upsertSession, getSessionByJsonlPath, updateSessionOffset, addSessionTokens,
} from "./sessions.js";

let db: DbClient;
let close: () => void;
let projectId: string;

beforeEach(() => {
  const handles = createDb(":memory:");
  db = handles.db;
  close = () => handles.sqlite.close();
  runMigrations(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
});

describe("sessions queries", () => {
  it("upsertSession cria se não existe", () => {
    const s = upsertSession(db, {
      id: "session-uuid-1", projectId, jsonlPath: "/path/to/session.jsonl",
    });
    expect(s.id).toBe("session-uuid-1");
    expect(s.lastProcessedOffset).toBe(0);
    close();
  });

  it("upsertSession retorna existente se ja existe (não duplica)", () => {
    upsertSession(db, { id: "s1", projectId, jsonlPath: "/p/s1.jsonl" });
    const again = upsertSession(db, { id: "s1", projectId, jsonlPath: "/p/s1.jsonl" });
    expect(again.id).toBe("s1");
    close();
  });

  it("updateSessionOffset persiste novo offset e timestamp", () => {
    upsertSession(db, { id: "s1", projectId, jsonlPath: "/p/s1.jsonl" });
    updateSessionOffset(db, "s1", 12345);
    const s = getSessionByJsonlPath(db, "/p/s1.jsonl");
    expect(s?.lastProcessedOffset).toBe(12345);
    expect(s?.lastProcessedAt).toBeGreaterThan(0);
    close();
  });

  it("addSessionTokens incrementa contadores e custo total", () => {
    upsertSession(db, { id: "s1", projectId, jsonlPath: "/p/s1.jsonl" });
    addSessionTokens(db, "s1", { input: 100, output: 50, cacheRead: 200, cacheCreation: 10, costUsd: 0.123 });
    addSessionTokens(db, "s1", { input: 50, output: 25, cacheRead: 0, cacheCreation: 0, costUsd: 0.05 });
    const s = getSessionByJsonlPath(db, "/p/s1.jsonl")!;
    expect(s.totalTokensInput).toBe(150);
    expect(s.totalTokensOutput).toBe(75);
    expect(s.totalTokensCacheRead).toBe(200);
    expect(s.totalCostUsd).toBeCloseTo(0.173, 5);
    close();
  });
});
