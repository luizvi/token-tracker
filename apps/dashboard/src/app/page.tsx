export const dynamic = "force-dynamic";

import { KpiCard } from "@/components/kpi-card";
import { CostLine } from "@/components/charts/cost-line";
import { TokensByProjectBar } from "@/components/charts/tokens-by-project-bar";
import { formatUsd, formatTokens } from "@/lib/format";
import { listTasks, listProjects } from "@tracker/db";
import { getDb } from "@/lib/db";

export default async function OverviewPage() {
  const db = getDb();
  const tasks = listTasks(db, {});
  const projects = listProjects(db);

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalTokens = tasks.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0);
  const totalBillable = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0);

  // Custo por dia últimos 30d
  const days: Record<string, number> = {};
  const cutoff = Date.now() - 30 * 86400000;
  for (const t of tasks) {
    if (t.startedAt < cutoff) continue;
    const d = new Date(t.startedAt).toISOString().slice(0, 10);
    days[d] = (days[d] ?? 0) + t.costUsd;
  }
  const costByDay = Object.entries(days).sort(([a], [b]) => a.localeCompare(b)).map(([date, cost]) => ({ date, cost }));

  // Tokens por projeto últimos 7d
  const cutoff7 = Date.now() - 7 * 86400000;
  const byProject = projects.map((p) => ({
    projectName: p.name,
    tokens: tasks.filter((t) => t.projectId === p.id && t.startedAt >= cutoff7).reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
  })).filter((p) => p.tokens > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Tasks" value={String(tasks.length)} />
        <KpiCard label="Tokens" value={formatTokens(totalTokens)} />
        <KpiCard label="Custo" value={formatUsd(totalCost)} />
        <KpiCard label="Faturáveis" value={`${totalBillable.toFixed(1)}h`} />
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2 text-text-muted">Custo USD por dia (30d)</h3>
        <CostLine data={costByDay} />
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2 text-text-muted">Tokens por projeto (7d)</h3>
        <TokensByProjectBar data={byProject} />
      </div>
    </div>
  );
}
