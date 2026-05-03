import { NextResponse } from "next/server";
import { listTasks, type ListTasksFilter } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("project");
  const clientId = url.searchParams.get("client");
  const statusRaw = url.searchParams.get("status");
  const limit = Number(url.searchParams.get("limit") ?? 100);

  const filter: ListTasksFilter = {};
  if (projectId) filter.projectId = projectId;
  if (clientId) filter.clientId = clientId;
  if (statusRaw === "open" || statusRaw === "paused" || statusRaw === "closed") filter.status = statusRaw;

  const db = getDb();
  const tasks = listTasks(db, filter).slice(0, limit);
  return NextResponse.json({ tasks });
}
