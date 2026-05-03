import { NextResponse } from "next/server";
import { listDaemonRuns } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const kindRaw = url.searchParams.get("kind");
  const filter: { kind?: string; limit: number } = { limit };
  if (kindRaw) filter.kind = kindRaw;
  return NextResponse.json({ runs: listDaemonRuns(getDb(), filter) });
}
