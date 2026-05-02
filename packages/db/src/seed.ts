import { DEFAULT_SETTINGS, loadAnthropicPricingSeed, newId } from "@tracker/shared";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "./client.js";
import { modelPricing } from "./schema.js";
import { setSetting, getSetting } from "./queries/settings.js";

function flattenSettings(obj: Record<string, unknown>, prefix = ""): Array<[string, unknown]> {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? flattenSettings(v as Record<string, unknown>, key)
      : [[key, v]];
  });
}

export function seedDatabase(db: DbClient): void {
  for (const [key, value] of flattenSettings(DEFAULT_SETTINGS)) {
    if (getSetting(db, key) === null) setSetting(db, key, value);
  }

  for (const p of loadAnthropicPricingSeed()) {
    const existing = db.select().from(modelPricing).where(
      and(eq(modelPricing.model, p.model), eq(modelPricing.validFrom, p.validFromMs)),
    ).all();
    if (existing.length === 0) {
      db.insert(modelPricing).values({
        id: newId(),
        model: p.model,
        inputPerMtok: p.inputPerMtok,
        outputPerMtok: p.outputPerMtok,
        cacheReadPerMtok: p.cacheReadPerMtok,
        cacheCreationPerMtok: p.cacheCreationPerMtok,
        validFrom: p.validFromMs,
        validUntil: p.validUntilMs,
        source: p.source ?? "manual",
      }).run();
    }
  }
}
