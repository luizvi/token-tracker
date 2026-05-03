import { newId } from "@tracker/shared";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { revenueEntries } from "../schema.js";

export type RevenueEntryRow = typeof revenueEntries.$inferSelect;

export type NewRevenueEntryInput = {
  clientId: string;
  kind: "estimated" | "actual";
  amountUsd?: number | null;
  amountBrl?: number | null;
  occurredAt: number;
  description?: string | null;
};

export function createRevenueEntry(db: DbClient, input: NewRevenueEntryInput): RevenueEntryRow {
  const now = Date.now();
  const row = {
    id: newId(),
    clientId: input.clientId,
    kind: input.kind,
    amountUsd: input.amountUsd ?? null,
    amountBrl: input.amountBrl ?? null,
    occurredAt: input.occurredAt,
    description: input.description ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(revenueEntries).values(row).run();
  return row as RevenueEntryRow;
}

export type ListRevenueFilter = {
  clientId?: string;
  fromMs?: number;
  toMs?: number;
};

export function listRevenueEntries(db: DbClient, filter: ListRevenueFilter = {}): RevenueEntryRow[] {
  const conditions = [];
  if (filter.clientId) conditions.push(eq(revenueEntries.clientId, filter.clientId));
  if (filter.fromMs !== undefined) conditions.push(gte(revenueEntries.occurredAt, filter.fromMs));
  if (filter.toMs !== undefined) conditions.push(lte(revenueEntries.occurredAt, filter.toMs));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const q = db.select().from(revenueEntries).orderBy(desc(revenueEntries.occurredAt));
  return where ? q.where(where).all() : q.all();
}

export function deleteRevenueEntry(db: DbClient, id: string): boolean {
  return db.delete(revenueEntries).where(eq(revenueEntries.id, id)).run().changes > 0;
}

export function updateRevenueEntry(
  db: DbClient,
  id: string,
  patch: Partial<Omit<RevenueEntryRow, "id" | "createdAt" | "updatedAt">>,
): RevenueEntryRow | null {
  db.update(revenueEntries).set({ ...patch, updatedAt: Date.now() }).where(eq(revenueEntries.id, id)).run();
  return db.select().from(revenueEntries).where(eq(revenueEntries.id, id)).all()[0] ?? null;
}
