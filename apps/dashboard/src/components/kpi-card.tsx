export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-mono mt-1 text-text-primary">{value}</p>
      {hint && <p className="text-xs text-text-secondary mt-1">{hint}</p>}
    </div>
  );
}
