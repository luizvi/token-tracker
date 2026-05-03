export const dynamic = "force-dynamic";

import Link from "next/link";
import { getClientById, listTasks, listEvents, listProjects } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatUsd, formatDuration, formatRelativeTime, formatTokens } from "@/lib/format";
import { notFound } from "next/navigation";
import { ClientEditForm } from "@/components/client-edit-form";
import { RevenueEditor } from "@/components/revenue-editor";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const client = getClientById(db, id);
  if (!client) notFound();
  const projects = listProjects(db);
  const projectIds = new Set(projects.filter((p) => p.clientId === id).map((p) => p.id));
  const projMap = new Map(projects.map((p) => [p.id, p]));
  const tasks = listTasks(db, {})
    .filter((t) => t.category !== "system")
    .filter((t) => t.clientId === id || projectIds.has(t.projectId))
    .sort((a, b) => b.startedAt - a.startedAt);
  const events = listEvents(db, { clientId: id }).sort((a, b) => b.startAt - a.startAt);

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalBillable = tasks.reduce((s, t) => {
    const v = (t.billableHours !== null && t.billableHours > 0)
      ? t.billableHours
      : (t.humanHoursEstimate ?? (t.timeTotalSeconds / 3600));
    return s + v;
  }, 0) + events.reduce((s, e) => s + e.durationMinutes / 60, 0);

  return (
    <div className="space-y-6 mx-auto w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{client.name}</h2>
          {client.kind === "personal" && (
            <span className="chip text-[11px] bg-bg-tertiary text-text-muted">projeto pessoal</span>
          )}
          {client.kind === "product" && (
            <span className="chip text-[11px] bg-accent/10 text-accent border border-accent/30">produto próprio</span>
          )}
        </div>
      </div>
      <ClientEditForm client={client} />
      {client.kind === "product" && <RevenueEditor clientId={client.id} />}
      <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><p className="text-text-muted text-xs">Custo total</p><p className="font-mono text-xl">{formatUsd(totalCost)}</p></div>
        <div><p className="text-text-muted text-xs">Horas claimable</p><p className="font-mono text-xl">{totalBillable.toFixed(1)}h</p></div>
        <div><p className="text-text-muted text-xs">Limite</p><p className="font-mono text-xl">{client.hourLimitValue ?? "∞"}h/{client.hourLimitPeriod ?? "-"}</p></div>
        <div>
          <p className="text-text-muted text-xs">Contrato</p>
          <p className="font-mono text-xl">
            {client.contractValueBrl !== null ? `R$${client.contractValueBrl.toFixed(0)}` : ""}
            {client.contractValueBrl !== null && client.contractValueUsd !== null && " · "}
            {client.contractValueUsd !== null ? `$${client.contractValueUsd.toFixed(0)}` : ""}
            {client.contractValueBrl === null && client.contractValueUsd === null && "—"}
          </p>
          {client.contractPeriod && <p className="text-[10px] text-text-muted">/{client.contractPeriod}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Tasks ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhuma task vinculada a esse cliente ainda.</p>
        ) : (
          <ul className="space-y-1 max-h-[600px] overflow-auto">
            {tasks.slice(0, 100).map((t) => {
              const proj = projMap.get(t.projectId);
              const claimable = (t.billableHours !== null && t.billableHours > 0)
                ? t.billableHours
                : (t.humanHoursEstimate ?? (t.timeTotalSeconds / 3600));
              return (
                <li key={t.id}>
                  <Link
                    href={`/tasks/${t.id}`}
                    className="card p-3 text-sm flex items-center gap-3 hover:border-hover transition-colors"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        t.status === "open" ? "bg-accent" :
                        t.status === "paused" ? "bg-warning" : "bg-text-muted"
                      }`}
                    />
                    <span className="font-mono truncate flex-1">{t.title || "(sem título)"}</span>
                    {proj && (
                      <span className="chip border border-border text-[10px]" style={proj.color ? { borderColor: proj.color, color: proj.color } : {}}>
                        {proj.name}
                      </span>
                    )}
                    <span className="text-text-muted text-xs font-mono">{formatTokens(t.tokensInput + t.tokensOutput)}</span>
                    <span className="text-accent text-xs font-mono w-16 text-right">{claimable.toFixed(1)}h</span>
                    <span className="text-text-muted text-xs font-mono w-16 text-right">{formatDuration(t.timeTotalSeconds)}</span>
                    <span className="text-text-muted text-xs w-16 text-right">{formatRelativeTime(t.startedAt)}</span>
                  </Link>
                </li>
              );
            })}
            {tasks.length > 100 && (
              <li className="text-xs text-text-muted text-center pt-2">
                <Link href={`/tasks?client=${client.id}`} className="text-accent hover:underline">
                  ver todas {tasks.length} →
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Eventos manuais ({events.length})</h3>
        {events.length === 0 ? (
          <p className="text-text-muted text-sm">
            Nenhum evento manual.{" "}
            <Link href="/events" className="text-accent hover:underline">adicione em /events</Link>.
          </p>
        ) : (
          <ul className="space-y-1">
            {events.map((e) => (
              <li key={e.id} className="card p-3 text-sm flex items-center gap-3">
                <span className="chip bg-bg-tertiary text-text-muted text-[10px]">{e.kind}</span>
                <span className="flex-1 truncate">{e.title}</span>
                <span className="text-xs font-mono text-accent">{(e.durationMinutes / 60).toFixed(1)}h</span>
                <span className="text-xs font-mono text-text-muted">{new Date(e.startAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
