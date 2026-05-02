import { newId } from "@tracker/shared";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { manualEvents } from "../schema.js";

export type EventRow = typeof manualEvents.$inferSelect;
export type NewEventInput = {
  clientId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  kind?: "meeting" | "call" | "review" | "other";
  startAt: number;
  durationMinutes: number;
};

export function createEvent(db: DbClient, input: NewEventInput): EventRow {
  const now = Date.now();
  const row = {
    id: newId(),
    clientId: input.clientId,
    projectId: input.projectId ?? null,
    title: input.title,
    description: input.description ?? null,
    kind: input.kind ?? "other" as const,
    startAt: input.startAt,
    durationMinutes: input.durationMinutes,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(manualEvents).values(row).run();
  return row as EventRow;
}

export function getEventById(db: DbClient, id: string): EventRow | null {
  return db.select().from(manualEvents).where(eq(manualEvents.id, id)).all()[0] ?? null;
}

export function listEvents(
  db: DbClient, filter: { clientId?: string; projectId?: string },
): EventRow[] {
  const conditions = [];
  if (filter.clientId) conditions.push(eq(manualEvents.clientId, filter.clientId));
  if (filter.projectId) conditions.push(eq(manualEvents.projectId, filter.projectId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const q = db.select().from(manualEvents).orderBy(desc(manualEvents.startAt));
  return where ? q.where(where).all() : q.all();
}

export function deleteEvent(db: DbClient, id: string): boolean {
  return db.delete(manualEvents).where(eq(manualEvents.id, id)).run().changes > 0;
}
