import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, seedDatabase, createProject, upsertSession,
  createTask, updateTask, getTaskById, createClientRow, type DbClient,
} from "@tracker/db";
import { recomputeBillableHours } from "./biller.js";

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

describe("recomputeBillableHours", () => {
  it("calcula com factor default (0.4) quando task sem cliente", () => {
    const task = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, task.id, {
      timeTotalSeconds: 3600, // 1h Claude
      humanHoursEstimate: 3, // 3h humano
      humanHoursSource: "haiku",
    });
    recomputeBillableHours(db, task.id);
    const updated = getTaskById(db, task.id)!;
    // (1 + 3) / 2 * 0.4 = 0.8
    expect(updated.billableHours).toBeCloseTo(0.8, 5);
    close();
  });

  it("usa billable_factor do cliente quando definido", () => {
    const c = createClientRow(db, { name: "Acme", billableFactor: 0.6 });
    const task = createTask(db, { sessionId, projectId, clientId: c.id, title: "T", startedAt: 1 });
    updateTask(db, task.id, {
      timeTotalSeconds: 3600,
      humanHoursEstimate: 3,
      humanHoursSource: "haiku",
    });
    recomputeBillableHours(db, task.id);
    const updated = getTaskById(db, task.id)!;
    // (1 + 3) / 2 * 0.6 = 1.2
    expect(updated.billableHours).toBeCloseTo(1.2, 5);
    close();
  });

  it("não recalcula quando billable_hours_locked=true", () => {
    const task = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, task.id, {
      timeTotalSeconds: 3600,
      humanHoursEstimate: 3,
      humanHoursSource: "haiku",
      billableHours: 9.99,
      billableHoursLocked: true,
    });
    recomputeBillableHours(db, task.id);
    expect(getTaskById(db, task.id)!.billableHours).toBe(9.99);
    close();
  });

  it("não calcula quando human_hours_estimate é null", () => {
    const task = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, task.id, { timeTotalSeconds: 3600 });
    recomputeBillableHours(db, task.id);
    expect(getTaskById(db, task.id)!.billableHours).toBeNull();
    close();
  });
});
