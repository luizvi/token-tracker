import { eq, sql } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { sessions } from "../schema.js";

export type SessionRow = typeof sessions.$inferSelect;

export type UpsertSessionInput = {
  id: string;
  projectId: string;
  jsonlPath: string;
  startedAt?: number | null;
};

export function upsertSession(db: DbClient, input: UpsertSessionInput): SessionRow {
  const existing = db.select().from(sessions).where(eq(sessions.id, input.id)).all()[0];
  if (existing) return existing;
  const row = {
    id: input.id,
    projectId: input.projectId,
    jsonlPath: input.jsonlPath,
    startedAt: input.startedAt ?? null,
    endedAt: null,
    messageCount: 0,
    totalTokensInput: 0,
    totalTokensOutput: 0,
    totalTokensCacheRead: 0,
    totalTokensCacheCreation: 0,
    totalCostUsd: 0,
    lastProcessedOffset: 0,
    lastProcessedAt: null,
  };
  db.insert(sessions).values(row).run();
  return row as SessionRow;
}

export function getSessionByJsonlPath(db: DbClient, jsonlPath: string): SessionRow | null {
  return db.select().from(sessions).where(eq(sessions.jsonlPath, jsonlPath)).all()[0] ?? null;
}

export function getSessionById(db: DbClient, id: string): SessionRow | null {
  return db.select().from(sessions).where(eq(sessions.id, id)).all()[0] ?? null;
}

export function updateSessionOffset(db: DbClient, id: string, offset: number): void {
  db.update(sessions)
    .set({ lastProcessedOffset: offset, lastProcessedAt: Date.now() })
    .where(eq(sessions.id, id))
    .run();
}

export type SessionTokenIncrement = {
  input: number; output: number; cacheRead: number; cacheCreation: number; costUsd: number;
};

export function addSessionTokens(db: DbClient, id: string, delta: SessionTokenIncrement): void {
  db.update(sessions).set({
    totalTokensInput: sql`${sessions.totalTokensInput} + ${delta.input}`,
    totalTokensOutput: sql`${sessions.totalTokensOutput} + ${delta.output}`,
    totalTokensCacheRead: sql`${sessions.totalTokensCacheRead} + ${delta.cacheRead}`,
    totalTokensCacheCreation: sql`${sessions.totalTokensCacheCreation} + ${delta.cacheCreation}`,
    totalCostUsd: sql`${sessions.totalCostUsd} + ${delta.costUsd}`,
    messageCount: sql`${sessions.messageCount} + 1`,
  }).where(eq(sessions.id, id)).run();
}
