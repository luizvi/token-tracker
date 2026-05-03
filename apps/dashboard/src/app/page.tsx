export const dynamic = "force-dynamic";

import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import { CostLine } from "@/components/charts/cost-line";
import { TokensByProjectBar } from "@/components/charts/tokens-by-project-bar";
import { HoursHeatmap } from "@/components/charts/hours-heatmap";
import { DashboardFilterBar } from "@/components/dashboard-filter-bar";
import { ClientForecastTable } from "@/components/client-forecast-table";
import { TopTasksList } from "@/components/top-tasks-list";
import { InsightsCard } from "@/components/insights-card";
import { ContractRenewals, type RenewalAlert } from "@/components/contract-renewals";
import { formatMoney, formatTokens, formatDuration } from "@/lib/format";
import { listTasks, listProjects, listClients, listEvents, getSetting } from "@tracker/db";
import { getDb } from "@/lib/db";
import { getUsdBrlRate } from "@/lib/currency-rate";
import { parsePeriod, parseCurrency, periodCutoffMs } from "@/lib/filters";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; currency?: string; project?: string; client?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const currency = parseCurrency(sp.currency);
  const projectFilter = sp.project ?? null;
  const clientFilter = sp.client ?? null;

  // Range customizado tem prioridade sobre period.
  const fromMs = sp.from ? Date.parse(sp.from) : null;
  const toMs = sp.to ? Date.parse(`${sp.to}T23:59:59`) : null;
  const useCustomRange = fromMs !== null && !Number.isNaN(fromMs);

  const db = getDb();
  const projectsAll = listProjects(db);
  const visibleProjects = projectsAll.filter((p) => p.active);
  const visibleProjectIds = new Set(visibleProjects.map((p) => p.id));
  const clients = listClients(db);
  const rate = getUsdBrlRate();
  const tolBelow = getSetting<number>(db, "billableTolerancePercentBelow") ?? 15;
  const tolAbove = getSetting<number>(db, "billableTolerancePercentAbove") ?? 10;

  const cutoff = useCustomRange ? fromMs! : periodCutoffMs(period);
  const upper = useCustomRange && toMs !== null && !Number.isNaN(toMs) ? toMs : Date.now();
  // Duração do range em dias (pra normalizar previsto mensal proporcionalmente).
  const rangeDays = Math.max(1, (upper - cutoff) / 86400000);
  const monthFraction = rangeDays / 30;

  // Filtros aplicados
  let tasks = listTasks(db, {})
    .filter((t) => t.category !== "system")
    .filter((t) => visibleProjectIds.has(t.projectId))
    .filter((t) => t.startedAt >= cutoff && t.startedAt <= upper);
  if (projectFilter) tasks = tasks.filter((t) => t.projectId === projectFilter);
  if (clientFilter) {
    const projIds = new Set(projectsAll.filter((p) => p.clientId === clientFilter).map((p) => p.id));
    tasks = tasks.filter((t) => t.clientId === clientFilter || projIds.has(t.projectId));
  }

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalTokens = tasks.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0);
  const totalBillable = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0);
  const totalDurationSec = tasks.reduce(
    (s, t) => s + (t.endedAt ? (t.endedAt - t.startedAt) / 1000 : 0), 0,
  );
  const openCount = tasks.filter((t) => t.status === "open").length;
  const pausedCount = tasks.filter((t) => t.status === "paused").length;

  // Custo por dia
  const days: Record<string, number> = {};
  for (const t of tasks) {
    const d = new Date(t.startedAt).toISOString().slice(0, 10);
    const value = currency === "BRL" ? t.costUsd * rate : t.costUsd;
    days[d] = (days[d] ?? 0) + value;
  }
  const costByDay = Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date: date.slice(5), cost: Number(cost.toFixed(2)) }));

  // Top tokens by project
  const byProject = visibleProjects
    .map((p) => ({
      projectId: p.id,
      projectName: p.name,
      tokens: tasks.filter((t) => t.projectId === p.id).reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
    }))
    .filter((p) => p.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 12);

  // Heatmap dia × hora (BRT)
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const t of tasks) {
    const d = new Date(t.startedAt - 3 * 3600000);
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    heatmap[day]![hour]! += t.timeTotalSeconds / 3600;
  }

  // Top tarefas — critério: horas (claimable) DESC, depois custo USD DESC.
  // Filtra ruído: título vazio ou muito curto, duração < 60s, sem horas claimable.
  const minDurForTop = getSetting<number>(db, "detection.minTaskDurationSeconds") ?? 30;
  const topTasks = [...tasks]
    .map((t) => {
      const claimable = (t.billableHours !== null && t.billableHours > 0)
        ? t.billableHours
        : (t.humanHoursEstimate ?? (t.timeTotalSeconds / 3600));
      return { t, claimable };
    })
    .filter(({ t, claimable }) => {
      const dur = t.endedAt ? (t.endedAt - t.startedAt) / 1000 : 0;
      const titleOk = (t.title?.trim().length ?? 0) >= 4;
      return titleOk && dur >= minDurForTop && claimable > 0;
    })
    .sort((a, b) => b.claimable - a.claimable || b.t.costUsd - a.t.costUsd)
    .slice(0, 8)
    .map(({ t, claimable }) => {
      const proj = projectsAll.find((p) => p.id === t.projectId);
      return {
        id: t.id,
        title: t.title,
        projectName: proj?.name ?? "—",
        billableHours: claimable,
        durationSec: t.endedAt ? (t.endedAt - t.startedAt) / 1000 : 0,
        costUsd: t.costUsd,
        links: t.links,
      };
    });

  // Forecast por cliente: usa o range selecionado e normaliza expected mensal pelo período.
  // claimableHours: prioridade billable → humano → Claude (timeTotalSeconds/3600).
  const forecastTasks = tasks; // já filtradas por visíveis + período acima
  const costTolBelow = getSetting<number>(db, "costTolerancePercentBelow") ?? 25;
  const costTolAbove = getSetting<number>(db, "costTolerancePercentAbove") ?? 15;

  // Histórico 90d pra inferir baseline de custo IA quando o cliente não tem `monthlyAverageCostUsd`.
  const ninetyAgo = Date.now() - 90 * 86400000;
  const histTasks = listTasks(db, {})
    .filter((t) => t.category !== "system")
    .filter((t) => visibleProjectIds.has(t.projectId))
    .filter((t) => t.startedAt >= ninetyAgo);

  // Eventos manuais no período do forecast (somam às horas do cliente).
  const eventsByClient = new Map<string, number>();
  for (const c of clients) {
    const evs = listEvents(db, { clientId: c.id })
      .filter((e) => e.startAt >= cutoff && e.startAt <= upper);
    eventsByClient.set(c.id, evs.reduce((s, e) => s + e.durationMinutes / 60, 0));
  }

  function classify(pct: number, below: number, above: number): "below" | "ok" | "above" {
    if (pct < -below) return "below";
    if (pct > above) return "above";
    return "ok";
  }

  const forecast = clients
    .map((c) => {
      const projIds = new Set(projectsAll.filter((p) => p.clientId === c.id).map((p) => p.id));
      const ts = forecastTasks.filter((t) => t.clientId === c.id || projIds.has(t.projectId));
      const taskHours = ts.reduce((s, t) => {
        const v = (t.billableHours !== null && t.billableHours > 0)
          ? t.billableHours
          : (t.humanHoursEstimate ?? (t.timeTotalSeconds / 3600));
        return s + v;
      }, 0);
      const eventHours = eventsByClient.get(c.id) ?? 0;
      const hours = taskHours + eventHours;
      const costUsd = ts.reduce((s, t) => s + t.costUsd, 0);

      // Custo histórico mensal inferido (90d / 3 meses) — fallback quando não há `monthlyAverageCostUsd`.
      const histTs = histTasks.filter((t) => t.clientId === c.id || projIds.has(t.projectId));
      const histCostUsd = histTs.reduce((s, t) => s + t.costUsd, 0);
      const inferredMonthlyCostUsd = histTs.length > 0 ? histCostUsd / 3 : null;

      // Modelo
      const hasFixed = c.contractValueBrl !== null || c.contractValueUsd !== null;
      const hasHourly = c.hourlyRateBrl !== null || c.hourlyRateUsd !== null;
      const mode: "fixed" | "hourly" | "none" = hasHourly ? "hourly" : hasFixed ? "fixed" : "none";

      // Normaliza qualquer baseline pra mensal antes de aplicar monthFraction.
      // hour_limit_period: "week" | "month"
      // contract_period:   "week" | "month" | "year"
      const periodToMonthly = (value: number, period: string | null): number => {
        if (period === "week") return value * (30 / 7);
        if (period === "year") return value / 12;
        return value; // month ou null
      };
      const hourLimitMonthly = c.hourLimitValue !== null
        ? periodToMonthly(c.hourLimitValue, c.hourLimitPeriod) : null;
      const baselineHoursMonthly = c.monthlyAverageHours ?? hourLimitMonthly;

      const expectedHoursForPeriod = baselineHoursMonthly !== null
        ? baselineHoursMonthly * monthFraction : null;
      // (baselines ficam definidos depois de calcular receita esperada — bloco abaixo)
      let expectedCostUsdForPeriod: number | null = null;
      let costBaselineSource: "revenue" | "explicit" | "inferred" | "none" = "none";

      // Receita — também normaliza contractValue pelo contract_period.
      const contractUsdRaw = c.contractValueUsd ?? (c.contractValueBrl !== null ? c.contractValueBrl / rate : null);
      const contractUsdMonthly = contractUsdRaw !== null
        ? periodToMonthly(contractUsdRaw, c.contractPeriod) : null;
      const hourlyUsd = c.hourlyRateUsd ?? (c.hourlyRateBrl !== null ? c.hourlyRateBrl / rate : null);
      let expectedRevenueUsd: number | null = null;
      let realizedRevenueUsd: number | null = null;
      if (mode === "fixed") {
        expectedRevenueUsd = contractUsdMonthly !== null ? contractUsdMonthly * monthFraction : null;
        realizedRevenueUsd = expectedRevenueUsd;
      } else if (mode === "hourly") {
        expectedRevenueUsd = hourlyUsd !== null && expectedHoursForPeriod !== null
          ? hourlyUsd * expectedHoursForPeriod
          : null;
        realizedRevenueUsd = hourlyUsd !== null ? hourlyUsd * hours : null;
      }

      // Δ horas — sempre que tem monthlyAverageHours, independente do modo.
      let hoursPct: number | null = null;
      let hoursStatus: "no_target" | "below" | "ok" | "above" = "no_target";
      if (expectedHoursForPeriod && expectedHoursForPeriod > 0) {
        hoursPct = (hours / expectedHoursForPeriod) * 100 - 100;
        hoursStatus = classify(hoursPct, tolBelow, tolAbove);
      }

      // Custo IA: prioridade da baseline = receita prevista (compara IA × receita).
      // Fallback: monthlyAverageCostUsd explícito → média histórica 90d (auto).
      if (expectedRevenueUsd !== null && expectedRevenueUsd > 0) {
        expectedCostUsdForPeriod = expectedRevenueUsd;
        costBaselineSource = "revenue";
      } else if (c.monthlyAverageCostUsd !== null) {
        expectedCostUsdForPeriod = c.monthlyAverageCostUsd * monthFraction;
        costBaselineSource = "explicit";
      } else if (inferredMonthlyCostUsd !== null) {
        expectedCostUsdForPeriod = inferredMonthlyCostUsd * monthFraction;
        costBaselineSource = "inferred";
      }

      // Pct e status do custo:
      // - quando baseline = receita: costPct = "% da receita gasto em IA". Acima do tolAbove é ruim;
      //   abaixo do tolBelow é ótimo (margem alta).
      // - quando baseline = orçamento/inferido: costPct = variação clássica (cost/baseline - 1).
      let costPct: number | null = null;
      let costStatus: "no_target" | "below" | "ok" | "above" = "no_target";
      let costDeltaUsd: number | null = null;
      if (expectedCostUsdForPeriod !== null && expectedCostUsdForPeriod > 0) {
        if (costBaselineSource === "revenue") {
          costPct = (costUsd / expectedCostUsdForPeriod) * 100;
          costDeltaUsd = expectedCostUsdForPeriod - costUsd; // sobra (positivo = lucro)
          // % da receita: > tolAbove é ruim, < tolBelow é ótimo
          if (costPct > costTolAbove) costStatus = "above";
          else if (costPct < costTolBelow) costStatus = "below";
          else costStatus = "ok";
        } else {
          costPct = (costUsd / expectedCostUsdForPeriod) * 100 - 100;
          costStatus = classify(costPct, costTolBelow, costTolAbove);
          costDeltaUsd = costUsd - expectedCostUsdForPeriod;
        }
      }

      return {
        id: c.id,
        name: c.name,
        color: c.color,
        mode,
        hours,
        expectedHours: expectedHoursForPeriod,
        hoursPct,
        hoursStatus,
        expectedRevenueUsd,
        realizedRevenueUsd,
        costUsd,
        expectedCostUsd: expectedCostUsdForPeriod,
        costPct,
        costStatus,
        costDeltaUsd,
        costBaselineSource,
      };
    })
    .filter((c) => c.hours > 0 || c.costUsd > 0 || c.expectedHours !== null || c.expectedCostUsd !== null)
    .sort((a, b) => b.hours - a.hours || b.costUsd - a.costUsd);

  // Lembretes de renovação de contrato
  const nowMs = Date.now();
  const renewalAlerts: RenewalAlert[] = clients
    .filter((c) => c.contractRenewalAt !== null)
    .map((c) => {
      const renewalAt = c.contractRenewalAt!;
      const daysUntil = Math.ceil((renewalAt - nowMs) / 86400000);
      const noticeDays = c.renewalNoticeDays ?? 30;
      return { clientId: c.id, clientName: c.name, color: c.color, renewalAt, daysUntil, noticeDays };
    })
    .filter((a) => a.daysUntil <= a.noticeDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <ContractRenewals alerts={renewalAlerts} />

      <DashboardFilterBar
        projects={visibleProjects.map((p) => ({ id: p.id, name: p.name }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        selectedProject={projectFilter}
        selectedClient={clientFilter}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Tasks" value={String(tasks.length)} />
        <KpiCard label="Tokens" value={formatTokens(totalTokens)} />
        <KpiCard label="Custo" value={formatMoney(totalCost, currency, rate)} />
        <KpiCard label="Faturáveis" value={`${totalBillable.toFixed(1)}h`} hint={`${formatDuration(totalDurationSec)} reais`} />
        <KpiCard label="Abertas" value={String(openCount)} hint={`${pausedCount} pausadas`} />
        <KpiCard label="USD-BRL" value={rate.toFixed(4)} hint="hoje" />
      </div>

      <ClientForecastTable
        forecast={forecast}
        currency={currency}
        rate={rate}
        rangeLabel={
          useCustomRange
            ? `${sp.from} → ${sp.to ?? "hoje"}`
            : period === "today" ? "hoje"
            : period === "week" ? "última semana"
            : period === "month" ? "últimos 30 dias"
            : "tudo"
        }
      />

      <InsightsCard />

      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-secondary">Custo por dia</h3>
          <span className="text-xs text-text-muted font-mono">{currency}</span>
        </div>
        <CostLine data={costByDay} unit={currency === "BRL" ? "R$" : "$"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-secondary">Tokens por projeto</h3>
            <span className="text-[10px] text-text-muted">clique numa barra para filtrar</span>
          </div>
          <TokensByProjectBar
            data={byProject.map((p) => ({ projectName: p.projectName, tokens: p.tokens }))}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {byProject.map((p) => (
              <Link
                key={p.projectId}
                href={`/?period=${period}&currency=${currency}&project=${p.projectId}`}
                className="text-[10px] px-2 py-0.5 border border-border rounded hover:border-accent hover:text-accent transition-colors"
              >
                {p.projectName}
              </Link>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Atividade — dia × hora (BRT)
          </h3>
          <HoursHeatmap matrix={heatmap} />
        </div>
      </div>

      <TopTasksList tasks={topTasks} currency={currency} rate={rate} />
    </div>
  );
}
