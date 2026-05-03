"use client";
import { useState } from "react";

interface Client { id: string; name: string; }
interface Project { id: string; name: string; }

export function EventForm({ clients, projects, onCreated }: {
  clients: Client[];
  projects: Project[];
  onCreated?: () => void;
}) {
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    projectId: "",
    title: "",
    description: "",
    kind: "other",
    startAt: new Date().toISOString().slice(0, 16),
    durationMinutes: 30,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      startAt: new Date(form.startAt).getTime(),
      projectId: form.projectId || null,
    };
    await fetch("/api/events", { method: "POST", body: JSON.stringify(payload), headers: { "content-type": "application/json" } });
    onCreated?.();
    setForm({ ...form, title: "", description: "", durationMinutes: 30 });
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1 w-full">
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1 w-full">
        <option value="">(sem projeto)</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="bg-bg-card border border-border rounded px-3 py-2 w-full" required />
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" className="bg-bg-card border border-border rounded px-3 py-2 w-full" rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1">
          <option value="meeting">Reunião</option>
          <option value="call">Call</option>
          <option value="review">Review</option>
          <option value="other">Outro</option>
        </select>
        <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1" />
      </div>
      <div className="flex gap-3 items-center">
        <label className="text-sm text-text-muted">Duração (min):</label>
        <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} className="bg-bg-card border border-border rounded px-2 py-1 w-24" />
        <button type="submit" className="btn-primary ml-auto">Salvar</button>
      </div>
    </form>
  );
}
