import { NextResponse } from "next/server";
import { listTasks, listProjects } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "week";
  const now = Date.now();
  const cutoff = period === "today" ? now - 86400000 : period === "week" ? now - 7 * 86400000 : now - 30 * 86400000;
  const db = getDb();
  const projects = listProjects(db);
  const out = projects.map((p) => {
    const ts = listTasks(db, { projectId: p.id }).filter((t) => t.startedAt >= cutoff);
    return {
      projectId: p.id,
      projectName: p.name,
      tokens: ts.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
      cost: ts.reduce((s, t) => s + t.costUsd, 0),
      tasks: ts.length,
    };
  });
  return NextResponse.json({ byProject: out });
}
