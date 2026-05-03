import { NextResponse } from "next/server";
import { classifyAllSystemTasks } from "@tracker/daemon/detector/classify-system";
import { getDb } from "@/lib/db";

export async function POST() {
  const result = classifyAllSystemTasks(getDb());
  return NextResponse.json(result);
}
