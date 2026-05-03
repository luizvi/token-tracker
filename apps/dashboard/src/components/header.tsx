"use client";
import { useFilters } from "./filter-context";
import { PERIOD_LABELS, type Period, type Currency } from "@/lib/filters";

const PERIODS: Period[] = ["today", "week", "month", "all"];

export function Header() {
  const { period, currency, setPeriod, setCurrency } = useFilters();

  return (
    <header className="sticky top-0 bg-bg-primary/80 backdrop-blur border-b border-border z-10 px-6 py-3 flex items-center gap-3">
      <div className="inline-flex rounded border border-border overflow-hidden">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-sm transition-colors ${
              period === p
                ? "bg-accent text-[var(--color-accent-fg,#0a3d20)] font-medium"
                : "text-text-secondary hover:bg-bg-card-hover"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setCurrency(currency === "USD" ? "BRL" : "USD")}
        className="text-sm font-mono text-text-secondary px-3 py-1 border border-border rounded hover:border-hover hover:text-accent transition-colors"
        title="Alternar moeda"
      >
        {currency}
      </button>
      <input
        type="search"
        placeholder="Buscar..."
        className="ml-auto bg-bg-card border border-border rounded px-3 py-1 text-sm w-64 focus:border-hover focus:outline-none transition-colors"
      />
    </header>
  );
}
