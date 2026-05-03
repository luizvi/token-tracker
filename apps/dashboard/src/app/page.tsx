export const dynamic = "force-dynamic";

import { KpiCard } from "@/components/kpi-card";
import { CostLine } from "@/components/charts/cost-line";
import { TokensByProjectBar } from "@/components/charts/tokens-by-project-bar";
import { HoursHeatmap } from "@/components/charts/hours-heatmap";
import { formatMoney, formatTokens } from "@/lib/format";
import { listTasks, listProjects } from "@tracker/db";
import { getDb } from "@/lib/db";
import { getUsdBrlRate } from "@/lib/currency-rate";
import { parsePeriod, parseCurrency, periodCutoffMs } from "@/lib/filters";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; currency?: string }>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const currency = parseCurrency(sp.currency);

  const db = getDb();
  const allTasks = listTasks(db, {});
  const projects = listProjects(db);
  const rate = getUsdBrlRate();

  const cutoff = periodCutoffMs(period);
  const tasks = allTasks.filter((t) => t.startedAt >= cutoff);

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalTokens = tasks.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0);
  const totalBillable = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0);
  const openCount = tasks.filter((t) => t.status === "open").length;
  const pausedCount = tasks.filter((t) => t.status === "paused").length;

  const days: Record<string, number> = {};
  for (const t of tasks) {
    const d = new Date(t.startedAt).toISOString().slice(0, 10);
    const value = currency === "BRL" ? t.costUsd * rate : t.costUsd;
    days[d] = (days[d] ?? 0) + value;
  }
  const costByDay = Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date: date.slice(5), cost: Number(cost.toFixed(2)) }));

  const byProject = projects
    .map((p) => ({
      projectName: p.name,
      tokens: tasks.filter((t) => t.projectId === p.id).reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
    }))
    .filter((p) => p.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 12);

  // Heatmap dia-da-semana × hora-do-dia (BRT)
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const t of tasks) {
    const d = new Date(t.startedAt - 3 * 3600000); // BRT
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    heatmap[day]![hour]! += t.timeTotalSeconds / 3600;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Tasks" value={String(tasks.length)} />
        <KpiCard label="Tokens" value={formatTokens(totalTokens)} />
        <KpiCard label="Custo" value={formatMoney(totalCost, currency, rate)} />
        <KpiCard label="Faturáveis" value={`${totalBillable.toFixed(1)}h`} />
        <KpiCard label="Abertas" value={String(openCount)} hint={`${pausedCount} pausadas`} />
        <KpiCard label="USD-BRL" value={rate.toFixed(4)} hint="hoje" />
      </div>

      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-secondary">Custo por dia</h3>
          <span className="text-xs text-text-muted font-mono">{currency}</span>
        </div>
        <CostLine data={costByDay} unit={currency === "BRL" ? "R$" : "$"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Tokens por projeto</h3>
          <TokensByProjectBar data={byProject} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Atividade — dia × hora (BRT)
          </h3>
          <HoursHeatmap matrix={heatmap} />
        </div>
      </div>
    </div>
  );
}
