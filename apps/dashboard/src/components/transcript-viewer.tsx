"use client";
import { useState } from "react";

export interface TranscriptMessageView {
  uuid: string;
  role: string;
  timestampMs: number;
  text: string;
  model?: string | undefined;
  tokens?: { input: number; output: number; cacheRead: number; cacheCreation: number } | undefined;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function TranscriptViewer({ messages }: { messages: TranscriptMessageView[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  if (messages.length === 0) {
    return <p className="text-text-muted text-sm">Transcript indisponível (arquivo JSONL não encontrado ou vazio).</p>;
  }

  const visible = showAll ? messages : messages.slice(0, 30);

  function toggle(uuid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {visible.map((m) => {
        const isExpanded = expanded.has(m.uuid);
        const isUser = m.role === "user";
        const isSystem = m.role === "system";
        const preview = m.text.split("\n").slice(0, 2).join(" ").trim();
        return (
          <div
            key={m.uuid}
            className={`card p-3 transition-colors ${
              isUser ? "border-l-2 border-l-accent" : isSystem ? "border-l-2 border-l-warning opacity-70" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(m.uuid)}
              className="w-full flex items-start gap-3 text-left"
            >
              <div className="flex-shrink-0 mt-0.5">
                <span
                  className={`chip text-[10px] ${
                    isUser
                      ? "bg-accent/10 text-accent border border-accent/30"
                      : isSystem
                        ? "bg-bg-tertiary text-warning"
                        : "bg-bg-tertiary text-text-secondary"
                  }`}
                >
                  {m.role}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-sm">
                <p className={`whitespace-pre-wrap break-words ${isExpanded ? "" : "font-mono"}`}>
                  {isExpanded ? m.text : truncate(preview, 200)}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted font-mono">
                  <span>{formatTime(m.timestampMs)}</span>
                  {m.model && <span>{m.model}</span>}
                  {m.tokens && (
                    <span>
                      tk: {m.tokens.input}/{m.tokens.output}
                      {m.tokens.cacheRead > 0 ? ` (+${m.tokens.cacheRead} cache)` : ""}
                    </span>
                  )}
                  <span className="ml-auto text-text-muted">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>
            </button>
          </div>
        );
      })}
      {messages.length > 30 && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-accent hover:underline"
          >
            {showAll ? "mostrar primeiras 30" : `ler na íntegra (${messages.length - 30} restantes)`}
          </button>
        </div>
      )}
    </div>
  );
}
