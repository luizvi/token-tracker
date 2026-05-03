export const dynamic = "force-dynamic";

import Link from "next/link";
import { getProjectById, listTasks, getClientById } from "@tracker/db";
import { getDb } from "@/lib/db";
import { getUsdBrlRate } from "@/lib/currency-rate";
import { formatMoney, formatTokens, formatRelativeTime, formatDuration } from "@/lib/format";
import { parseCurrency } from "@/lib/filters";
import { notFound } from "next/navigation";
import { ProjectClientLink } from "@/components/project-client-link";
import { ProjectVisibilityToggle } from "@/components/project-visibility-toggle";

export default async function ProjectDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ currency?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const currency = parseCurrency(sp.currency);
  const rate = getUsdBrlRate();

  const db = getDb();
  const project = getProjectById(db, id);
  if (!project) notFound();
  const tasks = listTasks(db, { projectId: id });
  const client = project.clientId ? getClientById(db, project.clientId) : null;

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalTokens = tasks.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0);
  const totalBillable = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0);
  const totalTime = tasks.reduce((s, t) => s + t.timeTotalSeconds, 0);

  const recent = tasks.slice(0, 30);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                background: project.color ?? "#1fe879",
                boxShadow: `0 0 8px ${project.color ?? "#1fe879"}40`,
              }}
            />
            <h2 className="text-2xl font-semibold truncate">{project.name}</h2>
            {client && (
              <Link
                href={`/clients/${client.id}`}
                className="chip border border-accent/30 text-accent bg-accent/10 hover:bg-accent/15 transition-colors"
              >
                {client.name}
              </Link>
            )}
          </div>
          <p className="text-text-muted text-xs font-mono mt-1">{project.cwdPath}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProjectVisibilityToggle projectId={project.id} active={project.active} />
          <ProjectClientLink projectId={project.id} currentClientId={project.clientId} />
        </div>
      </div>

      <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide">Custo total</p>
          <p className="font-mono text-xl mt-1">{formatMoney(totalCost, currency, rate)}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide">Tokens</p>
          <p className="font-mono text-xl mt-1">{formatTokens(totalTokens)}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide">Tempo Claude</p>
          <p className="font-mono text-xl mt-1">{formatDuration(totalTime)}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide">Faturáveis</p>
          <p className="font-mono text-xl mt-1">{totalBillable.toFixed(1)}h</p>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-semibold">Tasks recentes</h3>
          <Link
            href={`/tasks?project=${project.id}`}
            className="text-xs text-accent hover:underline"
          >
            ver todas {tasks.length} →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-text-muted text-sm">Nenhuma task</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tasks/${t.id}`}
                  className="card p-3 text-sm flex justify-between items-center gap-3 hover:border-hover transition-colors"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      t.status === "open"
                        ? "bg-accent"
                        : t.status === "paused"
                          ? "bg-warning"
                          : "bg-text-muted"
                    }`}
                  />
                  <span className="font-mono truncate flex-1">{t.title}</span>
                  {t.category === "system" && (
                    <span className="chip bg-bg-tertiary text-text-muted text-[10px]">plugin</span>
                  )}
                  <span className="text-text-muted text-xs font-mono">
                    {formatTokens(t.tokensInput + t.tokensOutput)}
                  </span>
                  <span className="text-text-muted text-xs font-mono w-16 text-right">
                    {formatMoney(t.costUsd, currency, rate)}
                  </span>
                  <span className="text-text-muted text-xs w-16 text-right">
                    {formatRelativeTime(t.startedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
