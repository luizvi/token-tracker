import { newId } from "@tracker/shared";
import { desc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { daemonRuns } from "../schema.js";

export type DaemonRunRow = typeof daemonRuns.$inferSelect;

export function startDaemonRun(db: DbClient, kind: string): string {
  const id = newId();
  db.insert(daemonRuns).values({
    id, kind, startedAt: Date.now(), endedAt: null,
    filesScanned: 0, filesProcessed: 0, tasksCreated: 0, tasksUpdated: 0,
    errors: null, ok: true,
  }).run();
  return id;
}

export type FinishMetrics = {
  filesScanned?: number;
  filesProcessed?: number;
  tasksCreated?: number;
  tasksUpdated?: number;
  ok: boolean;
  errors?: unknown[];
};

export function finishDaemonRun(db: DbClient, id: string, m: FinishMetrics): void {
  db.update(daemonRuns).set({
    endedAt: Date.now(),
    filesScanned: m.filesScanned ?? 0,
    filesProcessed: m.filesProcessed ?? 0,
    tasksCreated: m.tasksCreated ?? 0,
    tasksUpdated: m.tasksUpdated ?? 0,
    ok: m.ok,
    errors: m.errors && m.errors.length > 0 ? JSON.stringify(m.errors) : null,
  }).where(eq(daemonRuns.id, id)).run();
}

export function listDaemonRuns(db: DbClient, filter: { kind?: string; limit?: number }): DaemonRunRow[] {
  const conditions = filter.kind ? eq(daemonRuns.kind, filter.kind) : undefined;
  const q = db.select().from(daemonRuns).orderBy(desc(daemonRuns.startedAt)).limit(filter.limit ?? 50);
  return conditions ? q.where(conditions).all() : q.all();
}
