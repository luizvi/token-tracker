import Link from "next/link";
import { formatDuration, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/filters";

interface TopTask {
  id: string;
  title: string;
  projectName: string;
  billableHours: number;
  durationSec: number;
  costUsd: number;
  links: string | null;
}

interface ParsedLink { kind: string; url: string; label?: string }

const KIND_EMOJI: Record<string, string> = {
  github: "🐙", jira: "🟦", linear: "📐", other: "🔗",
};

function parseLinks(raw: string | null): ParsedLink[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as ParsedLink[]; } catch { return []; }
}

export function TopTasksList({
  tasks,
  currency,
  rate,
}: {
  tasks: TopTask[];
  currency: Currency;
  rate: number;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-text-secondary">Top tarefas no período</h3>
        <Link href="/tasks" className="text-xs text-accent hover:underline">ver todas →</Link>
      </div>
      <ul className="space-y-1">
        {tasks.map((t) => {
          const links = parseLinks(t.links);
          return (
            <li key={t.id}>
              <div className="card p-3 text-sm flex items-center gap-3 hover:border-hover transition-colors">
                <Link href={`/tasks/${t.id}`} className="font-mono truncate flex-1 hover:text-accent">
                  {t.title || "(sem título)"}
                </Link>
                {links.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {links.slice(0, 3).map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] hover:text-accent"
                        title={l.url}
                      >
                        {KIND_EMOJI[l.kind] ?? "🔗"}
                      </a>
                    ))}
                  </div>
                )}
                <span className="text-[11px] text-text-muted truncate max-w-[140px]">{t.projectName}</span>
                <span className="text-xs font-mono text-accent w-16 text-right">{t.billableHours.toFixed(1)}h fat.</span>
                <span className="text-xs font-mono text-text-muted w-20 text-right">{formatDuration(t.durationSec)}</span>
                <span className="text-xs font-mono text-text-muted w-16 text-right">
                  {formatMoney(t.costUsd, currency, rate)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
