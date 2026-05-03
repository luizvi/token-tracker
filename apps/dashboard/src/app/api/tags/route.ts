import { NextResponse } from "next/server";
import { listTags, createTag } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ tags: listTags(getDb()) });
}

export async function POST(req: Request) {
  return NextResponse.json({ tag: createTag(getDb(), await req.json()) }, { status: 201 });
}
