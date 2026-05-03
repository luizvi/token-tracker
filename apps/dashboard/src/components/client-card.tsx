import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/filters";

export interface ClientCardData {
  clientId: string;
  clientName: string;
  color?: string | null;
  billableHours: number;
  hourLimit: number | null;
  hourLimitPeriod: string | null;
  totalCostUsd: number;
  totalTokens: number;
  tasks: number;
  events: number;
}

export function ClientCard({
  data,
  currency = "USD",
  rate = 5,
}: {
  data: ClientCardData;
  currency?: Currency;
  rate?: number;
}) {
  const pct = data.hourLimit ? Math.min(100, (data.billableHours / data.hourLimit) * 100) : 0;
  const overLimit = data.hourLimit !== null && data.billableHours > data.hourLimit;
  const accent = data.color ?? "#1fe879";

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
        {data.hourLimit === null && (
          <span className="chip bg-bg-tertiary text-text-muted text-[10px]">∞</span>
        )}
      </div>

      <p className="text-2xl font-mono mt-3">
        {data.billableHours.toFixed(1)}<span className="text-sm text-text-muted">h</span>
        {data.hourLimit !== null && (
          <span className="text-sm text-text-muted"> / {data.hourLimit}h</span>
        )}
      </p>

      {data.hourLimit !== null && (
        <div className="mt-2 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${overLimit ? "bg-danger" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          ></div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Custo</p>
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
    </Link>
  );
}
