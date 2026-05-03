"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUsd, formatDuration, formatRelativeTime, formatTokens } from "@/lib/format";

interface Task {
  id: string;
  title: string;
  status: string;
  projectId: string;
  clientId: string | null;
  startedAt: number;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  timeTotalSeconds: number;
  humanHoursEstimate: number | null;
  humanHoursSource: string;
  billableHours: number | null;
  billableHoursLocked: boolean;
  isBackfilled: boolean;
  confidence: number;
}

export function TaskTable() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!cancelled) { setTasks(data.tasks); setLoading(false); }
    }
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (loading) return <p className="text-text-muted">Carregando...</p>;
  if (tasks.length === 0) return <p className="text-text-muted">Nenhuma task</p>;

  return (
    <table className="w-full text-sm font-mono">
      <thead className="text-text-muted text-xs uppercase border-b border-border">
        <tr>
          <th className="text-left py-2 px-2">Status</th>
          <th className="text-left py-2 px-2">Title</th>
          <th className="text-left py-2 px-2">Tokens</th>
          <th className="text-left py-2 px-2">Cost</th>
          <th className="text-left py-2 px-2">Time</th>
          <th className="text-left py-2 px-2">Billable</th>
          <th className="text-left py-2 px-2">Started</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id} className={`border-b border-border hover:bg-bg-card-hover ${t.isBackfilled ? "opacity-60" : ""}`}>
            <td className="py-2 px-2">
              <span className={`w-2 h-2 inline-block rounded-full ${
                t.status === "open" ? "bg-accent" : t.status === "paused" ? "bg-warning" : "bg-text-muted"
              }`}></span>
            </td>
            <td className="py-2 px-2"><Link href={`/tasks/${t.id}`} className="hover:text-accent">{t.title}</Link></td>
            <td className="py-2 px-2">{formatTokens(t.tokensInput + t.tokensOutput)}</td>
            <td className="py-2 px-2">{formatUsd(t.costUsd)}</td>
            <td className="py-2 px-2">{formatDuration(t.timeTotalSeconds)}</td>
            <td className="py-2 px-2">
              {t.billableHours !== null ? `${t.billableHours.toFixed(1)}h${t.billableHoursLocked ? " 🔒" : ""}` : "-"}
            </td>
            <td className="py-2 px-2 text-text-muted">{formatRelativeTime(t.startedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
