import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { schema } from "@tracker/db";
import { updateCurrencyToday } from "@tracker/daemon/currency/updater";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db.select().from(schema.currencyRates).orderBy(desc(schema.currencyRates.date)).limit(365).all();
  return NextResponse.json({ rates: rows });
}

export async function POST() {
  await updateCurrencyToday(getDb());
  return NextResponse.json({ ok: true });
}
