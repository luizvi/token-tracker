import { NextResponse } from "next/server";
import { z } from "zod";
import { parseSettingValue, type SettingKey } from "@tracker/shared";
import { getAllSettings, setSetting } from "@tracker/db";
import { getDb } from "@/lib/db";
import { recalcTimeAndBillableForAll } from "@tracker/daemon/recalc/recalc";

const Body = z.object({ key: z.string(), value: z.unknown() });

export async function GET() {
  return NextResponse.json({ settings: getAllSettings(getDb()) });
}

const TIME_KEYS = new Set([
  "timePerInputTokenSeconds",
  "timePerProcessingOutputTokenSeconds",
  "timePerReadingTokenSeconds",
  "cacheReadFactor",
  "billableFactorDefault",
]);

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const validated = parseSettingValue(body.key as SettingKey, body.value);
  const db = getDb();
  setSetting(db, body.key, validated);
  if (TIME_KEYS.has(body.key)) recalcTimeAndBillableForAll(db);
  return NextResponse.json({ ok: true });
}
