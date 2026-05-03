"use client";
import { useState } from "react";

export function InsightsCard() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cached, setCached] = useState<{ ageSec: number } | null>(null);

  async function run(force = false) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/insights${force ? "?force=1" : ""}`);
      const raw = await res.text();
      let data: { insights?: string; model?: string; error?: string; cached?: boolean; cacheAgeSeconds?: number } = {};
      if (raw) {
        try { data = JSON.parse(raw); } catch { data = { error: raw.slice(0, 200) }; }
      }
      if (!res.ok) {
        setErr(data.error ?? `HTTP ${res.status}`);
      } else {
        setText(data.insights ?? "");
        setModel(data.model ?? null);
        setCached(data.cached ? { ageSec: data.cacheAgeSeconds ?? 0 } : null);
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-text-secondary">Insights IA — últimos 30 dias</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {cached && (
            <span className="text-[10px] text-text-muted font-mono" title="reaproveitado do cache para evitar rate limit">
              cache {cached.ageSec}s
            </span>
          )}
          {model && <span className="text-[10px] text-text-muted font-mono">{model}</span>}
          {text && (
            <button
              onClick={() => run(true)}
              disabled={loading}
              className="text-xs px-2 py-1 border border-border rounded hover:border-hover hover:text-accent disabled:opacity-50"
              title="ignora cache e chama o modelo de novo"
            >
              ↻ forçar
            </button>
          )}
          <button
            onClick={() => run(false)}
            disabled={loading}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {loading ? "Analisando..." : text ? "↻ regerar" : "✨ gerar insights"}
          </button>
        </div>
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
      {text && <InsightsRender text={text} />}
      {!text && !err && !loading && (
        <p className="text-xs text-text-muted">
          Clica em "gerar insights" pra a IA analisar sua carteira de clientes, identificar quem está acima/abaixo do esperado, e sugerir ajustes.
        </p>
      )}
    </div>
  );
}

/** Render leve de markdown: bullets `- ` e `**bold**` / `*italic*` / `` `code` ``. */
function InsightsRender({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return (
    <div className="text-sm leading-relaxed space-y-1.5">
      {lines.map((raw, i) => {
        const isBullet = raw.startsWith("- ") || raw.startsWith("* ");
        const content = isBullet ? raw.slice(2) : raw;
        return isBullet ? (
          <div key={i} className="flex gap-2">
            <span className="text-text-muted select-none mt-[2px]">•</span>
            <span className="flex-1"><InlineMd text={content} /></span>
          </div>
        ) : (
          <p key={i}><InlineMd text={content} /></p>
        );
      })}
    </div>
  );
}

function InlineMd({ text }: { text: string }) {
  // Tokeniza por **bold**, *italic*, `code`. Resto é texto cru.
  const parts: Array<{ kind: "text" | "bold" | "italic" | "code"; value: string }> = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: "text", value: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) parts.push({ kind: "bold", value: tok.slice(2, -2) });
    else if (tok.startsWith("`")) parts.push({ kind: "code", value: tok.slice(1, -1) });
    else parts.push({ kind: "italic", value: tok.slice(1, -1) });
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "bold") return <strong key={i} className="font-semibold text-text-primary">{p.value}</strong>;
        if (p.kind === "italic") return <em key={i} className="italic text-text-secondary">{p.value}</em>;
        if (p.kind === "code") return <code key={i} className="font-mono text-[12px] bg-bg-tertiary px-1 py-0.5 rounded">{p.value}</code>;
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}
