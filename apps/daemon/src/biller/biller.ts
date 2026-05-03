import {
  getTaskById, updateTask, getClientById, getSetting, type DbClient,
} from "@tracker/db";

export function recomputeBillableHours(db: DbClient, taskId: string): void {
  const task = getTaskById(db, taskId);
  if (!task) return;
  if (task.billableHoursLocked) return;
  if (task.humanHoursEstimate === null || task.humanHoursEstimate === undefined) return;

  let factor = getSetting<number>(db, "billableFactorDefault") ?? 0.4;
  if (task.clientId) {
    const client = getClientById(db, task.clientId);
    if (client && client.billableFactor !== null) factor = client.billableFactor;
  }

  const claudeHours = (task.timeTotalSeconds ?? 0) / 3600;
  const billable = ((claudeHours + task.humanHoursEstimate) / 2) * factor;

  updateTask(db, taskId, { billableHours: billable });
}
