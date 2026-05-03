import Link from "next/link";

export function ClientCard({ data }: {
  data: { clientId: string; clientName: string; billableHours: number; hourLimit: number | null; hourLimitPeriod: string | null };
}) {
  const pct = data.hourLimit ? Math.min(100, (data.billableHours / data.hourLimit) * 100) : 0;
  const overLimit = data.hourLimit !== null && data.billableHours > data.hourLimit;

  return (
    <Link href={`/clients/${data.clientId}`} className="card p-4 block hover:border-hover transition">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold">{data.clientName}</h3>
        {data.hourLimit === null && <span className="chip bg-bg-tertiary text-text-muted">Ilimitado</span>}
      </div>
      <p className="text-2xl font-mono mt-2">
        {data.billableHours.toFixed(1)}h
        {data.hourLimit !== null && <span className="text-sm text-text-muted"> / {data.hourLimit}h</span>}
      </p>
      {data.hourLimit !== null && (
        <div className="mt-2 h-2 bg-bg-tertiary rounded overflow-hidden">
          <div className={`h-full ${overLimit ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }}></div>
        </div>
      )}
      {data.hourLimitPeriod && <p className="text-xs text-text-muted mt-1">por {data.hourLimitPeriod}</p>}
    </Link>
  );
}
