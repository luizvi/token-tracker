export const dynamic = "force-dynamic";

import { ClientCard } from "@/components/client-card";
import { listClients, listTasks, listEvents } from "@tracker/db";
import { getDb } from "@/lib/db";

export default async function ClientsPage() {
  const db = getDb();
  const clients = listClients(db);

  const byClient = clients.map((c) => {
    const ts = listTasks(db, { clientId: c.id });
    const evs = listEvents(db, { clientId: c.id });
    const claudeHours = ts.reduce((s, t) => s + (t.billableHours ?? 0), 0);
    const eventHours = evs.reduce((s, e) => s + e.durationMinutes / 60, 0);
    return {
      clientId: c.id,
      clientName: c.name,
      hourLimit: c.hourLimitValue,
      hourLimitPeriod: c.hourLimitPeriod,
      billableHours: claudeHours + eventHours,
    };
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Clientes (total)</h2>
      <div className="grid grid-cols-3 gap-4">
        {byClient.map((c) => <ClientCard key={c.clientId} data={c} />)}
      </div>
    </div>
  );
}
