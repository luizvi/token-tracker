import { NextResponse } from "next/server";
import { listProjects } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ projects: listProjects(getDb()) });
}
