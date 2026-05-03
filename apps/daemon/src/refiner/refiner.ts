import {
  getTaskById, updateTask, listTasks, listProjects, type DbClient, type TaskRow,
} from "@tracker/db";
import { HaikuClient } from "./haiku-client.js";
import { buildRefinePrompt, parseRefineResponse } from "./prompts.js";

export interface Refiner {
  refine(input: { projectName: string; messages: Array<{ role: string; text: string }> }):
    Promise<{ title: string | null; category: string | null }>;
}

export class HaikuRefiner implements Refiner {
  constructor(private readonly client: HaikuClient) {}
  async refine(input: { projectName: string; messages: Array<{ role: string; text: string }> }) {
    const { system, user } = buildRefinePrompt(input);
    const text = await this.client.complete({ system, user, maxTokens: 256 });
    return parseRefineResponse(text);
  }
}

export async function refineTask(db: DbClient, taskId: string, refiner: Refiner): Promise<void> {
  const task = getTaskById(db, taskId);
  if (!task) return;

  // Buscar projectName
  const project = listProjects(db).find((p) => p.id === task.projectId);
  if (!project) return;

  // Mensagens da sessão (simplificação Fase 1: usa título atual + descrição existente)
  // Para Plan 4+ podemos passar transcript completo
  const messages = [
    { role: "user", text: task.title },
    ...(task.description ? [{ role: "context", text: task.description }] : []),
  ];

  const result = await refiner.refine({ projectName: project.name, messages });
  if (!result.title && !result.category) return;
  updateTask(db, taskId, {
    title: result.title ?? task.title,
    category: result.category ?? task.category,
    refinedByHaiku: true,
  });
}

export function listTasksEligibleForRefine(
  db: DbClient,
  thresholdTokens: number,
): TaskRow[] {
  return listTasks(db, {}).filter((t: TaskRow) =>
    !t.refinedByHaiku &&
    (t.tokensInput + t.tokensOutput + t.tokensCacheRead) > thresholdTokens,
  );
}
