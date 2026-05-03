import { listTasks, closeTask, type DbClient } from "@tracker/db";

export function closeIdleTasks(
  db: DbClient,
  idleHours: number,
  now: () => number = Date.now,
): number {
  const cutoff = now() - idleHours * 3600 * 1000;
  const opens = listTasks(db, { status: "open" });
  let closedCount = 0;
  for (const task of opens) {
    const lastTs = task.endedAt ?? task.startedAt;
    if (lastTs < cutoff) {
      closeTask(db, task.id, lastTs, task.lastMessageUuid);
      closedCount++;
    }
  }
  return closedCount;
}
