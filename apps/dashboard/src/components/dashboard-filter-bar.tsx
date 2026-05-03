"use client";
import { useRouter, useSearchParams } from "next/navigation";

interface Item { id: string; name: string }

export function DashboardFilterBar({
  projects,
  clients,
  selectedProject,
  selectedClient,
}: {
  projects: Item[];
  clients: Item[];
  selectedProject: string | null;
  selectedClient: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Range custom tem prioridade sobre period — limpa um quando o outro é setado.
    if (key === "from" || key === "to") {
      if (value) next.delete("period");
    } else if (key === "period" && value) {
      next.delete("from");
      next.delete("to");
    }
    router.push(`/?${next.toString()}`);
  }

  function clearRange() {
    const next = new URLSearchParams(params.toString());
    next.delete("from");
    next.delete("to");
    router.push(`/?${next.toString()}`);
  }

  function clearAll() {
    const next = new URLSearchParams(params.toString());
    next.delete("project");
    next.delete("client");
    next.delete("from");
    next.delete("to");
    router.push(`/?${next.toString()}`);
  }

  const from = params.get("from");
  const to = params.get("to");
  const hasRange = !!(from || to);

  return (
    <div className="flex flex-wrap items-center gap-2 -mt-2">
      <select
        value={selectedProject ?? ""}
        onChange={(e) => setParam("project", e.target.value || null)}
        className="bg-bg-card border border-border rounded px-2 py-1 text-sm focus:border-hover focus:outline-none"
      >
        <option value="">todos os projetos</option>
        {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
      </select>
      <select
        value={selectedClient ?? ""}
        onChange={(e) => setParam("client", e.target.value || null)}
        className="bg-bg-card border border-border rounded px-2 py-1 text-sm focus:border-hover focus:outline-none"
      >
        <option value="">todos os clientes</option>
        {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
      </select>
      <span className="text-xs text-text-muted ml-2">range:</span>
      <input
        type="date"
        value={from ?? ""}
        onChange={(e) => setParam("from", e.target.value || null)}
        className="bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono focus:border-hover focus:outline-none"
        title="data inicial (sobrescreve hoje/semana/mês)"
      />
      <span className="text-xs text-text-muted">até</span>
      <input
        type="date"
        value={to ?? ""}
        onChange={(e) => setParam("to", e.target.value || null)}
        className="bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono focus:border-hover focus:outline-none"
      />
      {hasRange && (
        <button
          type="button"
          onClick={clearRange}
          className="text-xs text-text-muted hover:text-accent border border-border px-2 py-1 rounded"
          title="volta a usar hoje/semana/mês"
        >
          ✕ range
        </button>
      )}
      {(selectedProject || selectedClient || hasRange) && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-text-muted hover:text-accent border border-border px-2 py-1 rounded ml-auto"
        >
          ✕ tudo
        </button>
      )}
    </div>
  );
}
