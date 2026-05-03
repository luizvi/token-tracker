import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  createClient, runMigrations, seedDatabase, createProject, upsertSession,
  createTask, updateTask, getTaskById, type DbClient,
} from "@tracker/db";
import { estimateTaskHours, type Estimator } from "./estimator.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("estimateTaskHours", () => {
  it("aplica hours + reasoning, source=haiku", async () => {
    const t = createTask(db, { sessionId, projectId, title: "Refatorar service", startedAt: 1 });
    const fake: Estimator = {
      estimate: vi.fn().mockResolvedValue({ hours: 3, reasoning: "complexity médio" }),
    };
    await estimateTaskHours(db, t.id, fake);
    const r = getTaskById(db, t.id)!;
    expect(r.humanHoursEstimate).toBe(3);
    expect(r.humanHoursSource).toBe("haiku");
    expect(r.humanHoursReasoning).toBe("complexity médio");
    close();
  });

  it("não sobrescreve quando source=manual", async () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, t.id, { humanHoursEstimate: 5, humanHoursSource: "manual" });
    const fake: Estimator = {
      estimate: vi.fn().mockResolvedValue({ hours: 99, reasoning: "x" }),
    };
    await estimateTaskHours(db, t.id, fake);
    const r = getTaskById(db, t.id)!;
    expect(r.humanHoursEstimate).toBe(5);
    expect(r.humanHoursSource).toBe("manual");
    expect(fake.estimate).not.toHaveBeenCalled();
    close();
  });

  it("não atualiza quando Haiku retorna hours=null", async () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    const fake: Estimator = {
      estimate: vi.fn().mockResolvedValue({ hours: null, reasoning: null }),
    };
    await estimateTaskHours(db, t.id, fake);
    expect(getTaskById(db, t.id)!.humanHoursEstimate).toBeNull();
    close();
  });
});
