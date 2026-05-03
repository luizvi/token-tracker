"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Entry {
  id: string;
  clientId: string;
  kind: "estimated" | "actual";
  amountUsd: number | null;
  amountBrl: number | null;
  occurredAt: number;
  description: string | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RevenueEditor({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    kind: "actual" as "actual" | "estimated",
    amountBrl: "",
    amountUsd: "",
    occurredAt: todayIso(),
    description: "",
  });

  async function load() {
    const res = await fetch(`/api/revenue?client=${clientId}`);
    const data = await res.json();
    setEntries(data.revenue ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [clientId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.amountBrl && !draft.amountUsd) return;
    setSaving(true);
    await fetch("/api/revenue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId,
        kind: draft.kind,
        amountBrl: draft.amountBrl ? Number(draft.amountBrl) : null,
        amountUsd: draft.amountUsd ? Number(draft.amountUsd) : null,
        occurredAt: Date.parse(`${draft.occurredAt}T12:00:00`),
        description: draft.description || null,
      }),
    });
    setSaving(false);
    setDraft({ kind: "actual", amountBrl: "", amountUsd: "", occurredAt: todayIso(), description: "" });
    load();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Apagar esse lançamento?")) return;
    await fetch(`/api/revenue/${id}`, { method: "DELETE" });
    load();
    router.refresh();
  }

  const totalActualBrl = entries.filter((e) => e.kind === "actual" && e.amountBrl !== null).reduce((s, e) => s + e.amountBrl!, 0);
  const totalActualUsd = entries.filter((e) => e.kind === "actual" && e.amountUsd !== null).reduce((s, e) => s + e.amountUsd!, 0);
  const totalEstBrl = entries.filter((e) => e.kind === "estimated" && e.amountBrl !== null).reduce((s, e) => s + e.amountBrl!, 0);
  const totalEstUsd = entries.filter((e) => e.kind === "estimated" && e.amountUsd !== null).reduce((s, e) => s + e.amountUsd!, 0);

  return (
    <section className="card p-4 space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Receitas registradas</h3>
        <p className="text-[11px] text-text-muted">
          Real: {totalActualBrl > 0 && `R$ ${totalActualBrl.toFixed(2)}`}
          {totalActualBrl > 0 && totalActualUsd > 0 && " · "}
          {totalActualUsd > 0 && `$ ${totalActualUsd.toFixed(2)}`}
          {totalEstBrl + totalEstUsd > 0 && " · estimado: "}
          {totalEstBrl > 0 && `R$ ${totalEstBrl.toFixed(2)}`}
          {totalEstBrl > 0 && totalEstUsd > 0 && " · "}
          {totalEstUsd > 0 && `$ ${totalEstUsd.toFixed(2)}`}
        </p>
      </div>

      <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <label className="block">
          <span className="text-xs text-text-muted">Tipo</span>
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as "actual" | "estimated" })}
            className="bg-bg-card border border-border rounded px-2 py-1.5 w-full mt-1 text-sm"
          >
            <option value="actual">Real</option>
            <option value="estimated">Estimado</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">BRL</span>
          <input
            type="number" step="any" min="0"
            value={draft.amountBrl}
            onChange={(e) => setDraft({ ...draft, amountBrl: e.target.value })}
            className="bg-bg-card border border-border rounded px-2 py-1.5 w-full mt-1 text-sm font-mono"
          />
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">USD</span>
          <input
            type="number" step="any" min="0"
            value={draft.amountUsd}
            onChange={(e) => setDraft({ ...draft, amountUsd: e.target.value })}
            className="bg-bg-card border border-border rounded px-2 py-1.5 w-full mt-1 text-sm font-mono"
          />
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">Data</span>
          <input
            type="date"
            value={draft.occurredAt}
            onChange={(e) => setDraft({ ...draft, occurredAt: e.target.value })}
            className="bg-bg-card border border-border rounded px-2 py-1.5 w-full mt-1 text-sm font-mono"
          />
        </label>
        <label className="block md:col-span-1">
          <span className="text-xs text-text-muted">Descrição</span>
          <input
            type="text"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="ex: licença anual"
            className="bg-bg-card border border-border rounded px-2 py-1.5 w-full mt-1 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={saving || (!draft.amountBrl && !draft.amountUsd)}
          className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
        >
          {saving ? "..." : "+ adicionar"}
        </button>
      </form>

      {loading ? (
        <p className="text-text-muted text-sm">Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="text-text-muted text-sm">Nenhum lançamento ainda.</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 text-sm py-1 px-2 hover:bg-bg-tertiary/20 rounded">
              <span className={`chip text-[10px] ${e.kind === "actual" ? "bg-accent/10 text-accent border border-accent/30" : "bg-bg-tertiary text-text-muted"}`}>
                {e.kind === "actual" ? "real" : "est."}
              </span>
              <span className="font-mono text-xs">
                {e.amountBrl !== null && `R$ ${e.amountBrl.toFixed(2)}`}
                {e.amountBrl !== null && e.amountUsd !== null && " · "}
                {e.amountUsd !== null && `$ ${e.amountUsd.toFixed(2)}`}
              </span>
              <span className="text-xs text-text-muted font-mono">
                {new Date(e.occurredAt).toLocaleDateString("pt-BR")}
              </span>
              <span className="flex-1 truncate text-text-secondary">{e.description ?? ""}</span>
              <button
                type="button"
                onClick={() => remove(e.id)}
                className="text-[11px] text-text-muted hover:text-danger px-2"
                title="apagar"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
