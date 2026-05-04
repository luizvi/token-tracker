export const dynamic = "force-dynamic";

import Link from "next/link";
import { listProjects, listTasks, listClients } from "@tracker/db";
import { getDb } from "@/lib/db";
import { getUsdBrlRate } from "@/lib/currency-rate";
import { formatMoney, formatTokens } from "@/lib/format";
import { parseCurrency, parsePeriod, periodCutoffMs } from "@/lib/filters";
import { ProjectMergeBar } from "@/components/project-merge-bar";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; period?: string; hidden?: string }>;
}) {
  const sp = await searchParams;
  const currency = parseCurrency(sp.currency);
  const period = parsePeriod(sp.period);
  const cutoff = periodCutoffMs(period);
  const rate = getUsdBrlRate();

  const showHidden = sp.hidden === "1";
  const db = getDb();
  const projectsAll = listProjects(db);
  const projects = showHidden ? projectsAll : projectsAll.filter((p) => p.active);
  const hiddenCount = projectsAll.filter((p) => !p.active).length;
  const clients = listClients(db);
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const byProject = projects
    .map((p) => {
      const ts = listTasks(db, { projectId: p.id }).filter((t) => t.startedAt >= cutoff);
      const client = p.clientId ? clientMap.get(p.clientId) : null;
      return {
        ...p,
        clientName: client?.name ?? null,
        clientColor: client?.color ?? null,
        taskCount: ts.length,
        totalCost: ts.reduce((s, t) => s + t.costUsd, 0),
        totalTokens: ts.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Projetos</h2>
        <div className="flex items-center gap-3">
          <Link
            href={`/projects?${showHidden ? "" : "hidden=1"}`}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              showHidden ? "border-accent text-accent bg-accent/10" : "border-border text-text-muted hover:text-text-primary"
            }`}
          >
            {showHidden ? "✓" : ""} ocultos
            {hiddenCount > 0 && !showHidden && <span className="ml-1">({hiddenCount})</span>}
          </Link>
          <p className="text-xs text-text-muted">
            {byProject.length} projeto{byProject.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <ProjectMergeBar
        projects={byProject.map((p) => ({ id: p.id, name: p.name, slug: p.slug, cwdPath: p.cwdPath }))}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {byProject.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="card p-4 block hover:border-hover hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: p.color ?? "var(--color-accent)" }}
              />
              <h3 className="font-semibold truncate group-hover:text-accent transition-colors">
                {p.name}
              </h3>
            </div>
            <p className="text-xs text-text-muted mt-1 font-mono truncate">{p.slug}</p>
            {p.clientName && (
              <p className="text-xs mt-2">
                <span className="text-text-muted">cliente: </span>
                <span className="text-accent">{p.clientName}</span>
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-wide">Tasks</p>
                <p className="font-mono">{p.taskCount}</p>
              </div>
              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-wide">Custo</p>
                <p className="font-mono">{formatMoney(p.totalCost, currency, rate)}</p>
              </div>
              <div>
                <p className="text-text-muted text-[10px] uppercase tracking-wide">Tokens</p>
                <p className="font-mono">{formatTokens(p.totalTokens)}</p>
              </div>
            </div>
          </Link>
        ))}
        {byProject.length === 0 && <p className="text-text-muted col-span-3">Nenhum projeto</p>}
      </div>
    </div>
  );
}
