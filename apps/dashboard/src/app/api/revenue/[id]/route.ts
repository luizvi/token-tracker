import { NextResponse } from "next/server";
import { deleteRevenueEntry, updateRevenueEntry } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = updateRevenueEntry(getDb(), id, await req.json());
  return updated
    ? NextResponse.json({ revenue: updated })
    : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteRevenueEntry(getDb(), id) });
}
