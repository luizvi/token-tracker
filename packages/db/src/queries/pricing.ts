import { newId } from "@tracker/shared";
import { and, desc, eq, isNull, like, lte, gt, or } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { modelPricing } from "../schema.js";

export type PricingRow = typeof modelPricing.$inferSelect;
export type NewPricingInput = Omit<PricingRow, "id">;

export function insertPricing(db: DbClient, input: NewPricingInput): PricingRow {
  const row = { id: newId(), ...input };
  db.insert(modelPricing).values(row).run();
  return row as PricingRow;
}

/**
 * Normaliza nome de modelo para casar com pricing rows.
 * Ex: "claude-sonnet-4-5-20250929" → tenta "claude-sonnet-4-5" se exato falhar.
 * Strip de sufixos `-YYYYMMDD` ou `-NNNNNN` no final.
 */
function stripDateSuffix(model: string): string {
  return model.replace(/-\d{6,}$/, "");
}

export function findPricingFor(
  db: DbClient, model: string, timestampMs: number,
): PricingRow | null {
  const validRange = and(
    lte(modelPricing.validFrom, timestampMs),
    or(isNull(modelPricing.validUntil), gt(modelPricing.validUntil, timestampMs)),
  );

  // 1. Match exato
  const exact = db.select().from(modelPricing)
    .where(and(eq(modelPricing.model, model), validRange))
    .orderBy(desc(modelPricing.validFrom))
    .limit(1)
    .all();
  if (exact[0]) return exact[0];

  // 2. Strip de sufixo de data (ex: -20250929)
  const stripped = stripDateSuffix(model);
  if (stripped !== model) {
    const stripMatch = db.select().from(modelPricing)
      .where(and(eq(modelPricing.model, stripped), validRange))
      .orderBy(desc(modelPricing.validFrom))
      .limit(1)
      .all();
    if (stripMatch[0]) return stripMatch[0];
  }

  // 3. Prefix fallback (ex: claude-opus-4-6 casa com claude-opus-4-7? não — só aceita prefixes mais específicos)
  // Tenta achar o pricing cujo `model` é prefix do solicitado.
  const all = db.select().from(modelPricing)
    .where(validRange)
    .orderBy(desc(modelPricing.validFrom))
    .all();
  // Ordena por tamanho do nome (mais específico primeiro) e pega o primeiro que é prefix
  const candidates = all
    .filter((r) => model.startsWith(r.model) || stripped.startsWith(r.model))
    .sort((a, b) => b.model.length - a.model.length);
  return candidates[0] ?? null;
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
