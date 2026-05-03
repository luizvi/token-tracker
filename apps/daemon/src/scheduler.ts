import { type DbClient, getSetting } from "@tracker/db";
import type { TranscriptSource } from "@tracker/shared";
import { ingestAllPending } from "./ingestor/ingestor.js";
import { processMessages } from "./detector/detector.js";
import { closeIdleTasks } from "./close-idle/close-idle.js";

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
