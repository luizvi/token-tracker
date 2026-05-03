import { NextResponse } from "next/server";
import { listAllPricing, insertPricing, updatePricing, deletePricing } from "@tracker/db";
import { recalcCostForAll } from "@tracker/daemon/recalc/recalc";
import { getDb } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ pricing: listAllPricing(getDb()) });
}

export async function POST(req: Request) {
  const db = getDb();
  const r = insertPricing(db, await req.json());
  recalcCostForAll(db);
  return NextResponse.json({ pricing: r }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { id, ...patch } = await req.json();
  const db = getDb();
  updatePricing(db, id, patch);
  recalcCostForAll(db);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  return NextResponse.json({ ok: deletePricing(getDb(), id) });
}
