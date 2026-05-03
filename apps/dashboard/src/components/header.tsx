"use client";
import { useState } from "react";

export function Header() {
  const [period, setPeriod] = useState("week");
  const [currency, setCurrency] = useState<"USD" | "BRL">("USD");

  return (
    <header className="sticky top-0 bg-bg-primary border-b border-border z-10 px-6 py-3 flex items-center gap-4">
      <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="bg-bg-card border border-border rounded px-2 py-1 text-sm">
        <option value="today">Hoje</option>
        <option value="week">Semana</option>
        <option value="month">Mês</option>
      </select>
      <button onClick={() => setCurrency(currency === "USD" ? "BRL" : "USD")}
              className="text-sm font-mono text-text-secondary px-2 py-1 border border-border rounded hover:border-hover">
        {currency}
      </button>
      <input type="search" placeholder="Buscar..."
             className="ml-auto bg-bg-card border border-border rounded px-3 py-1 text-sm w-64" />
    </header>
  );
}
