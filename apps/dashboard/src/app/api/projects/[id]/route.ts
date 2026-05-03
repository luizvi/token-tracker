import { NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProjectById(getDb(), id);
  return p ? NextResponse.json({ project: p }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = updateProject(getDb(), id, await req.json());
  return updated ? NextResponse.json({ project: updated }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteProject(getDb(), id) });
}
