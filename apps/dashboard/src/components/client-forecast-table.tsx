import Link from "next/link";
import type { Currency } from "@/lib/filters";

export type BillingMode = "fixed" | "hourly" | "none";

export interface ForecastRow {
  id: string;
  name: string;
  color: string | null;
  mode: BillingMode;
  // Horas trabalhadas no período (com fallback humano/Claude se billable=0).
  hours: number;
  expectedHours: number | null;
  hoursPct: number | null;
  hoursStatus: "no_target" | "below" | "ok" | "above";
  // Receita previsto/realizado em USD (já normalizado).
  expectedRevenueUsd: number | null;
  realizedRevenueUsd: number | null;
  // Custo de IA no período + orçamento.
  costUsd: number;
  expectedCostUsd: number | null;
  costPct: number | null;
  costStatus: "no_target" | "below" | "ok" | "above";
  costDeltaUsd: number | null;
  /** baseline do custo:
   *  - "revenue"  = comparado com receita prevista (% da receita gasto em IA)
   *  - "explicit" = monthlyAverageCostUsd setado (variação vs orçamento)
   *  - "inferred" = média 90d (variação vs histórico)
   *  - "none"     = sem baseline */
  costBaselineSource: "revenue" | "explicit" | "inferred" | "none";
}

// Convenção do user: above = ruim (vermelho); ok = neutro; below = bom (verde, lucro).
const STATUS_COLOR: Record<ForecastRow["hoursStatus"], string> = {
  no_target: "text-text-muted",
  below: "text-accent font-medium",
  ok: "text-text-secondary",
  above: "text-danger font-medium",
};

const MODE_LABEL: Record<BillingMode, string> = {
  fixed: "fixo",
  hourly: "por hora",
  none: "—",
};
const MODE_COLOR: Record<BillingMode, string> = {
  fixed: "text-accent",
  hourly: "text-text-secondary",
  none: "text-text-muted",
};

function fmt(value: number | null, currency: Currency, rate: number): string {
  if (value === null) return "—";
  const v = currency === "BRL" ? value * rate : value;
  const symbol = currency === "BRL" ? "R$" : "$";
  return `${symbol} ${v.toLocaleString(currency === "BRL" ? "pt-BR" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ClientForecastTable({
  forecast,
  currency,
  rate,
  rangeLabel,
}: {
  forecast: ForecastRow[];
  currency: Currency;
  rate: number;
  rangeLabel: string;
}) {
  if (forecast.length === 0) {
    return (
      <div className="card p-4 text-sm text-text-muted">
        Sem clientes com atividade ou metas definidas. Configure <code>monthlyAverageHours</code>, <code>hourlyRate</code> ou <code>monthlyAverageCostUsd</code> em{" "}
        <Link className="text-accent hover:underline" href="/clients">/clients</Link> pra ver previsto × realizado aqui.
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-text-secondary">Previsto × realizado por cliente ({rangeLabel})</h3>
        <span className="text-[10px] text-text-muted">custo IA = % da receita prevista (sobra entre parênteses); horas inclui eventos manuais</span>
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm font-mono">
          <thead className="text-text-muted text-[10px] uppercase">
            <tr>
              <th className="text-left py-1.5 px-2 font-normal">Cliente</th>
              <th className="text-left py-1.5 px-2 font-normal">Modelo</th>
              <th className="text-right py-1.5 px-2 font-normal">Horas</th>
              <th className="text-right py-1.5 px-2 font-normal">Δ horas</th>
              <th className="text-right py-1.5 px-2 font-normal">Receita previsto / realizado</th>
              <th className="text-right py-1.5 px-2 font-normal">Custo IA</th>
              <th className="text-right py-1.5 px-2 font-normal">Δ custo</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((r, i) => (
              <tr key={r.id} className={`${i % 2 === 0 ? "bg-bg-tertiary/15" : ""}`}>
                <td className="py-1.5 px-2">
                  <Link href={`/clients/${r.id}`} className="hover:text-accent flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color ?? "var(--color-accent)" }} />
                    {r.name}
                  </Link>
                </td>
                <td className={`py-1.5 px-2 text-[11px] ${MODE_COLOR[r.mode]}`}>{MODE_LABEL[r.mode]}</td>
                <td className="text-right py-1.5 px-2">
                  {r.hours.toFixed(1)}h
                  {r.expectedHours !== null && (
                    <span className="text-text-muted text-[10px] ml-1">/ {r.expectedHours.toFixed(0)}h</span>
                  )}
                </td>
                <td className={`text-right py-1.5 px-2 ${STATUS_COLOR[r.hoursStatus]}`}>
                  {r.hoursPct !== null ? `${r.hoursPct >= 0 ? "+" : ""}${r.hoursPct.toFixed(0)}%` : "—"}
                </td>
                <td className="text-right py-1.5 px-2">
                  {r.expectedRevenueUsd !== null || r.realizedRevenueUsd !== null ? (
                    <span>
                      <span className="text-text-muted">{fmt(r.expectedRevenueUsd, currency, rate)}</span>
                      <span className="text-text-muted mx-1">/</span>
                      <span className="text-accent">{fmt(r.realizedRevenueUsd, currency, rate)}</span>
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="text-right py-1.5 px-2">
                  {fmt(r.costUsd, currency, rate)}
                </td>
                <td className={`text-right py-1.5 px-2 ${STATUS_COLOR[r.costStatus]}`}>
                  {r.costPct !== null ? (
                    r.costBaselineSource === "revenue"
                      ? <span>{r.costPct.toFixed(1)}%</span>
                      : <span>{r.costPct >= 0 ? "+" : ""}{r.costPct.toFixed(0)}%</span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                  {r.costDeltaUsd !== null && (
                    <span className="text-[10px] ml-1 opacity-80">
                      ({r.costBaselineSource === "revenue"
                        ? (r.costDeltaUsd >= 0 ? "+" : "-") + fmt(Math.abs(r.costDeltaUsd), currency, rate)
                        : (r.costDeltaUsd >= 0 ? "+" : "-") + fmt(Math.abs(r.costDeltaUsd), currency, rate)})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
