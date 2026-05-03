"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClientForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    hourLimitValue: "",
    hourLimitPeriod: "month",
    billableFactor: "0.4",
    color: "#1fe879",
    notes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      billableFactor: Number(form.billableFactor) || 0.4,
      color: form.color,
      notes: form.notes || null,
    };
    if (form.hourLimitValue) {
      payload.hourLimitValue = Number(form.hourLimitValue);
      payload.hourLimitPeriod = form.hourLimitPeriod;
    }
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.ok) {
      setForm({ name: "", hourLimitValue: "", hourLimitPeriod: "month", billableFactor: "0.4", color: "#1fe879", notes: "" });
      setOpen(false);
      onCreated?.();
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card p-4 flex items-center justify-center text-text-muted hover:text-accent hover:border-hover transition-all hover:-translate-y-0.5 hover:shadow-lg w-full min-h-[140px] border-dashed"
      >
        <span className="text-3xl mr-2">+</span>
        <span className="text-sm">Novo cliente</span>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 col-span-full md:col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Novo cliente</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary text-sm">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-text-muted">Nome *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
            className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">Cor</span>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="bg-bg-card border border-border rounded h-9 w-12 cursor-pointer"
            />
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 flex-1 font-mono text-sm focus:border-hover focus:outline-none"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">Limite de horas (vazio = ilimitado, max 200)</span>
          <input
            type="number"
            min="0"
            max="200"
            step="0.5"
            value={form.hourLimitValue}
            onChange={(e) => setForm({ ...form, hourLimitValue: e.target.value })}
            className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">Período do limite</span>
          <select
            value={form.hourLimitPeriod}
            onChange={(e) => setForm({ ...form, hourLimitPeriod: e.target.value })}
            className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
          >
            <option value="month">Mensal</option>
            <option value="week">Semanal</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-text-muted">Billable factor (0-1, default 0.4)</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={form.billableFactor}
            onChange={(e) => setForm({ ...form, billableFactor: e.target.value })}
            className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-text-muted">Notas</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
          {submitting ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
