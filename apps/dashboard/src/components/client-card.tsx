import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/filters";

export interface ClientCardData {
  clientId: string;
  clientName: string;
  color?: string | null;
  /** Horas claimable: billable → humano → Claude (fallback). */
  billableHours: number;
  hourLimit: number | null;
  hourLimitPeriod: string | null;
  contractValueBrl: number | null;
  contractValueUsd: number | null;
  hourlyRateBrl: number | null;
  hourlyRateUsd: number | null;
  monthlyAverageHours: number | null;
  monthlyAverageCostUsd: number | null;
  totalCostUsd: number;
  totalTokens: number;
  tasks: number;
  events: number;
}

type Status = "no_target" | "below" | "ok" | "above";

// Convenção: above = vermelho (gasto/horas a mais = ruim); ok = neutro; below = verde (lucro).
const STATUS_COLOR: Record<Status, string> = {
  no_target: "text-text-muted",
  below: "text-accent",
  ok: "text-text-primary",
  above: "text-danger",
};
const STATUS_LABEL: Record<Status, string> = {
  no_target: "—",
  below: "abaixo",
  ok: "tolerado",
  above: "acima",
};

function classify(pct: number, below: number, above: number): "below" | "ok" | "above" {
  if (pct < -below) return "below";
  if (pct > above) return "above";
  return "ok";
}

export function ClientCard({
  data,
  currency = "USD",
  rate = 5,
  toleranceBelow = 15,
  toleranceAbove = 10,
  costToleranceBelow = 25,
  costToleranceAbove = 15,
}: {
  data: ClientCardData;
  currency?: Currency;
  rate?: number;
  toleranceBelow?: number;
  toleranceAbove?: number;
  costToleranceBelow?: number;
  costToleranceAbove?: number;
}) {
  const accent = data.color ?? "#1fe879";

  // Normaliza hourLimit pra equivalente mensal (semana → ×30/7).
  const hourLimitMonthly = data.hourLimit !== null
    ? (data.hourLimitPeriod === "week" ? data.hourLimit * (30 / 7) : data.hourLimit)
    : null;
  // Baseline horas: monthlyAverageHours OU hourLimit normalizado mensal.
  const baselineHours = data.monthlyAverageHours ?? hourLimitMonthly;
  const overLimit = baselineHours !== null && data.billableHours > baselineHours;
  const pct = baselineHours ? Math.min(100, (data.billableHours / baselineHours) * 100) : 0;

  // Δ horas
  let hoursStatus: Status = "no_target";
  let hoursPct: number | null = null;
  if (baselineHours && baselineHours > 0) {
    hoursPct = (data.billableHours / baselineHours) * 100 - 100;
    hoursStatus = classify(hoursPct, toleranceBelow, toleranceAbove);
  }

  // Δ custo IA
  let costStatus: Status = "no_target";
  let costPct: number | null = null;
  let costDeltaUsd: number | null = null;
  if (data.monthlyAverageCostUsd && data.monthlyAverageCostUsd > 0) {
    costPct = (data.totalCostUsd / data.monthlyAverageCostUsd) * 100 - 100;
    costStatus = classify(costPct, costToleranceBelow, costToleranceAbove);
    costDeltaUsd = data.totalCostUsd - data.monthlyAverageCostUsd;
  }

  // Receita estimada — usa horas claimable mesmo quando billableHours antigo era 0.
  const revenueBrl = data.hourlyRateBrl !== null ? data.billableHours * data.hourlyRateBrl : null;
  const revenueUsd = data.hourlyRateUsd !== null ? data.billableHours * data.hourlyRateUsd : null;

  return (
    <Link
      href={`/clients/${data.clientId}`}
      className="card p-4 block hover:border-hover hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}40` }}
          />
          <h3 className="font-semibold truncate group-hover:text-accent transition-colors">
            {data.clientName}
          </h3>
        </div>
        {baselineHours === null && (
          <span className="chip bg-bg-tertiary text-text-muted text-[10px]">∞</span>
        )}
      </div>

      <p className="text-2xl font-mono mt-3">
        {data.billableHours.toFixed(1)}<span className="text-sm text-text-muted">h</span>
        {baselineHours !== null && (
          <span className="text-sm text-text-muted"> / {baselineHours.toFixed(0)}h</span>
        )}
      </p>

      {baselineHours !== null && (
        <>
          <div className="mt-2 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${overLimit ? "bg-danger" : "bg-accent"}`}
              style={{ width: `${pct}%` }}
            ></div>
          </div>
          <p className={`text-[11px] mt-1 font-mono ${STATUS_COLOR[hoursStatus]}`}>
            ● horas: {hoursPct !== null ? `${hoursPct >= 0 ? "+" : ""}${hoursPct.toFixed(0)}%` : "—"} <span className="text-[10px]">{STATUS_LABEL[hoursStatus]}</span>
          </p>
        </>
      )}

      {data.monthlyAverageCostUsd !== null && data.monthlyAverageCostUsd > 0 && (
        <p className={`text-[11px] mt-1 font-mono ${STATUS_COLOR[costStatus]}`}>
          ● custo IA: {costPct !== null ? `${costPct >= 0 ? "+" : ""}${costPct.toFixed(0)}%` : "—"}{" "}
          {costDeltaUsd !== null && (
            <span className="text-[10px]">
              ({costDeltaUsd >= 0 ? "+" : "-"}
              {formatMoney(Math.abs(costDeltaUsd), currency, rate)})
            </span>
          )}
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Custo IA</p>
          <p className="font-mono">{formatMoney(data.totalCostUsd, currency, rate)}</p>
        </div>
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Tasks</p>
          <p className="font-mono">{data.tasks}</p>
        </div>
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Eventos</p>
          <p className="font-mono">{data.events}</p>
        </div>
      </div>

      {data.hourLimitPeriod && (
        <p className="text-[10px] text-text-muted mt-2">limite por {data.hourLimitPeriod}</p>
      )}
      {(data.contractValueBrl !== null || data.contractValueUsd !== null) && (
        <p className="text-[11px] text-text-secondary mt-1 font-mono">
          contrato fixo:{" "}
          {data.contractValueBrl !== null && (
            <span>R$ {data.contractValueBrl.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
          )}
          {data.contractValueBrl !== null && data.contractValueUsd !== null && " · "}
          {data.contractValueUsd !== null && (
            <span>${data.contractValueUsd.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
          )}
        </p>
      )}
      {(revenueBrl !== null || revenueUsd !== null) && (
        <p className="text-[11px] text-accent mt-1 font-mono">
          receita estimada:{" "}
          {revenueBrl !== null && (
            <span>R$ {revenueBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          )}
          {revenueBrl !== null && revenueUsd !== null && " · "}
          {revenueUsd !== null && (
            <span>${revenueUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          )}
        </p>
      )}
      {data.monthlyAverageHours !== null && data.monthlyAverageHours > 0 && (
        <p className="text-[10px] text-text-muted mt-0.5 font-mono">
          média esperada: {data.monthlyAverageHours.toFixed(1)}h/mês
        </p>
      )}
    </Link>
  );
}
