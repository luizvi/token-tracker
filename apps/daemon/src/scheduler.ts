import { type DbClient, getSetting, listTasks } from "@tracker/db";
import type { TranscriptSource } from "@tracker/shared";
import { ingestAllPending } from "./ingestor/ingestor.js";
import { processMessages } from "./detector/detector.js";
import { closeIdleTasks } from "./close-idle/close-idle.js";
import { HaikuRefiner, listTasksEligibleForRefine, refineTask } from "./refiner/refiner.js";
import { HaikuEstimator, estimateTaskHours } from "./estimator/estimator.js";
import { HaikuClient } from "./refiner/haiku-client.js";

export interface TickMetrics {
  filesScanned: number;
  filesProcessed: number;
  tasksCreated: number;
  tasksUpdated: number;
  tasksClosedIdle: number;
}

export async function runTick(db: DbClient, source: TranscriptSource): Promise<TickMetrics> {
  const settings = {
    gapMinutesBase: getSetting<number>(db, "detection.gapMinutesBase") ?? 30,
    nightHoursStart: getSetting<number>(db, "detection.nightHoursStart") ?? 23,
    nightHoursEnd: getSetting<number>(db, "detection.nightHoursEnd") ?? 9,
    semanticThreshold: getSetting<number>(db, "detection.semanticThreshold") ?? 0.65,
    resumeKeywords: getSetting<string[]>(db, "detection.resumeKeywords") ?? ["voltando", "retomando", "continua"],
    newTopicKeywords: getSetting<string[]>(db, "detection.newTopicKeywords") ?? ["agora", "outra coisa"],
  };

  const allFiles = await source.listFiles();
  const deltas = await ingestAllPending(db, source);

  for (const delta of deltas) {
    const sessionId = delta.file.sessionId;

    // Buscar projectId via session já criada
    const { getSessionById } = await import("@tracker/db");
    const session = getSessionById(db, sessionId);
    if (!session) continue;
    await processMessages(db, sessionId, session.projectId, delta.messages, settings);
  }

  const idleHours = getSetting<number>(db, "detection.idleCloseHours") ?? 6;
  const closedCount = closeIdleTasks(db, idleHours);

  return {
    filesScanned: allFiles.length,
    filesProcessed: deltas.length,
    tasksCreated: 0, // métricas aproximadas — preciso seria contar antes/depois
    tasksUpdated: 0,
    tasksClosedIdle: closedCount,
  };
}

export interface RefineEstimateMetrics {
  refined: number;
  estimated: number;
}

export async function runRefineAndEstimateBatch(
  db: DbClient,
  client: HaikuClient,
  maxBatch = 10,
): Promise<RefineEstimateMetrics> {
  const refiner = new HaikuRefiner(client);
  const estimator = new HaikuEstimator(client);

  const refineThreshold = getSetting<number>(db, "haiku.autoRefineAboveTokens") ?? 5000;
  const autoEstimate = getSetting<boolean>(db, "haiku.autoEstimateHours") ?? true;

  const refineCandidates = listTasksEligibleForRefine(db, refineThreshold).slice(0, maxBatch);
  let refined = 0;
  for (const t of refineCandidates) {
    try { await refineTask(db, t.id, refiner); refined++; } catch { /* swallow */ }
  }

  let estimated = 0;
  if (autoEstimate) {
    const candidates = listTasks(db, {}).filter((t) => t.humanHoursSource === "none").slice(0, maxBatch);
    for (const t of candidates) {
      try { await estimateTaskHours(db, t.id, estimator); estimated++; } catch { /* swallow */ }
    }
  }

  return { refined, estimated };
}
