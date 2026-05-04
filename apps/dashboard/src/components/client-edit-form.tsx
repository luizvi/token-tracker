"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClientLike {
  id: string;
  name: string;
  kind: string;
  hourLimitValue: number | null;
  hourLimitPeriod: string | null;
  billableFactor: number;
  contractValueBrl: number | null;
  contractValueUsd: number | null;
  contractPeriod: string | null;
  hourlyRateBrl: number | null;
  hourlyRateUsd: number | null;
  monthlyAverageHours: number | null;
  monthlyAverageCostUsd: number | null;
  contractStartAt: number | null;
  contractRenewalAt: number | null;
  renewalNoticeDays: number | null;
  color: string | null;
  notes: string | null;
}

function tsToIso(ms: number | null): string {
  return ms !== null ? new Date(ms).toISOString().slice(0, 10) : "";
}

export function ClientEditForm({ client }: { client: ClientLike }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    kind: client.kind ?? "service",
    hourLimitValue: client.hourLimitValue !== null ? String(client.hourLimitValue) : "",
    hourLimitPeriod: client.hourLimitPeriod ?? "month",
    billableFactor: String(client.billableFactor),
    contractValueBrl: client.contractValueBrl !== null ? String(client.contractValueBrl) : "",
    contractValueUsd: client.contractValueUsd !== null ? String(client.contractValueUsd) : "",
    contractPeriod: client.contractPeriod ?? "month",
    hourlyRateBrl: client.hourlyRateBrl !== null ? String(client.hourlyRateBrl) : "",
    hourlyRateUsd: client.hourlyRateUsd !== null ? String(client.hourlyRateUsd) : "",
    monthlyAverageHours: client.monthlyAverageHours !== null ? String(client.monthlyAverageHours) : "",
    monthlyAverageCostUsd: client.monthlyAverageCostUsd !== null ? String(client.monthlyAverageCostUsd) : "",
    contractStartAt: tsToIso(client.contractStartAt),
    contractRenewalAt: tsToIso(client.contractRenewalAt),
    renewalNoticeDays: client.renewalNoticeDays !== null ? String(client.renewalNoticeDays) : "",
    // vazio = herda do tema (dashboard.brandAccent); valor = cor explícita do cliente
    color: client.color ?? "",
    notes: client.notes ?? "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      kind: form.kind,
      billableFactor: Number(form.billableFactor) || 0.4,
      color: form.color || null,
      notes: form.notes || null,
      hourLimitValue: form.hourLimitValue ? Number(form.hourLimitValue) : null,
      hourLimitPeriod: form.hourLimitValue ? form.hourLimitPeriod : null,
      contractValueBrl: form.contractValueBrl ? Number(form.contractValueBrl) : null,
      contractValueUsd: form.contractValueUsd ? Number(form.contractValueUsd) : null,
      contractPeriod: (form.contractValueBrl || form.contractValueUsd) ? form.contractPeriod : null,
      hourlyRateBrl: form.hourlyRateBrl ? Number(form.hourlyRateBrl) : null,
      hourlyRateUsd: form.hourlyRateUsd ? Number(form.hourlyRateUsd) : null,
      monthlyAverageHours: form.monthlyAverageHours ? Number(form.monthlyAverageHours) : null,
      monthlyAverageCostUsd: form.monthlyAverageCostUsd ? Number(form.monthlyAverageCostUsd) : null,
      contractStartAt: form.contractStartAt ? Date.parse(`${form.contractStartAt}T12:00:00`) : null,
      contractRenewalAt: form.contractRenewalAt ? Date.parse(`${form.contractRenewalAt}T12:00:00`) : null,
      renewalNoticeDays: form.renewalNoticeDays ? Number(form.renewalNoticeDays) : null,
    };
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1 border border-border rounded hover:border-hover hover:text-accent transition-colors"
      >
        ✎ editar cliente
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Editar cliente</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs uppercase tracking-wide text-text-muted mb-2">Identificação</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block md:col-span-3">
            <span className="text-xs text-text-muted">Tipo</span>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            >
              <option value="service">Cliente / Serviço (padrão — contrato e horas)</option>
              <option value="personal">Projeto pessoal (sem lucro esperado)</option>
              <option value="product">Produto próprio (receita variável, sem contrato fixo)</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-text-muted">Nome *</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Cor</span>
            <div className="flex items-center gap-2 mt-1">
              {form.color ? (
                <>
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
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, color: "" })}
                    className="text-xs text-text-muted hover:text-text-primary px-2 py-1"
                    title="Remover (herda do tema)"
                  >
                    ↺
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="h-9 w-12 rounded border border-border"
                    style={{ background: "var(--color-accent)" }}
                    title="Cor do tema atual"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, color: "#22c55e" })}
                    className="text-xs px-3 py-2 border border-border rounded hover:border-hover"
                  >
                    Personalizar
                  </button>
                  <span className="text-[11px] text-text-muted">herda do tema</span>
                </>
              )}
            </div>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 pt-3 border-t border-border">
        <legend className="text-xs uppercase tracking-wide text-text-muted mb-2">Limite de horas e billable</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-text-muted">Limite de horas (vazio = ∞)</span>
            <input
              type="number" min="0" step="any"
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
            <span className="text-xs text-text-muted">Billable factor (0-1)</span>
            <input
              type="number" min="0" max="1" step="any"
              value={form.billableFactor}
              onChange={(e) => setForm({ ...form, billableFactor: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 pt-3 border-t border-border">
        <legend className="text-xs uppercase tracking-wide text-text-muted mb-2">Contrato fixo (opcional)</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-text-muted">Valor BRL</span>
            <input
              type="number" min="0" step="any"
              value={form.contractValueBrl}
              onChange={(e) => setForm({ ...form, contractValueBrl: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Valor USD</span>
            <input
              type="number" min="0" step="any"
              value={form.contractValueUsd}
              onChange={(e) => setForm({ ...form, contractValueUsd: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Período</span>
            <select
              value={form.contractPeriod}
              onChange={(e) => setForm({ ...form, contractPeriod: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            >
              <option value="week">Semanal</option>
              <option value="month">Mensal</option>
              <option value="year">Anual</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 pt-3 border-t border-border">
        <legend className="text-xs uppercase tracking-wide text-text-muted mb-2">Cobrança por hora & expectativa mensal</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-text-muted">Valor/hora BRL</span>
            <input
              type="number" min="0" step="any"
              placeholder="ex: 67.50"
              value={form.hourlyRateBrl}
              onChange={(e) => setForm({ ...form, hourlyRateBrl: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Valor/hora USD</span>
            <input
              type="number" min="0" step="any"
              placeholder="ex: 12.50"
              value={form.hourlyRateUsd}
              onChange={(e) => setForm({ ...form, hourlyRateUsd: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Horas/mês esperadas</span>
            <input
              type="number" min="0" step="any"
              placeholder="ex: 20"
              value={form.monthlyAverageHours}
              onChange={(e) => setForm({ ...form, monthlyAverageHours: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs text-text-muted">Orçamento de IA esperado por mês (USD)</span>
            <input
              type="number" min="0" step="any"
              placeholder="ex: 30"
              value={form.monthlyAverageCostUsd}
              onChange={(e) => setForm({ ...form, monthlyAverageCostUsd: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 pt-3 border-t border-border">
        <legend className="text-xs uppercase tracking-wide text-text-muted mb-2">Datas de contrato</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-text-muted">Início do contrato</span>
            <input
              type="date"
              value={form.contractStartAt}
              onChange={(e) => setForm({ ...form, contractStartAt: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Próxima renovação</span>
            <input
              type="date"
              value={form.contractRenewalAt}
              onChange={(e) => setForm({ ...form, contractRenewalAt: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Avisar X dias antes</span>
            <input
              type="number" min="0" step="1"
              placeholder="ex: 30"
              value={form.renewalNoticeDays}
              onChange={(e) => setForm({ ...form, renewalNoticeDays: e.target.value })}
              className="bg-bg-card border border-border rounded px-3 py-2 w-full mt-1 focus:border-hover focus:outline-none"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 pt-3 border-t border-border">
        <legend className="text-xs uppercase tracking-wide text-text-muted mb-2">Notas</legend>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="bg-bg-card border border-border rounded px-3 py-2 w-full focus:border-hover focus:outline-none"
        />
      </fieldset>

      <div className="flex gap-3 pt-3 border-t border-border">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancelar</button>
      </div>
    </form>
  );
}
