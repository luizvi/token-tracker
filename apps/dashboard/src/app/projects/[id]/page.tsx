export const dynamic = "force-dynamic";

import { getProjectById, listTasks } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatUsd, formatTokens } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const project = getProjectById(db, id);
  if (!project) notFound();
  const tasks = listTasks(db, { projectId: id });

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalTokens = tasks.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0);
  const totalBillable = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{project.name}</h2>
      <p className="text-text-muted text-sm font-mono">{project.cwdPath}</p>
      <div className="card p-4 grid grid-cols-3 gap-4">
        <div><p className="text-text-muted text-xs">Custo total</p><p className="font-mono text-xl">{formatUsd(totalCost)}</p></div>
        <div><p className="text-text-muted text-xs">Tokens totais</p><p className="font-mono text-xl">{formatTokens(totalTokens)}</p></div>
        <div><p className="text-text-muted text-xs">Horas faturáveis</p><p className="font-mono text-xl">{totalBillable.toFixed(1)}h</p></div>
      </div>
      <h3 className="font-semibold">Tasks ({tasks.length})</h3>
      <ul className="space-y-1">
        {tasks.slice(0, 20).map((t) => (
          <li key={t.id} className="card p-2 text-sm flex justify-between">
            <span className="font-mono truncate max-w-md">{t.title}</span>
            <span className="text-text-muted">{t.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
