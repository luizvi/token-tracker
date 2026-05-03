"use client";
import { useState, useEffect } from "react";

export function SettingsForm() {
  const [s, setS] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d: { settings: Record<string, unknown> }) => { setS(d.settings); setLoading(false); });
  }, []);

  async function save(key: string, value: unknown) {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="card p-4 space-y-3">
        <h3 className="font-semibold">Cálculo de Tempo</h3>
        {[
          { key: "timePerInputTokenSeconds", label: "Tempo por token de input (s)" },
          { key: "timePerProcessingOutputTokenSeconds", label: "Tempo por token output proc (s)" },
          { key: "timePerReadingTokenSeconds", label: "Tempo por token leitura (s)" },
          { key: "cacheReadFactor", label: "Fator cache read" },
          { key: "billableFactorDefault", label: "Billable factor default" },
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
        <h3 className="font-semibold">Haiku</h3>
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked={s["haiku.autoEstimateHours"] as boolean}
                 onChange={(e) => save("haiku.autoEstimateHours", e.target.checked)} />
          <span className="text-sm">Estimar horas humanas automaticamente</span>
        </label>
      </section>
    </div>
  );
}
