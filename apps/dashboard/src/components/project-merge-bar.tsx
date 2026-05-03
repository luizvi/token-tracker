"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface MergeProject {
  id: string;
  name: string;
  slug: string;
  cwdPath: string;
}

export function ProjectMergeBar({ projects }: { projects: MergeProject[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string>("");
  const [merging, setMerging] = useState(false);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function merge() {
    if (!target || selected.size < 1) return;
    if (selected.has(target)) {
      alert("O projeto de destino não pode estar entre os projetos a mesclar.");
      return;
    }
    const sources = [...selected];
    const targetName = projectMap.get(target)?.name ?? target;
    const sourceNames = sources.map((id) => projectMap.get(id)?.name ?? id).join(", ");
    if (!confirm(`Mesclar ${sources.length} projeto(s) (${sourceNames}) em "${targetName}"?\n\nIsso move todas as tasks/sessões e DELETA os projetos de origem.`)) return;
    setMerging(true);
    const res = await fetch("/api/projects/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId: target, sourceIds: sources }),
    });
    setMerging(false);
    if (res.ok) {
      setSelected(new Set());
      setTarget("");
      router.refresh();
    } else {
      alert("Falha ao mesclar — veja console.");
    }
  }

  if (projects.length < 2) return null;

  return (
    <details className="card p-3 mb-4">
      <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-accent">
        🔀 Mesclar projetos {selected.size > 0 && <span className="text-accent">({selected.size} selecionado{selected.size !== 1 ? "s" : ""})</span>}
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-text-muted">
          Marque os projetos de <strong>origem</strong> e selecione um <strong>destino</strong>. Tasks, sessões e
          eventos serão movidos; os projetos de origem serão apagados.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-auto">
          {projects.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 text-sm border border-border rounded px-2 py-1.5 hover:border-hover cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                disabled={p.id === target}
                className="accent-accent"
              />
              <span className="truncate">{p.name}</span>
              <span className="text-text-muted text-[10px] font-mono ml-auto truncate">{p.slug}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-text-muted">Destino:</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm focus:border-hover focus:outline-none"
          >
            <option value="">— escolher —</option>
            {projects
              .filter((p) => !selected.has(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={merge}
            disabled={merging || !target || selected.size === 0}
            className="btn-primary text-xs px-3 py-1 disabled:opacity-50"
          >
            {merging ? "..." : `Mesclar ${selected.size}`}
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-text-muted hover:text-text-primary px-2 py-1"
            >
              limpar
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
