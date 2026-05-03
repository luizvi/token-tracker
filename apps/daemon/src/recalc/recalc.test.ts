import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, seedDatabase, createProject, upsertSession,
  createTask, updateTask, getTaskById, setSetting, type DbClient,
} from "@tracker/db";
import { recalcTimeAndBillableForAll, recalcCostForAll } from "./recalc.js";

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

describe("recalcTimeAndBillableForAll", () => {
  it("atualiza time_* de todas as tasks após mudança de settings", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, t.id, { tokensInput: 100, tokensOutput: 100, primaryModel: "claude-sonnet-4-6" });
    recalcTimeAndBillableForAll(db);
    const t1 = getTaskById(db, t.id)!;
    const before = t1.timeTotalSeconds;
    setSetting(db, "timePerInputTokenSeconds", 1.0);
    recalcTimeAndBillableForAll(db);
    const t2 = getTaskById(db, t.id)!;
    expect(t2.timeTotalSeconds).toBeGreaterThan(before);
    close();
  });

  it("não toca billable_hours quando locked", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, t.id, {
      tokensInput: 100, tokensOutput: 100, primaryModel: "claude-sonnet-4-6",
      humanHoursEstimate: 1, humanHoursSource: "manual",
      billableHours: 5.5, billableHoursLocked: true,
    });
    recalcTimeAndBillableForAll(db);
    expect(getTaskById(db, t.id)!.billableHours).toBe(5.5);
    close();
  });
});

describe("recalcCostForAll", () => {
  it("atualiza cost_usd após mudança de pricing", () => {
    const t = createTask(db, {
      sessionId, projectId, title: "T", startedAt: Date.parse("2026-05-02T10:00:00Z"),
    });
    updateTask(db, t.id, { tokensInput: 1_000_000, primaryModel: "claude-sonnet-4-6" });
    recalcCostForAll(db);
    expect(getTaskById(db, t.id)!.costUsd).toBeCloseTo(3, 5);
    close();
  });
});
