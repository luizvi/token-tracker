import { NextResponse } from "next/server";
import { setSetting } from "@tracker/db";
import { recalcTimeAndBillableForAll } from "@tracker/daemon/recalc/recalc";
import { getDb } from "@/lib/db";

const REALISTIC_DEFAULTS: Record<string, number> = {
  timePerInputTokenSeconds: 0.0008,
  timePerProcessingOutputTokenSeconds: 0.013,
  timePerReadingTokenSeconds: 0.04,
  cacheReadFactor: 0.05,
  billableFactorDefault: 0.4,
  billableTolerancePercentBelow: 15,
  billableTolerancePercentAbove: 10,
  costTolerancePercentBelow: 25,
  costTolerancePercentAbove: 15,
  "detection.gapMinutesBase": 90,
  "detection.semanticThreshold": 0.3,
  "detection.minTaskDurationSeconds": 30,
};

export async function POST() {
  const db = getDb();
  for (const [k, v] of Object.entries(REALISTIC_DEFAULTS)) setSetting(db, k, v);
  recalcTimeAndBillableForAll(db);
  return NextResponse.json({ ok: true, applied: Object.keys(REALISTIC_DEFAULTS).length });
}
