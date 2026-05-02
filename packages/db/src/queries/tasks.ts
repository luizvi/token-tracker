import { newId } from "@tracker/shared";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { tasks } from "../schema.js";

export type TaskRow = typeof tasks.$inferSelect;

export type NewTaskInput = {
  sessionId: string;
  projectId: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  startedAt: number;
  firstMessageUuid?: string | null;
  isBackfilled?: boolean;
  confidence?: number;
};

export function createTask(db: DbClient, input: NewTaskInput): TaskRow {
  const now = Date.now();
  const row = {
    id: newId(),
    sessionId: input.sessionId,
    projectId: input.projectId,
    clientId: input.clientId ?? null,
    title: input.title,
    description: input.description ?? null,
    category: null,
    status: "open" as const,
    startedAt: input.startedAt,
    endedAt: null,
    firstMessageUuid: input.firstMessageUuid ?? null,
    lastMessageUuid: null,
    tokensInput: 0,
    tokensOutput: 0,
    tokensCacheRead: 0,
    tokensCacheCreation: 0,
    primaryModel: null,
    modelsUsed: null,
    timeInputSeconds: 0,
    timeProcessingOutputSeconds: 0,
    timeReadingSeconds: 0,
    timeTotalSeconds: 0,
    humanHoursEstimate: null,
    humanHoursSource: "none" as const,
    humanHoursReasoning: null,
    billableHours: null,
    billableHoursLocked: false,
    costUsd: 0,
    isBackfilled: input.isBackfilled ?? false,
    refinedByHaiku: false,
    confidence: input.confidence ?? 1,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(tasks).values(row).run();
  return row as TaskRow;
}

export function getTaskById(db: DbClient, id: string): TaskRow | null {
  return db.select().from(tasks).where(eq(tasks.id, id)).all()[0] ?? null;
}

export type ListTasksFilter = {
  projectId?: string;
  clientId?: string;
  sessionId?: string;
  status?: "open" | "paused" | "closed";
};

export function listTasks(db: DbClient, filter: ListTasksFilter): TaskRow[] {
  const conditions = [];
  if (filter.projectId) conditions.push(eq(tasks.projectId, filter.projectId));
  if (filter.clientId) conditions.push(eq(tasks.clientId, filter.clientId));
  if (filter.sessionId) conditions.push(eq(tasks.sessionId, filter.sessionId));
  if (filter.status) conditions.push(eq(tasks.status, filter.status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const query = db.select().from(tasks).orderBy(desc(tasks.startedAt));
  return where ? query.where(where).all() : query.all();
}

export function updateTask(
  db: DbClient,
  id: string,
  patch: Partial<Omit<TaskRow, "id" | "createdAt" | "updatedAt">>,
): TaskRow | null {
  const current = getTaskById(db, id);
  if (!current) return null;
  db.update(tasks).set({ ...patch, updatedAt: Date.now() }).where(eq(tasks.id, id)).run();
  return getTaskById(db, id);
}

export function closeTask(
  db: DbClient, id: string, endedAt: number, lastMessageUuid: string | null,
): TaskRow | null {
  return updateTask(db, id, { status: "closed", endedAt, lastMessageUuid });
}

export function pauseTask(db: DbClient, id: string): TaskRow | null {
  return updateTask(db, id, { status: "paused" });
}
