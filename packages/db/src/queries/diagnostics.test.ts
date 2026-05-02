import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { startDaemonRun, finishDaemonRun, listDaemonRuns } from "./diagnostics.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("diagnostics", () => {
  it("start + finish completo registra duração e métricas", () => {
    const id = startDaemonRun(db, "tick");
    finishDaemonRun(db, id, {
      filesScanned: 5, filesProcessed: 2, tasksCreated: 1, tasksUpdated: 0, ok: true,
    });
    const runs = listDaemonRuns(db, { limit: 10 });
    expect(runs).toHaveLength(1);
    expect(runs[0]!.kind).toBe("tick");
    expect(runs[0]!.tasksCreated).toBe(1);
    expect(runs[0]!.ok).toBe(true);
    expect(runs[0]!.endedAt).toBeGreaterThan(0);
    close();
  });

  it("finishDaemonRun com erros grava JSON", () => {
    const id = startDaemonRun(db, "refine");
    finishDaemonRun(db, id, { ok: false, errors: [{ where: "haiku", message: "timeout" }] });
    const runs = listDaemonRuns(db, { limit: 1 });
    expect(runs[0]!.ok).toBe(false);
    expect(JSON.parse(runs[0]!.errors!)).toEqual([{ where: "haiku", message: "timeout" }]);
    close();
  });

  it("listDaemonRuns filtra por kind", () => {
    finishDaemonRun(db, startDaemonRun(db, "tick"), { ok: true });
    finishDaemonRun(db, startDaemonRun(db, "refine"), { ok: true });
    const ticks = listDaemonRuns(db, { kind: "tick" });
    expect(ticks).toHaveLength(1);
    close();
  });
});
