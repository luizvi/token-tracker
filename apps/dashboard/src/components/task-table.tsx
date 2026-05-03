"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatMoney, formatDuration, formatRelativeTime, formatTokens } from "@/lib/format";
import type { Currency } from "@/lib/filters";

interface Task {
  id: string;
  title: string;
  status: string;
  category: string | null;
  projectId: string;
  clientId: string | null;
  startedAt: number;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  timeTotalSeconds: number;
  humanHoursEstimate: number | null;
  humanHoursSource: string;
  billableHours: number | null;
  billableHoursLocked: boolean;
  isBackfilled: boolean;
  confidence: number;
}

interface Project {
  id: string;
  name: string;
  color: string | null;
}

interface Client {
  id: string;
  name: string;
  color: string | null;
}

export function TaskTable({
  currency = "USD",
  rate = 5,
}: {
  currency?: Currency;
  rate?: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const projectFilter = params.get("project");
  const clientFilter = params.get("client");
  const showSystem = params.get("system") === "1";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [tasksRes, projectsRes, clientsRes] = await Promise.all([
        fetch("/api/tasks?limit=500"),
        fetch("/api/projects"),
        fetch("/api/clients"),
      ]);
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      const clientsData = await clientsRes.json();
      if (cancelled) return;
      setTasks(tasksData.tasks ?? []);
      setProjects(projectsData.projects ?? []);
      setClients(clientsData.clients ?? []);
      setLoading(false);
    }
    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const filtered = useMemo(() => {
    let out = tasks;
    if (projectFilter) out = out.filter((t) => t.projectId === projectFilter);
    if (clientFilter) out = out.filter((t) => t.clientId === clientFilter);
    if (!showSystem) out = out.filter((t) => t.category !== "system");
    return out;
  }, [tasks, projectFilter, clientFilter, showSystem]);

  const systemHidden = !showSystem ? tasks.filter((t) => t.category === "system").length : 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function mergeSelected() {
    if (selected.size < 2) return;
    if (!confirm(`Mesclar ${selected.size} tarefas em uma só?`)) return;
    setMerging(true);
    const res = await fetch("/api/tasks/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskIds: [...selected] }),
    });
    setMerging(false);
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
      const r = await fetch("/api/tasks?limit=500");
      const d = await r.json();
      setTasks(d.tasks ?? []);
    } else {
      alert("Falha ao mesclar — veja console");
    }
  }

  function toggleProjectFilter(id: string) {
    const next = new URLSearchParams(params.toString());
    if (next.get("project") === id) next.delete("project");
    else next.set("project", id);
    router.push(`/tasks?${next.toString()}`);
  }

  function toggleSystemVisibility() {
    const next = new URLSearchParams(params.toString());
    if (showSystem) next.delete("system");
    else next.set("system", "1");
    router.push(`/tasks?${next.toString()}`);
  }

  if (loading) return <p className="text-text-muted">Carregando...</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(projectFilter || clientFilter) && (
          <button
            onClick={() => router.push("/tasks")}
            className="text-xs text-text-muted hover:text-accent border border-border px-2 py-1 rounded"
          >
            ✕ limpar filtros
          </button>
        )}
        {projectFilter && projectMap.get(projectFilter) && (
          <span className="chip bg-accent/15 text-accent border border-accent/30">
            projeto: {projectMap.get(projectFilter)!.name}
          </span>
        )}
        {clientFilter && clientMap.get(clientFilter) && (
          <span className="chip bg-accent/15 text-accent border border-accent/30">
            cliente: {clientMap.get(clientFilter)!.name}
          </span>
        )}
        <button
          onClick={toggleSystemVisibility}
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            showSystem
              ? "border-accent text-accent bg-accent/10"
              : "border-border text-text-muted hover:text-text-primary"
          }`}
          title="Mostrar tasks de hooks/agents/plugins"
        >
          {showSystem ? "✓" : ""} apps & plugins
          {systemHidden > 0 && !showSystem && (
            <span className="ml-1 text-text-muted">({systemHidden} ocultas)</span>
          )}
        </button>
        <span className="ml-auto text-xs text-text-muted font-mono">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
        {selected.size >= 2 && (
          <button
            onClick={mergeSelected}
            disabled={merging}
            className="btn-primary text-xs px-3 py-1 disabled:opacity-50"
          >
            {merging ? "..." : `Mesclar ${selected.size}`}
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-text-muted hover:text-text-primary px-2 py-1"
          >
            limpar seleção
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-muted">Nenhuma task encontrada</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead className="text-text-muted text-xs uppercase border-b border-border">
              <tr>
                <th className="text-left py-2 px-2 w-8"></th>
                <th className="text-left py-2 px-2 w-8"></th>
                <th className="text-left py-2 px-2">Title</th>
                <th className="text-left py-2 px-2">Project</th>
                <th className="text-right py-2 px-2">Tokens</th>
                <th className="text-right py-2 px-2">Cost</th>
                <th className="text-right py-2 px-2">Time</th>
                <th className="text-right py-2 px-2">Billable</th>
                <th className="text-right py-2 px-2">Started</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const proj = projectMap.get(t.projectId);
                const isSelected = selected.has(t.id);
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border transition-colors ${
                      isSelected ? "bg-accent/8" : "hover:bg-bg-card-hover"
                    } ${t.isBackfilled ? "opacity-70" : ""}`}
                  >
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(t.id)}
                        className="accent-accent cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`w-2 h-2 inline-block rounded-full ${
                          t.status === "open"
                            ? "bg-accent shadow-[0_0_6px_rgba(31,232,121,0.6)]"
                            : t.status === "paused"
                              ? "bg-warning"
                              : "bg-text-muted"
                        }`}
                        title={t.status}
                      ></span>
                    </td>
                    <td className="py-2 px-2 max-w-md">
                      <Link href={`/tasks/${t.id}`} className="hover:text-accent transition-colors">
                        {t.title}
                      </Link>
                      {t.category === "system" && (
                        <span className="ml-2 chip bg-bg-tertiary text-text-muted text-[10px]">plugin</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {proj ? (
                        <button
                          onClick={() => toggleProjectFilter(proj.id)}
                          className="chip border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors text-[11px]"
                          style={proj.color ? { borderColor: proj.color, color: proj.color } : {}}
                        >
                          {proj.name}
                        </button>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">{formatTokens(t.tokensInput + t.tokensOutput)}</td>
                    <td className="py-2 px-2 text-right">{formatMoney(t.costUsd, currency, rate)}</td>
                    <td className="py-2 px-2 text-right">{formatDuration(t.timeTotalSeconds)}</td>
                    <td className="py-2 px-2 text-right">
                      {t.billableHours !== null
                        ? `${t.billableHours.toFixed(1)}h${t.billableHoursLocked ? " 🔒" : ""}`
                        : "-"}
                    </td>
                    <td className="py-2 px-2 text-right text-text-muted">{formatRelativeTime(t.startedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
