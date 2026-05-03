import { startDaemonRun, finishDaemonRun, type DbClient } from "@tracker/db";

export interface DaemonRunMetrics {
  filesScanned: number;
  filesProcessed: number;
  tasksCreated: number;
  tasksUpdated: number;
}

export async function withDaemonRun<T>(
  db: DbClient,
  kind: string,
  work: (metrics: DaemonRunMetrics) => Promise<T>,
): Promise<T> {
  const id = startDaemonRun(db, kind);
  const metrics: DaemonRunMetrics = {
    filesScanned: 0,
    filesProcessed: 0,
    tasksCreated: 0,
    tasksUpdated: 0,
  };
  try {
    const result = await work(metrics);
    finishDaemonRun(db, id, { ...metrics, ok: true });
    return result;
  } catch (err) {
    const errObj = err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) };
    finishDaemonRun(db, id, { ...metrics, ok: false, errors: [errObj] });
    throw err;
  }
}
