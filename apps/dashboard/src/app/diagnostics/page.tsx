export const dynamic = "force-dynamic";

import { listDaemonRuns } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format";

export default function DiagnosticsPage() {
  const runs = listDaemonRuns(getDb(), { limit: 100 });
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Diagnostics</h2>
      <table className="w-full text-sm font-mono card">
        <thead className="text-text-muted text-xs">
          <tr>
            <th className="p-2">Started</th>
            <th className="p-2">Kind</th>
            <th className="p-2">OK</th>
            <th className="p-2">Files</th>
            <th className="p-2">Tasks</th>
            <th className="p-2">Duration</th>
            <th className="p-2">Errors</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-2">{formatRelativeTime(r.startedAt)}</td>
              <td className="p-2">{r.kind}</td>
              <td className="p-2">{r.ok ? <span className="text-accent">✓</span> : <span className="text-danger">✗</span>}</td>
              <td className="p-2">{r.filesProcessed}/{r.filesScanned}</td>
              <td className="p-2">{r.tasksCreated}+{r.tasksUpdated}</td>
              <td className="p-2">{r.endedAt ? `${((r.endedAt - r.startedAt) / 1000).toFixed(2)}s` : "running"}</td>
              <td className="p-2 text-danger truncate max-w-xs">{r.errors ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
