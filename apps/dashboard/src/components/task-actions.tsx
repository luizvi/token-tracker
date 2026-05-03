"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TaskLike {
  id: string;
  clientId: string | null;
  humanHoursEstimate: number | null;
  billableHours: number | null;
  billableHoursLocked: boolean;
}

interface Client {
  id: string;
  name: string;
}

export function TaskActions({ task, clients }: { task: TaskLike; clients: Client[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [hours, setHours] = useState<string>(
    task.humanHoursEstimate !== null ? String(task.humanHoursEstimate) : "",
  );

  async function call(action: string, fn: () => Promise<Response>) {
    setBusy(action);
    const res = await fn();
    setBusy(null);
    if (!res.ok) {
      const t = await res.text();
      alert(`Falha: ${t}`);
      return;
    }
    router.refresh();
  }

  async function refine() {
    return call("refine", () => fetch(`/api/tasks/${task.id}/refine`, { method: "POST" }));
  }
  async function estimateHours() {
    return call("estimate", () => fetch(`/api/tasks/${task.id}/estimate-hours`, { method: "POST" }));
  }
  async function recalcBillable() {
    return call("recalc", () => fetch(`/api/tasks/${task.id}/recalc-billable`, { method: "POST" }));
  }
  async function toggleLock() {
    return call("lock", () => fetch(`/api/tasks/${task.id}/lock`, { method: "POST" }));
  }
  async function saveHours() {
    const value = hours.trim() === "" ? null : Number(hours);
    return call("hours", () =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ humanHoursEstimate: value, humanHoursSource: value === null ? "none" : "manual" }),
      }),
    );
  }
  async function setClient(clientId: string) {
    return call("client", () =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: clientId || null }),
      }),
    );
  }
  async function deleteTask() {
    if (!confirm("Apagar esta task definitivamente?")) return;
    setBusy("delete");
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.push("/tasks");
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={refine}
          disabled={busy !== null}
          className="text-xs px-3 py-1 border border-border rounded hover:border-hover hover:text-accent transition-colors disabled:opacity-50"
        >
          {busy === "refine" ? "..." : "✨ Refinar (Haiku)"}
        </button>
        <button
          onClick={estimateHours}
          disabled={busy !== null}
          className="text-xs px-3 py-1 border border-border rounded hover:border-hover hover:text-accent transition-colors disabled:opacity-50"
        >
          {busy === "estimate" ? "..." : "🤖 Estimar horas"}
        </button>
        <button
          onClick={recalcBillable}
          disabled={busy !== null}
          className="text-xs px-3 py-1 border border-border rounded hover:border-hover hover:text-accent transition-colors disabled:opacity-50"
        >
          {busy === "recalc" ? "..." : "↻ Recalc billable"}
        </button>
        <button
          onClick={toggleLock}
          disabled={busy !== null}
          className={`text-xs px-3 py-1 border rounded transition-colors disabled:opacity-50 ${
            task.billableHoursLocked
              ? "border-warning text-warning bg-warning/10"
              : "border-border hover:border-hover hover:text-accent"
          }`}
        >
          {task.billableHoursLocked ? "🔒 destravar billable" : "🔓 travar billable"}
        </button>
        <button
          onClick={deleteTask}
          disabled={busy !== null}
          className="text-xs px-3 py-1 border border-danger/30 text-danger rounded hover:bg-danger/10 transition-colors disabled:opacity-50 ml-auto"
        >
          {busy === "delete" ? "..." : "🗑 deletar"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          horas humanas:
          <input
            type="number"
            step="0.25"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 w-24 text-sm font-mono focus:border-hover focus:outline-none"
            placeholder="0.0"
          />
          <button
            onClick={saveHours}
            disabled={busy !== null}
            className="text-xs px-2 py-1 bg-accent/10 text-accent border border-accent/30 rounded hover:bg-accent/15 disabled:opacity-50"
          >
            salvar
          </button>
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          cliente:
          <select
            value={task.clientId ?? ""}
            onChange={(e) => setClient(e.target.value)}
            disabled={busy !== null}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm focus:border-hover focus:outline-none"
          >
            <option value="">— sem cliente —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
