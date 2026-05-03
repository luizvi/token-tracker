import { NextResponse } from "next/server";
import { getTaskById, updateTask } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const task = getTaskById(db, id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  updateTask(db, id, { billableHoursLocked: !task.billableHoursLocked });
  return NextResponse.json({ task: getTaskById(db, id) });
}
