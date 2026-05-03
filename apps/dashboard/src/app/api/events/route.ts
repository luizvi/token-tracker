import { NextResponse } from "next/server";
import { listEvents, createEvent } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client") ?? undefined;
  const filter: { clientId?: string } = {};
  if (clientId) filter.clientId = clientId;
  return NextResponse.json({ events: listEvents(getDb(), filter) });
}

export async function POST(req: Request) {
  const e = createEvent(getDb(), await req.json());
  return NextResponse.json({ event: e }, { status: 201 });
}
