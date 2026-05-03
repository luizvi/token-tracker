import {
  listTasks, updateTask, getSetting, type DbClient,
} from "@tracker/db";
import { calculateTimeBlocks } from "@tracker/shared";
import { recomputeTaskCost } from "../pricing/pricer.js";
import { recomputeBillableHours } from "../biller/biller.js";

function loadTimeConfig(db: DbClient) {
  return {
    timePerInputTokenSeconds: getSetting<number>(db, "timePerInputTokenSeconds") ?? 0.5,
    timePerProcessingOutputTokenSeconds: getSetting<number>(db, "timePerProcessingOutputTokenSeconds") ?? 0.05,
    timePerReadingTokenSeconds: getSetting<number>(db, "timePerReadingTokenSeconds") ?? 0.15,
    cacheReadFactor: getSetting<number>(db, "cacheReadFactor") ?? 0.1,
  };
}

export function recalcTimeAndBillableForAll(db: DbClient): void {
  const cfg = loadTimeConfig(db);
  const tasks = listTasks(db, {});
  for (const task of tasks) {
    const blocks = calculateTimeBlocks({
      input: task.tokensInput,
      output: task.tokensOutput,
      cacheRead: task.tokensCacheRead,
      cacheCreation: task.tokensCacheCreation,
    }, cfg);
    updateTask(db, task.id, {
      timeInputSeconds: blocks.inputSeconds,
      timeProcessingOutputSeconds: blocks.processingOutputSeconds,
      timeReadingSeconds: blocks.readingSeconds,
      timeTotalSeconds: blocks.totalSeconds,
    });
    recomputeBillableHours(db, task.id);
  }
}

export function recalcCostForAll(db: DbClient): void {
  const tasks = listTasks(db, {});
  for (const task of tasks) recomputeTaskCost(db, task.id);
}
