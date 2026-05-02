import { newId } from "@tracker/shared";
import { eq, asc } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { clients } from "../schema.js";

export type ClientRow = typeof clients.$inferSelect;
export type NewClientInput = {
  name: string;
  hourLimitValue?: number | null;
  hourLimitPeriod?: "week" | "month" | null;
  billableFactor?: number;
  color?: string | null;
  notes?: string | null;
};

export function createClientRow(db: DbClient, input: NewClientInput): ClientRow {
  const now = Date.now();
  const row = {
    id: newId(),
    name: input.name,
    hourLimitValue: input.hourLimitValue ?? null,
    hourLimitPeriod: input.hourLimitPeriod ?? null,
    billableFactor: input.billableFactor ?? 0.4,
    color: input.color ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(clients).values(row).run();
  return row as ClientRow;
}

export function listClients(db: DbClient): ClientRow[] {
  return db.select().from(clients).orderBy(asc(clients.name)).all();
}

export function getClientById(db: DbClient, id: string): ClientRow | null {
  const rows = db.select().from(clients).where(eq(clients.id, id)).all();
  return rows[0] ?? null;
}

export function updateClient(
  db: DbClient,
  id: string,
  patch: Partial<Omit<ClientRow, "id" | "createdAt" | "updatedAt">>,
): ClientRow | null {
  const current = getClientById(db, id);
  if (!current) return null;
  const next = { ...patch, updatedAt: Date.now() };
  db.update(clients).set(next).where(eq(clients.id, id)).run();
  return getClientById(db, id);
}

export function deleteClient(db: DbClient, id: string): boolean {
  const result = db.delete(clients).where(eq(clients.id, id)).run();
  return result.changes > 0;
}
