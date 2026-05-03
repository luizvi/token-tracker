import { NextResponse } from "next/server";
import { getClientById, updateClient, deleteClient } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getClientById(getDb(), id);
  return c ? NextResponse.json({ client: c }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = updateClient(getDb(), id, await req.json());
  return updated ? NextResponse.json({ client: updated }) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteClient(getDb(), id) });
}
