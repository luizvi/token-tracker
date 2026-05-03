import { NextResponse } from "next/server";
import { listDaemonRuns } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const runs = listDaemonRuns(db, { kind: "tick", limit: 1 });
  const last = runs[0];
  const lagSeconds = last ? Math.floor((Date.now() - last.startedAt) / 1000) : null;
  return NextResponse.json({
    daemon: last ? { lastRun: last.startedAt, ok: last.ok, lagSeconds } : null,
    db: "ok",
    dashboard: "ok",
  });
}
