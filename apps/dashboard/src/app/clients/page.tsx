export const dynamic = "force-dynamic";

import { ClientCard, type ClientCardData } from "@/components/client-card";
import { ClientForm } from "@/components/client-form";
import { listClients, listTasks, listEvents } from "@tracker/db";
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
  const rate = getUsdBrlRate();

  const byClient: ClientCardData[] = clients.map((c) => {
    const ts = listTasks(db, { clientId: c.id }).filter((t) => t.startedAt >= cutoff);
    const evs = listEvents(db, { clientId: c.id }).filter((e) => e.startAt >= cutoff);
    const claudeHours = ts.reduce((s, t) => s + (t.billableHours ?? 0), 0);
    const eventHours = evs.reduce((s, e) => s + e.durationMinutes / 60, 0);
    return {
      clientId: c.id,
      clientName: c.name,
      color: c.color,
      hourLimit: c.hourLimitValue,
      hourLimitPeriod: c.hourLimitPeriod,
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
          <ClientCard key={c.clientId} data={c} currency={currency} rate={rate} />
        ))}
        <ClientForm />
      </div>
    </div>
  );
}
