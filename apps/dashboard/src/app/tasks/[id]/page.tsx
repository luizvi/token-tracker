export const dynamic = "force-dynamic";

import { getTaskById } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatUsd, formatDuration, formatTokens } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = getTaskById(getDb(), id);
  if (!task) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">{task.title}</h2>
      <div className="card p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-text-muted text-xs">Status</p>
          <p className="font-mono">{task.status}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Modelo principal</p>
          <p className="font-mono">{task.primaryModel ?? "-"}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Tokens (in/out/cache)</p>
          <p className="font-mono">
            {formatTokens(task.tokensInput)}/{formatTokens(task.tokensOutput)}/{formatTokens(task.tokensCacheRead)}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Custo</p>
          <p className="font-mono">{formatUsd(task.costUsd)}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Tempo total</p>
          <p className="font-mono">{formatDuration(task.timeTotalSeconds)}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Horas humanas</p>
          <p className="font-mono">
            {task.humanHoursEstimate?.toFixed(2) ?? "-"} ({task.humanHoursSource})
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Faturáveis</p>
          <p className="font-mono">
            {task.billableHours?.toFixed(2) ?? "-"} {task.billableHoursLocked && "🔒"}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Confidence</p>
          <p className="font-mono">{task.confidence.toFixed(2)}</p>
        </div>
      </div>
      {task.humanHoursReasoning && (
        <div className="card p-4 text-sm">
          <p className="text-text-muted text-xs mb-2">Reasoning Haiku:</p>
          <p>{task.humanHoursReasoning}</p>
        </div>
      )}
    </div>
  );
}
