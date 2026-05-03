export const dynamic = "force-dynamic";

import { listAllPricing } from "@tracker/db";
import { getDb } from "@/lib/db";

export default async function PricingPage() {
  const rows = listAllPricing(getDb());
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Pricing</h2>
      <table className="w-full text-sm font-mono card">
        <thead className="text-text-muted text-xs">
          <tr>
            <th className="p-2 text-left">Modelo</th>
            <th className="p-2 text-right">Input/M</th>
            <th className="p-2 text-right">Output/M</th>
            <th className="p-2 text-right">Cache R/M</th>
            <th className="p-2 text-left">Valid from</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-2">{r.model}</td>
              <td className="p-2 text-right">${r.inputPerMtok.toFixed(2)}</td>
              <td className="p-2 text-right">${r.outputPerMtok.toFixed(2)}</td>
              <td className="p-2 text-right">${r.cacheReadPerMtok.toFixed(2)}</td>
              <td className="p-2">{new Date(r.validFrom).toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
