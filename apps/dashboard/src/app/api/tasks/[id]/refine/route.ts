import { NextResponse } from "next/server";
import { HaikuClient } from "@tracker/daemon/refiner/haiku-client";
import { HaikuRefiner, refineTask } from "@tracker/daemon/refiner/refiner";
import { getDb } from "@/lib/db";
import { getTaskById } from "@tracker/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 500 });
  const db = getDb();
  const client = new HaikuClient({ apiKey, model: "claude-haiku-4-5-20251001" });
  const refiner = new HaikuRefiner(client);
  await refineTask(db, id, refiner);
  return NextResponse.json({ task: getTaskById(db, id) });
}
