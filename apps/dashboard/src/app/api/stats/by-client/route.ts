import { NextResponse } from "next/server";
import { listTasks, listClients, listEvents } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "month";
  const now = Date.now();
  const cutoff = period === "today" ? now - 86400000 : period === "week" ? now - 7 * 86400000 : now - 30 * 86400000;
  const db = getDb();
  const clients = listClients(db);
  const out = clients.map((c) => {
    const ts = listTasks(db, { clientId: c.id }).filter((t) => t.startedAt >= cutoff);
    const evs = listEvents(db, { clientId: c.id }).filter((e) => e.startAt >= cutoff);
    const claudeHours = ts.reduce((s, t) => s + (t.billableHours ?? 0), 0);
    const eventHours = evs.reduce((s, e) => s + e.durationMinutes / 60, 0);
    return {
      clientId: c.id,
      clientName: c.name,
      hourLimit: c.hourLimitValue,
      hourLimitPeriod: c.hourLimitPeriod,
      billableHours: claudeHours + eventHours,
      tasks: ts.length,
      events: evs.length,
    };
  });
  return NextResponse.json({ byClient: out });
}
