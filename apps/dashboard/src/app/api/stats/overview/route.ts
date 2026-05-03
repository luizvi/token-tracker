import { NextResponse } from "next/server";
import { listTasks } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "month";
  const now = Date.now();
  const cutoffMs =
    period === "today" ? new Date(new Date().setHours(0, 0, 0, 0)).getTime() :
    period === "week" ? now - 7 * 86400000 :
    period === "month" ? now - 30 * 86400000 :
    0;

  const tasks = listTasks(getDb(), {}).filter((t) => t.startedAt >= cutoffMs);
  const totalTokens = tasks.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0);
  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalBillableHours = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0);
  const openCount = tasks.filter((t) => t.status === "open").length;
  const pausedCount = tasks.filter((t) => t.status === "paused").length;

  return NextResponse.json({
    totalTasks: tasks.length,
    totalTokens, totalCost, totalBillableHours,
    openCount, pausedCount,
  });
}
