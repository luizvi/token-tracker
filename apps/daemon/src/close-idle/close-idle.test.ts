import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, createProject, upsertSession, createTask,
  updateTask, listTasks, type DbClient,
} from "@tracker/db";
import { closeIdleTasks } from "./close-idle.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("closeIdleTasks", () => {
  it("fecha task open com último msg > idleHours", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1000 });
    updateTask(db, t.id, { endedAt: 1000 });
    const now = 1000 + 7 * 3600 * 1000; // 7h depois
    closeIdleTasks(db, 6, () => now);
    const after = listTasks(db, { sessionId })[0]!;
    expect(after.status).toBe("closed");
    close();
  });

  it("não fecha task com gap < idleHours", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1000 });
    updateTask(db, t.id, { endedAt: 1000 });
    const now = 1000 + 1 * 3600 * 1000; // 1h depois
    closeIdleTasks(db, 6, () => now);
    expect(listTasks(db, { sessionId })[0]!.status).toBe("open");
    close();
  });

  it("não fecha task paused (preserva pausa noturna)", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1000 });
    updateTask(db, t.id, { endedAt: 1000, status: "paused" });
    const now = 1000 + 24 * 3600 * 1000;
    closeIdleTasks(db, 6, () => now);
    expect(listTasks(db, { sessionId })[0]!.status).toBe("paused");
    close();
  });
});
