import { NextResponse } from "next/server";
import { listClients, createClientRow } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ clients: listClients(getDb()) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const c = createClientRow(getDb(), body);
  return NextResponse.json({ client: c }, { status: 201 });
}
