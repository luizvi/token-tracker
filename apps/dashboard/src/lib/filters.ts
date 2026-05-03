export type Period = "today" | "week" | "month" | "all";
export type Currency = "USD" | "BRL";

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  week: "Semana",
  month: "Mês",
  all: "Tudo",
};

export function periodCutoffMs(period: Period, now = Date.now()): number {
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case "week":
      return now - 7 * 86400000;
    case "month":
      return now - 30 * 86400000;
    case "all":
      return 0;
  }
}

export function parsePeriod(value: string | undefined | null, fallback: Period = "month"): Period {
  if (value === "today" || value === "week" || value === "month" || value === "all") return value;
  return fallback;
}

export function parseCurrency(value: string | undefined | null, fallback: Currency = "USD"): Currency {
  return value === "BRL" ? "BRL" : fallback;
}
