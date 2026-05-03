"use client";
import { useState, useEffect } from "react";

export function SettingsForm() {
  const [s, setS] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d: { settings: Record<string, unknown> }) => { setS(d.settings); setLoading(false); });
  }, []);

  async function save(key: string, value: unknown) {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      alert(`Falha ao salvar ${key}: ${t}`);
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      <section className="card p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold">Cálculo de Tempo & Faturamento</h3>
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Restaurar defaults realistas (Opus ~75 tok/s)? Vai sobrescrever os valores atuais e recalcular tempos.")) return;
              await fetch("/api/settings/reset-time-defaults", { method: "POST" });
              location.reload();
            }}
            className="text-[11px] text-accent hover:underline"
          >
            ↻ restaurar defaults
          </button>
        </div>
        <p className="text-[11px] text-text-muted">
          Estes fatores convertem tokens em segundos estimados. Tempos derivados não são tempo real (esse é "Duração real" na task).
        </p>
        {[
          { key: "timePerInputTokenSeconds", label: "Tempo por token de input (s)", hint: "Opus: ~0.0008" },
          { key: "timePerProcessingOutputTokenSeconds", label: "Tempo por token output proc (s)", hint: "~0.013 (75 tok/s)" },
          { key: "timePerReadingTokenSeconds", label: "Tempo por token leitura humana (s)", hint: "~0.04" },
          { key: "cacheReadFactor", label: "Fator cache read (0-1)", hint: "0.05 = cache 20× mais rápido" },
          { key: "billableFactorDefault", label: "Billable factor default (0-1)", hint: "0.4" },
          { key: "billableTolerancePercentBelow", label: "Tolerância horas abaixo (%)", hint: "≤ -X% = abaixo" },
          { key: "billableTolerancePercentAbove", label: "Tolerância horas acima (%)", hint: "≥ +X% = acima" },
          { key: "costTolerancePercentBelow", label: "Tolerância custo IA abaixo (%)", hint: "default 25" },
          { key: "costTolerancePercentAbove", label: "Tolerância custo IA acima (%)", hint: "default 15" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3">
            <span className="text-sm text-text-secondary w-64">{label}</span>
            <input type="number" step="0.01" defaultValue={s[key] as number}
                   onBlur={(e) => save(key, Number(e.target.value))}
                   className="bg-bg-card border border-border rounded px-2 py-1 w-32 font-mono" />
          </label>
        ))}
      </section>
      <section className="card p-4 space-y-3">
        <h3 className="font-semibold">Detecção</h3>
        {[
          { key: "detection.gapMinutesBase", label: "Gap base (min)" },
          { key: "detection.nightHoursStart", label: "Início janela noturna" },
          { key: "detection.nightHoursEnd", label: "Fim janela noturna" },
          { key: "detection.semanticThreshold", label: "Jaccard threshold (0-1)" },
          { key: "detection.idleCloseHours", label: "Idle close (h)" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3">
            <span className="text-sm text-text-secondary w-64">{label}</span>
            <input type="number" step="0.01" defaultValue={s[key] as number}
                   onBlur={(e) => save(key, Number(e.target.value))}
                   className="bg-bg-card border border-border rounded px-2 py-1 w-32 font-mono" />
          </label>
        ))}
      </section>
      <section className="card p-4 space-y-3">
        <h3 className="font-semibold">Refinamento via Anthropic API</h3>
        <p className="text-[11px] text-text-muted">
          O modelo escolhido é usado para gerar títulos refinados e estimativas de horas humanas. Default: claude-haiku-4-5-20251001 (mais barato).
          Funciona com ANTHROPIC_API_KEY ou com CLAUDE_CODE_OAUTH_TOKEN (plano Max/Pro — rode <code>claude setup-token</code> e cole no .env).
        </p>
        <label className="flex items-center gap-3">
          <span className="text-sm text-text-secondary w-64">Modelo de refinamento</span>
          <select
            defaultValue={(s["haiku.model"] as string) ?? "claude-haiku-4-5-20251001"}
            onChange={(e) => save("haiku.model", e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm font-mono w-72"
          >
            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 (default, barato)</option>
            <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
            <option value="claude-opus-4-7">claude-opus-4-7 (caro)</option>
            <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022</option>
          </select>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked={s["haiku.autoEstimateHours"] as boolean}
                 onChange={(e) => save("haiku.autoEstimateHours", e.target.checked)} />
          <span className="text-sm">Estimar horas humanas automaticamente</span>
        </label>
        <label className="flex items-center gap-3 pt-2 border-t border-border">
          <span className="text-sm text-text-secondary w-64">Modelo de insights (dashboard)</span>
          <select
            defaultValue={(s["insights.model"] as string) ?? "claude-sonnet-4-6"}
            onChange={(e) => save("insights.model", e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm font-mono w-72"
          >
            <option value="claude-sonnet-4-6">claude-sonnet-4-6 (recomendado)</option>
            <option value="claude-opus-4-7">claude-opus-4-7 (mais profundo, caro)</option>
            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001 (barato)</option>
          </select>
        </label>
        <label className="flex items-center gap-3 pt-2 border-t border-border">
          <span className="text-sm text-text-secondary w-64">Plano Anthropic contratado</span>
          <select
            defaultValue={(s["anthropic.planType"] as string) ?? "max20_200"}
            onChange={(e) => save("anthropic.planType", e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm w-72"
            title="Define como os insights interpretam o 'custo IA' (informativo se você paga plano fixo)"
          >
            <option value="free">Free (sem cobrança)</option>
            <option value="pro_20">Pro — $20/mês</option>
            <option value="max5_100">Max 5× — $100/mês</option>
            <option value="max20_200">Max 20× — $200/mês</option>
            <option value="api_paygo">API pay-as-you-go</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="flex items-center gap-3">
          <span className="text-sm text-text-secondary w-64">Override custo mensal (USD, opcional)</span>
          <input
            type="number" step="any" min="0"
            defaultValue={(s["anthropic.planMonthlyCostUsd"] as number) ?? ""}
            onBlur={(e) => save("anthropic.planMonthlyCostUsd", e.target.value ? Number(e.target.value) : null)}
            placeholder="vazio = usa o do plano"
            className="bg-bg-card border border-border rounded px-2 py-1 w-32 font-mono"
          />
        </label>
      </section>
      <PromptEditor
        keyName="haiku.refinePrompt"
        title="Prompt de refinamento (gerar título + categoria)"
        defaultValue={(s["haiku.refinePrompt"] as string) ?? ""}
        save={save}
      />
      <PromptEditor
        keyName="haiku.estimatePrompt"
        title="Prompt de estimativa (horas humanas)"
        defaultValue={(s["haiku.estimatePrompt"] as string) ?? ""}
        save={save}
      />
      <ReclassifySystemSection />
    </div>
  );
}

function PromptEditor({
  keyName,
  title,
  defaultValue,
  save,
}: {
  keyName: string;
  title: string;
  defaultValue: string;
  save: (key: string, value: unknown) => Promise<void>;
}) {
  const [value, setValue] = useState(defaultValue);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function persist() {
    setBusy(true);
    await save(keyName, value);
    setBusy(false);
    setSavedAt(Date.now());
  }

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-[11px] text-text-muted">
          deixe vazio pra usar o default em PT-BR (recomendado)
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        className="bg-bg-card border border-border rounded px-3 py-2 w-full font-mono text-xs focus:border-hover focus:outline-none"
        placeholder="(usando default em português brasileiro)"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={persist}
          disabled={busy}
          className="btn-primary text-xs disabled:opacity-50"
        >
          {busy ? "Salvando..." : "Salvar prompt"}
        </button>
        <button
          type="button"
          onClick={() => setValue("")}
          className="text-xs text-text-muted hover:text-text-primary"
        >
          limpar (volta ao default)
        </button>
        {savedAt && Date.now() - savedAt < 3000 && (
          <span className="text-xs text-accent">✓ salvo</span>
        )}
      </div>
    </section>
  );
}

function ReclassifySystemSection() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ reclassified: number; total: number } | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/tasks/classify-system", { method: "POST" });
    setRunning(false);
    if (res.ok) {
      const d = await res.json() as { reclassified: number; total: number };
      setResult(d);
    } else {
      alert("Falha ao reclassificar");
    }
  }

  return (
    <section className="card p-4 space-y-3">
      <h3 className="font-semibold">Manutenção</h3>
      <p className="text-xs text-text-muted">
        Reaplica os padrões de detecção de "apps & plugins" em todas as tasks.
        Útil após ampliar a lista de regex ou se vir tasks de hooks aparecendo na lista normal.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="btn-primary text-sm px-3 py-1 disabled:opacity-50"
        >
          {running ? "Reclassificando..." : "Reclassificar tasks system"}
        </button>
        {result && (
          <span className="text-xs text-text-muted">
            {result.reclassified} de {result.total} reclassificadas
          </span>
        )}
      </div>
    </section>
  );
}
