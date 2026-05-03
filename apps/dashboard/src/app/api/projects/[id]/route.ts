import { NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject, schema } from "@tracker/db";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProjectById(getDb(), id);
  return p ? NextResponse.json({ project: p }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const patch = await req.json() as { clientId?: string | null } & Record<string, unknown>;
  const updated = updateProject(db, id, patch);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Propaga clientId pra todas tasks do projeto — incluindo unset (null).
  if (Object.prototype.hasOwnProperty.call(patch, "clientId")) {
    const newClientId = patch.clientId ?? null;
    db.update(schema.tasks)
      .set({ clientId: newClientId, updatedAt: Date.now() })
      .where(eq(schema.tasks.projectId, id))
      .run();
  }
  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteProject(getDb(), id) });
}
