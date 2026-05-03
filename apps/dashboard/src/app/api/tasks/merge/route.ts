import { NextResponse } from "next/server";
import { z } from "zod";
import { getTaskById, updateTask, schema } from "@tracker/db";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";

const Body = z.object({ taskIds: z.array(z.string()).min(2) });

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const db = getDb();
  const tasks = body.taskIds.map((id) => getTaskById(db, id)).filter((t): t is NonNullable<typeof t> => t !== null);
  if (tasks.length < 2) return NextResponse.json({ error: "need 2+" }, { status: 400 });

  // Soma tudo e atribui à primeira (mais antiga)
  const sorted = [...tasks].sort((a, b) => a.startedAt - b.startedAt);
  const head = sorted[0]!;
  const others = sorted.slice(1);

  const totals = others.reduce((acc, t) => ({
    tokensInput: acc.tokensInput + t.tokensInput,
    tokensOutput: acc.tokensOutput + t.tokensOutput,
    tokensCacheRead: acc.tokensCacheRead + t.tokensCacheRead,
    tokensCacheCreation: acc.tokensCacheCreation + t.tokensCacheCreation,
    timeInputSeconds: acc.timeInputSeconds + t.timeInputSeconds,
    timeProcessingOutputSeconds: acc.timeProcessingOutputSeconds + t.timeProcessingOutputSeconds,
    timeReadingSeconds: acc.timeReadingSeconds + t.timeReadingSeconds,
    timeTotalSeconds: acc.timeTotalSeconds + t.timeTotalSeconds,
    costUsd: acc.costUsd + t.costUsd,
  }), {
    tokensInput: head.tokensInput, tokensOutput: head.tokensOutput,
    tokensCacheRead: head.tokensCacheRead, tokensCacheCreation: head.tokensCacheCreation,
    timeInputSeconds: head.timeInputSeconds, timeProcessingOutputSeconds: head.timeProcessingOutputSeconds,
    timeReadingSeconds: head.timeReadingSeconds, timeTotalSeconds: head.timeTotalSeconds,
    costUsd: head.costUsd,
  });

  const lastEnded = Math.max(...sorted.map((t) => t.endedAt ?? t.startedAt));
  updateTask(db, head.id, { ...totals, endedAt: lastEnded, status: "closed" });

  for (const o of others) {
    db.delete(schema.tasks).where(eq(schema.tasks.id, o.id)).run();
  }

  return NextResponse.json({ task: getTaskById(db, head.id) });
}
