import { NextResponse } from "next/server";
import { upsertCurrencyRate } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  const { date, usdBrl } = await req.json();
  upsertCurrencyRate(getDb(), date, usdBrl, "manual");
  return NextResponse.json({ ok: true });
}
