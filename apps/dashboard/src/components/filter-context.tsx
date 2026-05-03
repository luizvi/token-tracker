"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import type { Period, Currency } from "@/lib/filters";
import { parsePeriod, parseCurrency } from "@/lib/filters";

const STORAGE_KEY = "lvtracker.filters";

interface StoredFilters {
  period: Period;
  currency: Currency;
}

export function useFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const period = parsePeriod(params.get("period"));
  const currency = parseCurrency(params.get("currency"));

  // Hydrate from localStorage on first load if URL doesn't have filters
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (params.get("period") || params.get("currency")) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as StoredFilters;
      const next = new URLSearchParams(params.toString());
      if (stored.period) next.set("period", stored.period);
      if (stored.currency) next.set("currency", stored.currency);
      router.replace(`${pathname}?${next.toString()}`);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((p: Period, c: Currency) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ period: p, currency: c }));
  }, []);

  const setPeriod = useCallback(
    (p: Period) => {
      const next = new URLSearchParams(params.toString());
      next.set("period", p);
      persist(p, currency);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router, currency, persist],
  );

  const setCurrency = useCallback(
    (c: Currency) => {
      const next = new URLSearchParams(params.toString());
      next.set("currency", c);
      persist(period, c);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router, period, persist],
  );

  const setProjectFilter = useCallback(
    (projectId: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (projectId) next.set("project", projectId);
      else next.delete("project");
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const setClientFilter = useCallback(
    (clientId: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (clientId) next.set("client", clientId);
      else next.delete("client");
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  return {
    period,
    currency,
    project: params.get("project"),
    client: params.get("client"),
    setPeriod,
    setCurrency,
    setProjectFilter,
    setClientFilter,
  };
}
