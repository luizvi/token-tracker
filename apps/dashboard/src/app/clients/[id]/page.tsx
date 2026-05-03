export const dynamic = "force-dynamic";

import { getClientById, listTasks, listEvents } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatUsd } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const client = getClientById(db, id);
  if (!client) notFound();
  const tasks = listTasks(db, { clientId: id });
  const events = listEvents(db, { clientId: id });

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalBillable = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0)
    + events.reduce((s, e) => s + e.durationMinutes / 60, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{client.name}</h2>
      <div className="card p-4 grid grid-cols-3 gap-4">
        <div><p className="text-text-muted text-xs">Custo total</p><p className="font-mono text-xl">{formatUsd(totalCost)}</p></div>
        <div><p className="text-text-muted text-xs">Horas faturáveis</p><p className="font-mono text-xl">{totalBillable.toFixed(1)}h</p></div>
        <div><p className="text-text-muted text-xs">Limite</p><p className="font-mono text-xl">{client.hourLimitValue ?? "∞"}h/{client.hourLimitPeriod ?? "-"}</p></div>
      </div>
      <h3 className="font-semibold">Tasks ({tasks.length})</h3>
      <h3 className="font-semibold">Eventos manuais ({events.length})</h3>
    </div>
  );
}
