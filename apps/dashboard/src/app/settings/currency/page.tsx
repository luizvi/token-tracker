export const dynamic = "force-dynamic";

import { schema } from "@tracker/db";
import { getDb } from "@/lib/db";
import { desc } from "drizzle-orm";

export default function CurrencyPage() {
  const db = getDb();
  const rows = db.select().from(schema.currencyRates).orderBy(desc(schema.currencyRates.date)).limit(60).all();
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Cotação USD-BRL</h2>
      <table className="w-full text-sm font-mono card">
        <thead className="text-text-muted text-xs">
          <tr>
            <th className="p-2 text-left">Data</th>
            <th className="p-2 text-right">USD-BRL</th>
            <th className="p-2 text-left">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-t border-border">
              <td className="p-2">{r.date}</td>
              <td className="p-2 text-right">{r.usdBrl.toFixed(4)}</td>
              <td className="p-2">{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
