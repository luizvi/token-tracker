export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTaskById, getSessionById, listProjects, getClientById, listClients } from "@tracker/db";
import { getDb } from "@/lib/db";
import { getUsdBrlRate } from "@/lib/currency-rate";
import { formatMoney, formatDuration, formatTokens, formatRelativeTime } from "@/lib/format";
import { parseCurrency } from "@/lib/filters";
import { notFound } from "next/navigation";
import { readTaskMessages } from "@/lib/transcript";
import { TranscriptViewer, type TranscriptMessageView } from "@/components/transcript-viewer";
import { TaskActions } from "@/components/task-actions";

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ currency?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const currency = parseCurrency(sp.currency);
  const rate = getUsdBrlRate();

  const db = getDb();
  const task = getTaskById(db, id);
  if (!task) notFound();
  const session = getSessionById(db, task.sessionId);
  const projects = listProjects(db);
  const project = projects.find((p) => p.id === task.projectId);
  const clients = listClients(db);
  const client = task.clientId ? getClientById(db, task.clientId) : null;

  let messages: TranscriptMessageView[] = [];
  if (session?.jsonlPath) {
    const raw = await readTaskMessages(session.jsonlPath, task.firstMessageUuid, task.lastMessageUuid, 500);
    messages = raw.map((m) => ({
      uuid: m.uuid,
      role: m.role,
      timestampMs: m.timestampMs,
      text: m.text,
      model: m.model,
      tokens: m.tokens,
    }));
  }

  const userMsgsCount = messages.filter((m) => m.role === "user").length;
  const assistantMsgsCount = messages.filter((m) => m.role === "assistant").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              task.status === "open" ? "bg-accent" : task.status === "paused" ? "bg-warning" : "bg-text-muted"
            }`}
            title={task.status}
          />
          <h2 className="text-2xl font-semibold flex-1 min-w-0">{task.title}</h2>
          {task.category === "system" && (
            <span className="chip bg-bg-tertiary text-warning border border-warning/30">apps & plugins</span>
          )}
          {task.isBackfilled && (
            <span className="chip bg-bg-tertiary text-text-muted">backfilled</span>
          )}
          {task.refinedByHaiku && (
            <span className="chip bg-accent/10 text-accent border border-accent/30">refinado</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {project && (
            <Link href={`/projects/${project.id}`} className="hover:text-accent">
              📁 {project.name}
            </Link>
          )}
          {client ? (
            <Link href={`/clients/${client.id}`} className="hover:text-accent">
              👤 {client.name}
            </Link>
          ) : (
            <span>sem cliente</span>
          )}
          <span>iniciada {formatRelativeTime(task.startedAt)}</span>
          {task.endedAt && <span>encerrada {formatRelativeTime(task.endedAt)}</span>}
          <span className="font-mono">conf {task.confidence.toFixed(2)}</span>
        </div>
        {task.description && <p className="text-sm text-text-secondary">{task.description}</p>}
      </div>

      <TaskActions task={task} clients={clients} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3">
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Custo</p>
          <p className="font-mono text-lg mt-0.5">{formatMoney(task.costUsd, currency, rate)}</p>
        </div>
        <div className="card p-3">
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Tempo Claude</p>
          <p className="font-mono text-lg mt-0.5">{formatDuration(task.timeTotalSeconds)}</p>
        </div>
        <div className="card p-3">
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Horas humanas</p>
          <p className="font-mono text-lg mt-0.5">
            {task.humanHoursEstimate !== null ? `${task.humanHoursEstimate.toFixed(2)}h` : "—"}
            <span className="text-[10px] text-text-muted ml-1">({task.humanHoursSource})</span>
          </p>
        </div>
        <div className="card p-3">
          <p className="text-text-muted text-[10px] uppercase tracking-wide">Faturáveis</p>
          <p className="font-mono text-lg mt-0.5">
            {task.billableHours !== null ? `${task.billableHours.toFixed(2)}h` : "—"}
            {task.billableHoursLocked && <span className="ml-1 text-warning">🔒</span>}
          </p>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Tokens & modelo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-mono">
          <div>
            <p className="text-text-muted text-[10px] uppercase">Input</p>
            <p>{formatTokens(task.tokensInput)}</p>
          </div>
          <div>
            <p className="text-text-muted text-[10px] uppercase">Output</p>
            <p>{formatTokens(task.tokensOutput)}</p>
          </div>
          <div>
            <p className="text-text-muted text-[10px] uppercase">Cache read</p>
            <p>{formatTokens(task.tokensCacheRead)}</p>
          </div>
          <div>
            <p className="text-text-muted text-[10px] uppercase">Cache creation</p>
            <p>{formatTokens(task.tokensCacheCreation)}</p>
          </div>
        </div>
        <div className="text-xs text-text-muted pt-2 border-t border-border">
          modelo principal: <span className="font-mono text-text-primary">{task.primaryModel ?? "—"}</span>
          {task.modelsUsed && (
            <>
              <span className="ml-3">todos:</span>{" "}
              <span className="font-mono text-text-primary">
                {(JSON.parse(task.modelsUsed) as string[]).join(", ")}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Tempos derivados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-mono">
          <div>
            <p className="text-text-muted text-[10px] uppercase">Input</p>
            <p>{formatDuration(task.timeInputSeconds)}</p>
          </div>
          <div>
            <p className="text-text-muted text-[10px] uppercase">Proc + output</p>
            <p>{formatDuration(task.timeProcessingOutputSeconds)}</p>
          </div>
          <div>
            <p className="text-text-muted text-[10px] uppercase">Leitura</p>
            <p>{formatDuration(task.timeReadingSeconds)}</p>
          </div>
          <div>
            <p className="text-text-muted text-[10px] uppercase">Total</p>
            <p>{formatDuration(task.timeTotalSeconds)}</p>
          </div>
        </div>
      </div>

      {task.humanHoursReasoning && (
        <div className="card p-4 text-sm">
          <p className="text-text-muted text-xs uppercase tracking-wide mb-2">
            Reasoning {task.humanHoursSource === "haiku" ? "(Haiku)" : ""}
          </p>
          <p>{task.humanHoursReasoning}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold">Transcript</h3>
          <p className="text-xs text-text-muted">
            {messages.length} mensagens ({userMsgsCount} user · {assistantMsgsCount} assistant)
          </p>
        </div>
        <TranscriptViewer messages={messages} />
      </div>
    </div>
  );
}
