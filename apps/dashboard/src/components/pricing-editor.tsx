"use client";
import { useEffect, useState } from "react";

interface PricingRow {
  id: string;
  model: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheReadPerMtok: number;
  cacheCreationPerMtok: number;
  validFrom: number;
  validUntil: number | null;
  source: string;
}

export function PricingEditor() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});

  async function load() {
    const r = await fetch("/api/pricing");
    const d = await r.json();
    setRows(d.pricing ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(id: string) {
    await fetch("/api/pricing", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...draft }),
    });
    setEditing(null);
    setDraft({});
    load();
  }

  function startEdit(r: PricingRow) {
    setEditing(r.id);
    setDraft({
      inputPerMtok: r.inputPerMtok,
      outputPerMtok: r.outputPerMtok,
      cacheReadPerMtok: r.cacheReadPerMtok,
      cacheCreationPerMtok: r.cacheCreationPerMtok,
    });
  }

  if (loading) return <p className="text-text-muted text-sm">Carregando pricing...</p>;

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">Pricing dos modelos (USD por 1M tokens)</h3>
        <p className="text-[11px] text-text-muted">
          alterar dispara recálculo de cost_usd em todas as tasks
        </p>
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm font-mono">
          <thead className="text-text-muted text-xs uppercase border-b border-border">
            <tr>
              <th className="text-left py-2 px-2">Modelo</th>
              <th className="text-right py-2 px-2">Input</th>
              <th className="text-right py-2 px-2">Output</th>
              <th className="text-right py-2 px-2">Cache read</th>
              <th className="text-right py-2 px-2">Cache create</th>
              <th className="text-left py-2 px-2">Valid from</th>
              <th className="text-left py-2 px-2">Source</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isEditing = editing === r.id;
              return (
                <tr key={r.id} className="border-b border-border">
                  <td className="py-1.5 px-2">{r.model}</td>
                  {(["inputPerMtok", "outputPerMtok", "cacheReadPerMtok", "cacheCreationPerMtok"] as const).map((k) => (
                    <td key={k} className="py-1.5 px-2 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={draft[k] ?? 0}
                          onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
                          className="bg-bg-card border border-border rounded px-1 py-0.5 w-20 text-right font-mono"
                        />
                      ) : (
                        <span>${r[k].toFixed(2)}</span>
                      )}
                    </td>
                  ))}
                  <td className="py-1.5 px-2 text-text-muted">
                    {new Date(r.validFrom).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-1.5 px-2 text-text-muted">{r.source}</td>
                  <td className="py-1.5 px-2 text-right">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => save(r.id)}
                          className="text-[11px] px-2 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded"
                        >
                          salvar
                        </button>
                        <button
                          onClick={() => { setEditing(null); setDraft({}); }}
                          className="text-[11px] px-2 py-0.5 text-text-muted"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(r)}
                        className="text-[11px] text-text-muted hover:text-accent"
                      >
                        editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
