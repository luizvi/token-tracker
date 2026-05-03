import Link from "next/link";

export interface RenewalAlert {
  clientId: string;
  clientName: string;
  color: string | null;
  renewalAt: number;
  daysUntil: number;
  noticeDays: number;
}

function statusColor(daysUntil: number): string {
  if (daysUntil < 0) return "text-danger font-medium";
  if (daysUntil <= 7) return "text-danger font-medium";
  if (daysUntil <= 30) return "text-warning font-medium";
  return "text-text-secondary";
}

function statusLabel(daysUntil: number): string {
  if (daysUntil < 0) return `vencido há ${Math.abs(daysUntil)}d`;
  if (daysUntil === 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `em ${daysUntil} dias`;
}

export function ContractRenewals({ alerts }: { alerts: RenewalAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="card p-4 space-y-2 border border-warning/30 bg-warning/5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-warning">⏰ Renovações próximas</h3>
        <span className="text-[10px] text-text-muted">configure "avisar X dias antes" no cliente</span>
      </div>
      <ul className="space-y-1">
        {alerts.map((a) => (
          <li key={a.clientId}>
            <Link
              href={`/clients/${a.clientId}`}
              className="flex items-center gap-3 text-sm py-1 px-2 rounded hover:bg-bg-tertiary/30"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color ?? "#1fe879" }} />
              <span className="flex-1 truncate">{a.clientName}</span>
              <span className={`text-xs font-mono ${statusColor(a.daysUntil)}`}>{statusLabel(a.daysUntil)}</span>
              <span className="text-xs text-text-muted font-mono">{new Date(a.renewalAt).toLocaleDateString("pt-BR")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
