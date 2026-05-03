import { NextResponse } from "next/server";
import { recomputeBillableHours } from "@tracker/daemon/biller/biller";
import { getDb } from "@/lib/db";
import { getTaskById } from "@tracker/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  recomputeBillableHours(db, id);
  return NextResponse.json({ task: getTaskById(db, id) });
}
