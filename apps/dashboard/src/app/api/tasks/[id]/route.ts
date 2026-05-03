import { NextResponse } from "next/server";
import { getTaskById, updateTask } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const task = getTaskById(db, id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const updated = updateTask(db, id, body);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ task: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  // Use raw drizzle delete since query helper not exported
  const { schema } = await import("@tracker/db");
  const { eq } = await import("drizzle-orm");
  db.delete(schema.tasks).where(eq(schema.tasks.id, id)).run();
  return NextResponse.json({ ok: true });
}
