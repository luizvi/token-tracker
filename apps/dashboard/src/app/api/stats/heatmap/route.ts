import { NextResponse } from "next/server";
import { listTasks } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() {
  const tasks = listTasks(getDb(), {});
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const t of tasks) {
    const d = new Date(t.startedAt - 3 * 3600000);
    const day = d.getUTCDay(); // 0..6
    const hour = d.getUTCHours();
    matrix[day]![hour]! += t.timeTotalSeconds / 3600;
  }
  return NextResponse.json({ heatmap: matrix });
}
