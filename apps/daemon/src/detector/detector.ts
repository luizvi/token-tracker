import {
  listTasks, createTask, updateTask, closeTask, pauseTask, getSetting,
  type DbClient, type TaskRow,
} from "@tracker/db";
import type { TranscriptMessage } from "@tracker/shared";
import { calculateTimeBlocks } from "@tracker/shared";
import { decideBoundary } from "./boundary.js";
import { isSystemTaskTitle } from "./classify-system.js";
import { recomputeTaskCost } from "../pricing/pricer.js";

interface DetectorSettings {
  gapMinutesBase: number;
  nightHoursStart: number;
  nightHoursEnd: number;
  semanticThreshold: number;
  resumeKeywords: readonly string[];
  newTopicKeywords: readonly string[];
}

function getOpenOrPausedTask(db: DbClient, sessionId: string): TaskRow | null {
  const all = listTasks(db, { sessionId });
  return all.find((t) => t.status === "open" || t.status === "paused") ?? null;
}

function aggregateTokens(task: TaskRow, msg: TranscriptMessage) {
  if (!msg.tokens) return null;
  return {
    tokensInput: task.tokensInput + msg.tokens.input,
    tokensOutput: task.tokensOutput + msg.tokens.output,
    tokensCacheRead: task.tokensCacheRead + msg.tokens.cacheRead,
    tokensCacheCreation: task.tokensCacheCreation + msg.tokens.cacheCreation,
    lastMessageUuid: msg.uuid,
    endedAt: msg.timestampMs,
  };
}

function deriveTitleFromUser(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 60) return trimmed;
  return trimmed.slice(0, 57) + "...";
}

export async function processMessages(
  db: DbClient,
  sessionId: string,
  projectId: string,
  messages: TranscriptMessage[],
  settings: DetectorSettings,
): Promise<void> {
  let currentTask = getOpenOrPausedTask(db, sessionId);
  let lastUserText: string | null = currentTask
    ? null /* unknown — fallback empty */
    : null;
  let lastAssistantTs: number | null = currentTask?.endedAt ?? null;

  for (const msg of messages) {
    if (msg.role === "user") {
      const decision = decideBoundary({
        newUser: { ts: msg.timestampMs, text: msg.text },
        prevAssistantTs: lastAssistantTs,
        lastUserText,
        lastSkill: null,
        currentSkill: null,
        settings,
      });

      if (decision.action === "start" || (currentTask === null && decision.action !== "pause")) {
        const title = deriveTitleFromUser(msg.text);
        currentTask = createTask(db, {
          sessionId,
          projectId,
          title,
          startedAt: msg.timestampMs,
          firstMessageUuid: msg.uuid,
          confidence: decision.confidence,
        });
        if (isSystemTaskTitle(title)) {
          updateTask(db, currentTask.id, { category: "system" });
          currentTask = { ...currentTask, category: "system" };
        }
      } else if (decision.action === "close-and-start" && currentTask) {
        closeTask(db, currentTask.id, lastAssistantTs ?? msg.timestampMs, currentTask.lastMessageUuid);
        const title = deriveTitleFromUser(msg.text);
        currentTask = createTask(db, {
          sessionId,
          projectId,
          title,
          startedAt: msg.timestampMs,
          firstMessageUuid: msg.uuid,
          confidence: decision.confidence,
        });
        if (isSystemTaskTitle(title)) {
          updateTask(db, currentTask.id, { category: "system" });
          currentTask = { ...currentTask, category: "system" };
        }
      } else if (decision.action === "pause" && currentTask) {
        if (currentTask.status === "open") pauseTask(db, currentTask.id);
        // Não cria nova; espera próxima msg fora da janela noturna
      } else if (decision.action === "continue" && currentTask?.status === "paused") {
        updateTask(db, currentTask.id, { status: "open" });
        currentTask = { ...currentTask, status: "open" };
      }

      lastUserText = msg.text;
    }

    if (msg.role === "assistant" && currentTask && currentTask.status !== "paused") {
      const agg = aggregateTokens(currentTask, msg);
      if (agg) {
        const modelsArray = currentTask.modelsUsed ? JSON.parse(currentTask.modelsUsed) as string[] : [];
        if (msg.model && !modelsArray.includes(msg.model)) modelsArray.push(msg.model);
        updateTask(db, currentTask.id, {
          ...agg,
          modelsUsed: JSON.stringify(modelsArray),
          primaryModel: currentTask.primaryModel ?? msg.model ?? null,
        });
        currentTask = { ...currentTask, ...agg };

        // Compute time blocks and cost after token aggregation
        const timeCfg = {
          timePerInputTokenSeconds: getSetting<number>(db, "timePerInputTokenSeconds") ?? 0.5,
          timePerProcessingOutputTokenSeconds: getSetting<number>(db, "timePerProcessingOutputTokenSeconds") ?? 0.05,
          timePerReadingTokenSeconds: getSetting<number>(db, "timePerReadingTokenSeconds") ?? 0.15,
          cacheReadFactor: getSetting<number>(db, "cacheReadFactor") ?? 0.1,
        };
        const blocks = calculateTimeBlocks({
          input: agg.tokensInput,
          output: agg.tokensOutput,
          cacheRead: agg.tokensCacheRead,
          cacheCreation: agg.tokensCacheCreation,
        }, timeCfg);
        updateTask(db, currentTask.id, {
          timeInputSeconds: blocks.inputSeconds,
          timeProcessingOutputSeconds: blocks.processingOutputSeconds,
          timeReadingSeconds: blocks.readingSeconds,
          timeTotalSeconds: blocks.totalSeconds,
        });
        recomputeTaskCost(db, currentTask.id);
      }
      lastAssistantTs = msg.timestampMs;
    }
  }
}
