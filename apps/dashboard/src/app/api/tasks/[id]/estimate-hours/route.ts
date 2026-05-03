import { NextResponse } from "next/server";
import { HaikuEstimator, estimateTaskHours } from "@tracker/daemon/estimator/estimator";
import { getDb } from "@/lib/db";
import { getTaskById } from "@tracker/db";
import { makeHaikuClient, HaikuUnavailableError } from "@/lib/haiku";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  let client;
  try {
    client = await makeHaikuClient(db);
  } catch (err) {
    if (err instanceof HaikuUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    throw err;
  }
  const estimator = new HaikuEstimator(client);
  await estimateTaskHours(db, id, estimator);
  return NextResponse.json({ task: getTaskById(db, id) });
}
