import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listProjects,
  listTasks,
  createTask,
  updateTask,
  upsertProjectByCwdPath,
  schema,
} from "@tracker/db";
import { newId } from "@tracker/shared";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";

const StartBody = z.object({
  title: z.string().min(1),
  cwd: z.string().min(1),
  projectName: z.string().optional(),
  clientId: z.string().optional(),
});

const ActionBody = z.object({
  cwd: z.string().min(1),
  taskId: z.string().optional(),
});

function projectFromCwd(db: ReturnType<typeof getDb>, cwd: string, suggestedName?: string) {
  const all = listProjects(db);
  const exact = all.find((p) => p.cwdPath === cwd);
  if (exact) return exact;
  // ascendente — match por prefixo
  const sortedByLen = [...all].sort((a, b) => b.cwdPath.length - a.cwdPath.length);
  const prefix = sortedByLen.find((p) => cwd.startsWith(p.cwdPath));
  if (prefix) return prefix;
  // cria
  const slug = (suggestedName ?? cwd.split("/").pop() ?? "manual")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "manual";
  return upsertProjectByCwdPath(db, {
    slug: `${slug}-${newId().slice(0, 6).toLowerCase()}`,
    name: suggestedName ?? slug,
    cwdPath: cwd,
  });
}

function findOpenManualTask(db: ReturnType<typeof getDb>, projectId: string) {
  return listTasks(db, { projectId, status: "open" })
    .find((t) => t.sessionId.startsWith("manual:"));
}

function ensureManualSession(db: ReturnType<typeof getDb>, projectId: string): string {
  const sessionId = `manual:${projectId}`;
  const existing = db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId)).all()[0];
  if (!existing) {
    db.insert(schema.sessions).values({
      id: sessionId,
      projectId,
      jsonlPath: `manual://${projectId}`,
      startedAt: Date.now(),
      endedAt: null,
      messageCount: 0,
      totalTokensInput: 0,
      totalTokensOutput: 0,
      totalTokensCacheRead: 0,
      totalTokensCacheCreation: 0,
      totalCostUsd: 0,
      lastProcessedOffset: 0,
      lastProcessedAt: null,
    }).run();
  }
  return sessionId;
}

// POST /api/manual-tasks  → start
export async function POST(req: Request) {
  const body = StartBody.parse(await req.json());
  const db = getDb();
  const project = projectFromCwd(db, body.cwd, body.projectName);
  const sessionId = ensureManualSession(db, project.id);
  const open = findOpenManualTask(db, project.id);
  if (open) return NextResponse.json({ task: open, note: "já existia uma manual aberta" });
  const created = createTask(db, {
    sessionId,
    projectId: project.id,
    clientId: body.clientId ?? project.clientId ?? null,
    title: body.title,
    startedAt: Date.now(),
  });
  return NextResponse.json({ task: created, project });
}

// PATCH /api/manual-tasks  → pause / resume / close
export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  if (action !== "pause" && action !== "resume" && action !== "close") {
    return NextResponse.json({ error: "action must be pause|resume|close" }, { status: 400 });
  }
  const body = ActionBody.parse(await req.json());
  const db = getDb();
  let task;
  if (body.taskId) {
    task = listTasks(db, {}).find((t) => t.id === body.taskId);
  } else {
    const project = projectFromCwd(db, body.cwd);
    task = listTasks(db, { projectId: project.id }).find(
      (t) => t.sessionId.startsWith("manual:") && (action === "resume" ? t.status === "paused" : t.status !== "closed"),
    );
  }
  if (!task) return NextResponse.json({ error: "no manual task found" }, { status: 404 });

  if (action === "pause") {
    updateTask(db, task.id, { status: "paused" });
  } else if (action === "resume") {
    updateTask(db, task.id, { status: "open" });
  } else {
    updateTask(db, task.id, { status: "closed", endedAt: Date.now() });
  }
  return NextResponse.json({ task: { ...task, status: action === "close" ? "closed" : action === "pause" ? "paused" : "open" } });
}
