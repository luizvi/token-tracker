import {
  getTaskById, updateTask, type DbClient,
} from "@tracker/db";
import { HaikuClient } from "../refiner/haiku-client.js";
import { buildEstimatePrompt, parseEstimateResponse } from "../refiner/prompts.js";
import { recomputeBillableHours } from "../biller/biller.js";

export interface Estimator {
  estimate(input: { title: string; description?: string; filesTouched?: string[] }):
    Promise<{ hours: number | null; reasoning: string | null }>;
}

export class HaikuEstimator implements Estimator {
  constructor(private readonly client: HaikuClient) {}
  async estimate(input: { title: string; description?: string; filesTouched?: string[] }) {
    const { system, user } = buildEstimatePrompt(input);
    const text = await this.client.complete({ system, user, maxTokens: 256 });
    return parseEstimateResponse(text);
  }
}

export async function estimateTaskHours(
  db: DbClient,
  taskId: string,
  estimator: Estimator,
): Promise<void> {
  const task = getTaskById(db, taskId);
  if (!task) return;
  if (task.humanHoursSource === "manual") return;

  const result = await estimator.estimate({
    title: task.title,
    description: task.description ?? undefined,
  });
  if (result.hours === null) return;

  updateTask(db, taskId, {
    humanHoursEstimate: result.hours,
    humanHoursSource: "haiku",
    humanHoursReasoning: result.reasoning,
  });

  // Recompute billable após atualizar horas humanas
  recomputeBillableHours(db, taskId);
}
