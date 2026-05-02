import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createProject } from "./projects.js";
import { upsertSession } from "./sessions.js";
import {
  createTask, getTaskById, listTasks, updateTask, closeTask, pauseTask,
} from "./tasks.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const handles = createDb(":memory:");
  db = handles.db;
  close = () => handles.sqlite.close();
  runMigrations(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "sess-1", projectId, jsonlPath: "/p/sess-1.jsonl" }).id;
});

describe("tasks queries", () => {
  it("createTask insere com defaults sensatos", () => {
    const t = createTask(db, { sessionId, projectId, title: "Hotfix SOC", startedAt: Date.now() });
    expect(t.status).toBe("open");
    expect(t.confidence).toBe(1);
    expect(t.tokensInput).toBe(0);
    expect(t.costUsd).toBe(0);
    close();
  });

  it("listTasks filtra por projectId", () => {
    const otherProject = createProject(db, { slug: "q", name: "Q", cwdPath: "/q" });
    const otherSession = upsertSession(db, { id: "sess-2", projectId: otherProject.id, jsonlPath: "/q/s.jsonl" });
    createTask(db, { sessionId, projectId, title: "P-task", startedAt: 1 });
    createTask(db, { sessionId: otherSession.id, projectId: otherProject.id, title: "Q-task", startedAt: 2 });
    const pTasks = listTasks(db, { projectId });
    expect(pTasks).toHaveLength(1);
    expect(pTasks[0]!.title).toBe("P-task");
    close();
  });

  it("listTasks ordena por startedAt DESC por default", () => {
    createTask(db, { sessionId, projectId, title: "First", startedAt: 1000 });
    createTask(db, { sessionId, projectId, title: "Second", startedAt: 2000 });
    const all = listTasks(db, {});
    expect(all[0]!.title).toBe("Second");
    expect(all[1]!.title).toBe("First");
    close();
  });

  it("updateTask altera campos passados", () => {
    const t = createTask(db, { sessionId, projectId, title: "Old", startedAt: 1 });
    const updated = updateTask(db, t.id, { title: "New", category: "hotfix" });
    expect(updated?.title).toBe("New");
    expect(updated?.category).toBe("hotfix");
    close();
  });

  it("closeTask altera status e endedAt", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    const closed = closeTask(db, t.id, 5000, "msg-uuid-last");
    expect(closed?.status).toBe("closed");
    expect(closed?.endedAt).toBe(5000);
    expect(closed?.lastMessageUuid).toBe("msg-uuid-last");
    close();
  });

  it("pauseTask altera status para paused", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    const paused = pauseTask(db, t.id);
    expect(paused?.status).toBe("paused");
    close();
  });

  it("listTasks filtra por status", () => {
    const a = createTask(db, { sessionId, projectId, title: "A", startedAt: 1 });
    createTask(db, { sessionId, projectId, title: "B", startedAt: 2 });
    closeTask(db, a.id, 100, null);
    expect(listTasks(db, { status: "closed" })).toHaveLength(1);
    expect(listTasks(db, { status: "open" })).toHaveLength(1);
    close();
  });
});
