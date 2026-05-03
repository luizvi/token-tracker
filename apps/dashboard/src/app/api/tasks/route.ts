import { NextResponse } from "next/server";
import { listTasks, listProjects, getSetting, type ListTasksFilter } from "@tracker/db";
import { getDb } from "@/lib/db";
import { parsePeriod, periodCutoffMs } from "@/lib/filters";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("project");
  const clientId = url.searchParams.get("client");
  const statusRaw = url.searchParams.get("status");
  const period = parsePeriod(url.searchParams.get("period"));
  const limit = Number(url.searchParams.get("limit") ?? 100);

  const filter: ListTasksFilter = {};
  if (projectId) filter.projectId = projectId;
  if (statusRaw === "open" || statusRaw === "paused" || statusRaw === "closed") filter.status = statusRaw;

  const db = getDb();
  const includeHidden = url.searchParams.get("hidden") === "1";
  const allProjects = listProjects(db);
  const activeProjectIds = new Set(allProjects.filter((p) => p.active).map((p) => p.id));
  // Filtro por cliente derivado: aceita tasks com clientId direto OU tasks cujo projeto pertence ao cliente.
  let tasks = listTasks(db, filter);
  if (!includeHidden && !projectId) {
    tasks = tasks.filter((t) => activeProjectIds.has(t.projectId));
  }
  if (clientId) {
    const projectIdsForClient = new Set(
      allProjects.filter((p) => p.clientId === clientId).map((p) => p.id),
    );
    tasks = tasks.filter((t) => t.clientId === clientId || projectIdsForClient.has(t.projectId));
  }
  const cutoff = periodCutoffMs(period);
  if (cutoff > 0) tasks = tasks.filter((t) => t.startedAt >= cutoff);

  // Tasks muito curtas (ruído do detector) ocultas por padrão; ?short=1 mostra.
  const includeShort = url.searchParams.get("short") === "1";
  const minDur = getSetting<number>(db, "detection.minTaskDurationSeconds") ?? 30;
  if (!includeShort && minDur > 0) {
    tasks = tasks.filter((t) => {
      const dur = t.endedAt ? (t.endedAt - t.startedAt) / 1000 : Infinity;
      return dur >= minDur;
    });
  }
  tasks = tasks.slice(0, limit);
  return NextResponse.json({ tasks });
}
