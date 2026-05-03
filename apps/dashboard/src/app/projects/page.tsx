export const dynamic = "force-dynamic";

import Link from "next/link";
import { listProjects, listTasks } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatUsd, formatTokens } from "@/lib/format";

export default async function ProjectsPage() {
  const db = getDb();
  const projects = listProjects(db);

  const byProject = projects.map((p) => {
    const ts = listTasks(db, { projectId: p.id });
    return {
      ...p,
      taskCount: ts.length,
      totalCost: ts.reduce((s, t) => s + t.costUsd, 0),
      totalTokens: ts.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
    };
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Projetos</h2>
      <div className="grid grid-cols-3 gap-4">
        {byProject.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card p-4 block hover:border-hover transition">
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-xs text-text-muted mt-1">{p.slug}</p>
            <div className="mt-2 flex gap-4 text-sm font-mono">
              <span>{p.taskCount} tasks</span>
              <span>{formatUsd(p.totalCost)}</span>
              <span>{formatTokens(p.totalTokens)}</span>
            </div>
          </Link>
        ))}
        {byProject.length === 0 && <p className="text-text-muted col-span-3">Nenhum projeto</p>}
      </div>
    </div>
  );
}
