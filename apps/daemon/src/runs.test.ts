import { describe, expect, it, beforeEach } from "vitest";
import { createClient, runMigrations, listDaemonRuns, type DbClient } from "@tracker/db";
import { withDaemonRun, type DaemonRunMetrics } from "./runs.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("withDaemonRun", () => {
  it("envolve trabalho com start+finish quando OK", async () => {
    await withDaemonRun(db, "tick", async (metrics) => {
      metrics.filesScanned = 3;
      metrics.tasksCreated = 1;
    });
    const runs = listDaemonRuns(db, { limit: 1 });
    expect(runs[0]!.ok).toBe(true);
    expect(runs[0]!.filesScanned).toBe(3);
    expect(runs[0]!.tasksCreated).toBe(1);
    close();
  });

  it("captura erros, marca ok=false e re-lança", async () => {
    await expect(withDaemonRun(db, "tick", async () => {
      throw new Error("boom");
    })).rejects.toThrow("boom");
    const runs = listDaemonRuns(db, { limit: 1 });
    expect(runs[0]!.ok).toBe(false);
    expect(JSON.parse(runs[0]!.errors!)[0].message).toBe("boom");
    close();
  });
});
