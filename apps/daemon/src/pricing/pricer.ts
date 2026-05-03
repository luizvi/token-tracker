import {
  findPricingFor, getTaskById, updateTask, type DbClient,
} from "@tracker/db";
import { calculateCost } from "@tracker/shared";

export function recomputeTaskCost(db: DbClient, taskId: string): void {
  const task = getTaskById(db, taskId);
  if (!task || !task.primaryModel) return;

  const pricing = findPricingFor(db, task.primaryModel, task.startedAt);
  if (!pricing) return;

  const cost = calculateCost(
    {
      input: task.tokensInput,
      output: task.tokensOutput,
      cacheRead: task.tokensCacheRead,
      cacheCreation: task.tokensCacheCreation,
    },
    {
      model: pricing.model,
      inputPerMtok: pricing.inputPerMtok,
      outputPerMtok: pricing.outputPerMtok,
      cacheReadPerMtok: pricing.cacheReadPerMtok,
      cacheCreationPerMtok: pricing.cacheCreationPerMtok,
      validFromMs: pricing.validFrom,
      validUntilMs: pricing.validUntil,
    },
  );

  updateTask(db, taskId, { costUsd: cost });
}
