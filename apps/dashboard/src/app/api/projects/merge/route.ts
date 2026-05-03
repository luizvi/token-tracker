import { NextResponse } from "next/server";
import { z } from "zod";
import { getProjectById, schema } from "@tracker/db";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";

const Body = z.object({
  targetId: z.string(),
  sourceIds: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  const { targetId, sourceIds } = Body.parse(await req.json());
  const db = getDb();
  const target = getProjectById(db, targetId);
  if (!target) return NextResponse.json({ error: "target not found" }, { status: 404 });

  const sources = sourceIds.filter((id) => id !== targetId);
  if (sources.length === 0) return NextResponse.json({ error: "no sources" }, { status: 400 });

  // Move sessions e tasks dos sources para o target.
  db.update(schema.sessions)
    .set({ projectId: targetId })
    .where(inArray(schema.sessions.projectId, sources))
    .run();
  db.update(schema.tasks)
    .set({ projectId: targetId, clientId: target.clientId, updatedAt: Date.now() })
    .where(inArray(schema.tasks.projectId, sources))
    .run();
  db.update(schema.manualEvents)
    .set({ projectId: targetId, updatedAt: Date.now() })
    .where(inArray(schema.manualEvents.projectId, sources))
    .run();

  // Apaga os projetos source.
  for (const id of sources) {
    db.delete(schema.projects).where(eq(schema.projects.id, id)).run();
  }

  return NextResponse.json({ target: getProjectById(db, targetId), merged: sources.length });
}
