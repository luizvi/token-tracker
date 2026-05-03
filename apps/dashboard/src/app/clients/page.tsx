export const dynamic = "force-dynamic";

import { ClientCard, type ClientCardData } from "@/components/client-card";
import { ClientForm } from "@/components/client-form";
import { listClients, listTasks, listEvents, listProjects, getSetting } from "@tracker/db";
import { getDb } from "@/lib/db";
import { getUsdBrlRate } from "@/lib/currency-rate";
import { parseCurrency, parsePeriod, periodCutoffMs } from "@/lib/filters";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; currency?: string }>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const currency = parseCurrency(sp.currency);
  const cutoff = periodCutoffMs(period);

  const db = getDb();
  const clients = listClients(db);
  const projectsAll = listProjects(db);
  const projects = projectsAll.filter((p) => p.active);
  const visibleProjectIds = new Set(projects.map((p) => p.id));
  // Mesmos filtros do dashboard pra evitar divergência: tasks "system" e projetos ocultos fora.
  const allTasks = listTasks(db, {})
    .filter((t) => t.category !== "system")
    .filter((t) => visibleProjectIds.has(t.projectId));
  const rate = getUsdBrlRate();
  const toleranceBelow = getSetting<number>(db, "billableTolerancePercentBelow") ?? 15;
  const toleranceAbove = getSetting<number>(db, "billableTolerancePercentAbove") ?? 10;
  const costToleranceBelow = getSetting<number>(db, "costTolerancePercentBelow") ?? 25;
  const costToleranceAbove = getSetting<number>(db, "costTolerancePercentAbove") ?? 15;

  const byClient: ClientCardData[] = clients.map((c) => {
    const projectIds = new Set(projects.filter((p) => p.clientId === c.id).map((p) => p.id));
    const ts = allTasks.filter(
      (t) => (t.clientId === c.id || projectIds.has(t.projectId)) && t.startedAt >= cutoff,
    );
    const evs = listEvents(db, { clientId: c.id }).filter((e) => e.startAt >= cutoff);
    // Horas claimable: billable → humano → Claude (fallback) — para que receita estimada não fique 0.
    const claudeHours = ts.reduce((s, t) => {
      const v = (t.billableHours !== null && t.billableHours > 0)
        ? t.billableHours
        : (t.humanHoursEstimate ?? (t.timeTotalSeconds / 3600));
      return s + v;
    }, 0);
    const eventHours = evs.reduce((s, e) => s + e.durationMinutes / 60, 0);
    return {
      clientId: c.id,
      clientName: c.name,
      color: c.color,
      hourLimit: c.hourLimitValue,
      hourLimitPeriod: c.hourLimitPeriod,
      contractValueBrl: c.contractValueBrl,
      contractValueUsd: c.contractValueUsd,
      hourlyRateBrl: c.hourlyRateBrl,
      hourlyRateUsd: c.hourlyRateUsd,
      monthlyAverageHours: c.monthlyAverageHours,
      monthlyAverageCostUsd: c.monthlyAverageCostUsd,
      billableHours: claudeHours + eventHours,
      totalCostUsd: ts.reduce((s, t) => s + t.costUsd, 0),
      totalTokens: ts.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
      tasks: ts.length,
      events: evs.length,
    };
  });

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold">Clientes</h2>
        <p className="text-xs text-text-muted">{byClient.length} cadastrado{byClient.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {byClient.map((c) => (
          <ClientCard
            key={c.clientId}
            data={c}
            currency={currency}
            rate={rate}
            toleranceBelow={toleranceBelow}
            toleranceAbove={toleranceAbove}
            costToleranceBelow={costToleranceBelow}
            costToleranceAbove={costToleranceAbove}
          />
        ))}
        <ClientForm />
      </div>
    </div>
  );
}
