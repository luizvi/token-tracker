import { newId } from "@tracker/shared";
import { and, desc, eq, isNull, lte, gt, or } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { modelPricing } from "../schema.js";

export type PricingRow = typeof modelPricing.$inferSelect;
export type NewPricingInput = Omit<PricingRow, "id">;

export function insertPricing(db: DbClient, input: NewPricingInput): PricingRow {
  const row = { id: newId(), ...input };
  db.insert(modelPricing).values(row).run();
  return row as PricingRow;
}

export function findPricingFor(
  db: DbClient, model: string, timestampMs: number,
): PricingRow | null {
  const rows = db.select().from(modelPricing).where(
    and(
      eq(modelPricing.model, model),
      lte(modelPricing.validFrom, timestampMs),
      or(isNull(modelPricing.validUntil), gt(modelPricing.validUntil, timestampMs)),
    ),
  ).orderBy(desc(modelPricing.validFrom)).limit(1).all();
  return rows[0] ?? null;
}

export function listAllPricing(db: DbClient): PricingRow[] {
  return db.select().from(modelPricing).orderBy(desc(modelPricing.validFrom)).all();
}

export function updatePricing(db: DbClient, id: string, patch: Partial<Omit<PricingRow, "id">>): void {
  db.update(modelPricing).set(patch).where(eq(modelPricing.id, id)).run();
}

export function deletePricing(db: DbClient, id: string): boolean {
  return db.delete(modelPricing).where(eq(modelPricing.id, id)).run().changes > 0;
}
