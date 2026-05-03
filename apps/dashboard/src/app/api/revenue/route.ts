import { NextResponse } from "next/server";
import { z } from "zod";
import { createRevenueEntry, listRevenueEntries } from "@tracker/db";
import { getDb } from "@/lib/db";

const Body = z.object({
  clientId: z.string(),
  kind: z.enum(["estimated", "actual"]),
  amountUsd: z.number().nullable().optional(),
  amountBrl: z.number().nullable().optional(),
  occurredAt: z.number(),
  description: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client") ?? undefined;
  const filter = clientId ? { clientId } : {};
  return NextResponse.json({ revenue: listRevenueEntries(getDb(), filter) });
}

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const row = createRevenueEntry(getDb(), {
    clientId: body.clientId,
    kind: body.kind,
    amountUsd: body.amountUsd ?? null,
    amountBrl: body.amountBrl ?? null,
    occurredAt: body.occurredAt,
    description: body.description ?? null,
  });
  return NextResponse.json({ revenue: row }, { status: 201 });
}
