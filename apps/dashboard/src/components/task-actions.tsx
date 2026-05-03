"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TaskLike {
  id: string;
  title: string;
  projectId: string;
  clientId: string | null;
  humanHoursEstimate: number | null;
  billableHours: number | null;
  billableHoursLocked: boolean;
  links: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

export function TaskActions({ task, clients, projects }: { task: TaskLike; clients: Client[]; projects: Project[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [hours, setHours] = useState<string>(
    task.humanHoursEstimate !== null ? String(task.humanHoursEstimate) : "",
  );
  const [title, setTitle] = useState<string>(task.title);

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
  async function saveTitle() {
    const v = title.trim();
    if (!v || v === task.title) return;
    return call("title", () =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: v }),
      }),
    );
  }
  async function setStatus(status: "open" | "paused" | "closed") {
    const body: Record<string, unknown> = { status };
    if (status === "closed") body.endedAt = Date.now();
    return call(`status:${status}`, () =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
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
  async function setProject(projectId: string) {
    if (!projectId || projectId === task.projectId) return;
    return call("project", () =>
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId }),
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
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void saveTitle(); }}
          className="bg-bg-card border border-border rounded px-3 py-1 text-sm flex-1 min-w-[240px] focus:border-hover focus:outline-none"
          placeholder="Título da task"
        />
        <button
          onClick={saveTitle}
          disabled={busy !== null || title.trim() === task.title || !title.trim()}
          className="text-xs px-3 py-1 bg-accent/10 text-accent border border-accent/30 rounded hover:bg-accent/15 disabled:opacity-40"
        >
          {busy === "title" ? "..." : "salvar título"}
        </button>
        <button
          onClick={() => setStatus("paused")}
          disabled={busy !== null}
          className="text-xs px-3 py-1 border border-warning/30 text-warning rounded hover:bg-warning/10 disabled:opacity-50"
        >
          ⏸ pausar
        </button>
        <button
          onClick={() => setStatus("open")}
          disabled={busy !== null}
          className="text-xs px-3 py-1 border border-border rounded hover:border-hover hover:text-accent disabled:opacity-50"
        >
          ▶ retomar
        </button>
        <button
          onClick={() => setStatus("closed")}
          disabled={busy !== null}
          className="text-xs px-3 py-1 border border-accent/30 text-accent rounded hover:bg-accent/10 disabled:opacity-50"
        >
          ✓ concluir
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
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
        <label className="flex items-center gap-2 text-xs text-text-muted">
          projeto:
          <select
            value={task.projectId}
            onChange={(e) => setProject(e.target.value)}
            disabled={busy !== null}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm focus:border-hover focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TaskLinksEditor taskId={task.id} initial={task.links} />
    </div>
  );
}

interface TaskLink {
  kind: "github" | "jira" | "linear" | "other";
  label?: string;
  url: string;
}

function detectKind(url: string): TaskLink["kind"] {
  if (/github\.com/.test(url)) return "github";
  if (/atlassian\.net|jira\./.test(url)) return "jira";
  if (/linear\.app/.test(url)) return "linear";
  return "other";
}

function TaskLinksEditor({ taskId, initial }: { taskId: string; initial: string | null }) {
  const router = useRouter();
  const [links, setLinks] = useState<TaskLink[]>(() => {
    if (!initial) return [];
    try { return JSON.parse(initial) as TaskLink[]; } catch { return []; }
  });
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function persist(next: TaskLink[]) {
    setSaving(true);
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ links: next.length > 0 ? JSON.stringify(next) : null }),
    });
    setSaving(false);
    setLinks(next);
    router.refresh();
  }

  function add() {
    const url = draft.trim();
    if (!url) return;
    const next = [...links, { kind: detectKind(url), url }];
    setDraft("");
    void persist(next);
  }

  function remove(idx: number) {
    void persist(links.filter((_, i) => i !== idx));
  }

  const kindEmoji: Record<TaskLink["kind"], string> = {
    github: "🐙", jira: "🟦", linear: "📐", other: "🔗",
  };

  return (
    <div className="pt-3 border-t border-border space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">links externos:</span>
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="https://github.com/.../pull/123"
          className="flex-1 bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono focus:border-hover focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !draft.trim()}
          className="text-xs px-2 py-1 bg-accent/10 text-accent border border-accent/30 rounded hover:bg-accent/15 disabled:opacity-50"
        >
          + adicionar
        </button>
      </div>
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {links.map((l, i) => (
            <li key={i} className="chip border border-border flex items-center gap-1.5 text-[11px]">
              <span>{kindEmoji[l.kind]}</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate max-w-xs">
                {l.label ?? l.url}
              </a>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-text-muted hover:text-danger ml-1"
                title="remover"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
