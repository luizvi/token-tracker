import { NextResponse } from "next/server";
import { getEventById, deleteEvent } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getEventById(getDb(), id);
  return e ? NextResponse.json({ event: e }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteEvent(getDb(), id) });
}
