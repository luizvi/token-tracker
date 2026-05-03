import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, seedDatabase, listTasks, createProject,
  upsertSession, createTask, updateTask, type DbClient,
} from "@tracker/db";
import { recomputeTaskCost } from "./pricer.js";

let db: DbClient;
let close: () => void;
let sessionId: string;
let projectId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("recomputeTaskCost", () => {
  it("calcula custo com pricing válido em task.startedAt", () => {
    const task = createTask(db, {
      sessionId, projectId, title: "T", startedAt: Date.parse("2026-05-02T10:00:00Z"),
    });
    updateTask(db, task.id, {
      tokensInput: 1_000_000,
      tokensOutput: 0,
      tokensCacheRead: 0,
      tokensCacheCreation: 0,
      primaryModel: "claude-sonnet-4-6",
    });
    recomputeTaskCost(db, task.id);
    const updated = listTasks(db, { sessionId })[0]!;
    expect(updated.costUsd).toBeCloseTo(3, 5); // 1M * 3/1M = 3
    close();
  });

  it("ignora task sem primary_model (custo zero)", () => {
    const task = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    recomputeTaskCost(db, task.id);
    const updated = listTasks(db, { sessionId })[0]!;
    expect(updated.costUsd).toBe(0);
    close();
  });
});
