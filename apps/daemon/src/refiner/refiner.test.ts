import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  createClient, runMigrations, seedDatabase, createProject, upsertSession,
  createTask, updateTask, getTaskById, type DbClient,
} from "@tracker/db";
import { refineTask, type Refiner } from "./refiner.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
  projectId = createProject(db, { slug: "p", name: "Project Name", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("refineTask", () => {
  it("aplica title + category retornados pelo Haiku", async () => {
    const t = createTask(db, { sessionId, projectId, title: "feature pagamento", startedAt: 1000 });
    updateTask(db, t.id, { tokensInput: 10000 }); // > threshold
    const fakeRefiner: Refiner = {
      refine: vi.fn().mockResolvedValue({ title: "Bug cálculo pagamento", category: "hotfix" }),
    };
    await refineTask(db, t.id, fakeRefiner);
    const r = getTaskById(db, t.id)!;
    expect(r.title).toBe("Bug cálculo pagamento");
    expect(r.category).toBe("hotfix");
    expect(r.refinedByHaiku).toBe(true);
    close();
  });

  it("não atualiza task se Haiku retorna nulls", async () => {
    const t = createTask(db, { sessionId, projectId, title: "original", startedAt: 1 });
    const fakeRefiner: Refiner = {
      refine: vi.fn().mockResolvedValue({ title: null, category: null }),
    };
    await refineTask(db, t.id, fakeRefiner);
    expect(getTaskById(db, t.id)!.title).toBe("original");
    close();
  });
});
