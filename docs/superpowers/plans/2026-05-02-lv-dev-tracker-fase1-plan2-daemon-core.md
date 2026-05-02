# LV Dev Tracker Fase 1 — Plan 2: Daemon Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o daemon de ingestão: lê os JSONLs do Claude Code, detecta fronteiras de tarefa heuristicamente, calcula tokens/custo/tempo, persiste em SQLite, atualiza cotação USD-BRL diariamente e suporta recálculo em massa após mudança de settings.

**Architecture:** `apps/daemon` é um Node service longo-vivo. Loop principal a cada 60s: DISCOVER → INGEST (deltas dos JSONLs via `TranscriptSource`) → DETECT (heurística sobre buffers de sessão) → PRICE/BILL → CURRENCY (1×/dia) → CLOSE-IDLE → LOG. Comunica-se com o dashboard via SQLite compartilhado e (opcionalmente) socket UNIX para triggers de recálculo. Sem Haiku ainda — isso fica no Plan 3.

**Tech Stack:** Node ≥20, TypeScript estrito, `@tracker/shared`, `@tracker/db`, fast-glob, undici (HTTP), Vitest.

**Source spec:** `docs/superpowers/specs/2026-05-02-lv-dev-tracker-design.md` §6 (Fluxo de dados) e §11 (Observabilidade).

**Depends on:** Plan 1 (Foundation) completo.

**Chain:** Após Plan 2, segue Plan 3 (Daemon AI + CLI) → Plan 4 (Dashboard) → Plan 5 (Infra + Smoke).

---

## File Structure (criada/modificada por este plano)

```
/Users/luiz/dev/tracker/
├── apps/
│   └── daemon/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts                       # Entry — boot + scheduler
│           ├── config.ts                      # Env loader (ANTHROPIC_API_KEY, paths)
│           ├── logger.ts                      # Append-only logging para data/logs/
│           ├── scheduler.ts                   # Loop principal 60s + jobs nightly
│           ├── ingestor/
│           │   ├── claude-code-source.ts      # Implementa TranscriptSource
│           │   ├── claude-code-source.test.ts
│           │   ├── jsonl-parser.ts            # Parse linha JSONL → TranscriptMessage
│           │   ├── jsonl-parser.test.ts
│           │   └── ingestor.ts                # Orquestra discover + read delta + persist sessions
│           │   └── ingestor.test.ts
│           ├── detector/
│           │   ├── boundary.ts                # Heurística de fronteira (resume/topic/skill/jaccard)
│           │   ├── boundary.test.ts
│           │   └── detector.ts                # Aplica boundary sobre buffer de mensagens, atualiza tasks
│           │   └── detector.test.ts
│           ├── pricing/
│           │   ├── pricer.ts                  # Aplica model_pricing → cost_usd na task
│           │   └── pricer.test.ts
│           ├── biller/
│           │   ├── biller.ts                  # Calcula billable_hours (depende de human_hours_estimate)
│           │   └── biller.test.ts
│           ├── currency/
│           │   ├── awesomeapi.ts              # Fetch USD-BRL
│           │   ├── awesomeapi.test.ts
│           │   └── updater.ts                 # Job diário + backfill 365d
│           │   └── updater.test.ts
│           ├── recalc/
│           │   ├── recalc.ts                  # Recálculo em massa após mudança de settings/pricing
│           │   └── recalc.test.ts
│           ├── close-idle/
│           │   ├── close-idle.ts              # Fecha tasks open inativas
│           │   └── close-idle.test.ts
│           ├── runs.ts                        # Wrap startDaemonRun/finishDaemonRun
│           └── time.ts                        # Helpers: formatDate(YYYY-MM-DD em BRT), nowMs
```

**Convenções:**
- Tests rodam com Vitest, `:memory:` SQLite por arquivo de teste.
- HTTP via `undici` (built-in + tipado).
- Glob via `fast-glob`.
- Daemon não escreve nos JSONLs — read-only.

---

## Milestone M4 — TranscriptSource Concreto

### Task 28: Inicializar `apps/daemon`

**Files:**
- Create: `apps/daemon/package.json`
- Create: `apps/daemon/tsconfig.json`
- Create: `apps/daemon/vitest.config.ts`
- Create: `apps/daemon/src/index.ts` (placeholder)

- [ ] **Step 1: Criar `apps/daemon/package.json`**

```json
{
  "name": "@tracker/daemon",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@tracker/db": "workspace:*",
    "@tracker/shared": "workspace:*",
    "fast-glob": "^3.3.2",
    "undici": "^7.0.0"
  },
  "devDependencies": {
    "@tracker/config": "workspace:*",
    "@types/node": "^20.17.10",
    "tsx": "^4.19.2",
    "typescript": "^5.6.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Criar `apps/daemon/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Criar `apps/daemon/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@tracker/daemon",
    include: ["src/**/*.test.ts"],
    environment: "node",
    pool: "forks",
  },
});
```

- [ ] **Step 4: Placeholder `src/index.ts`**

```typescript
console.log("@tracker/daemon — boot stub");
```

- [ ] **Step 5: Install + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm install
git add apps/daemon pnpm-lock.yaml
git commit -m "feat(daemon): inicializa apps/daemon com deps (fast-glob, undici)"
```

---

### Task 29: `time.ts` — helpers de tempo (BRT, dates)

**Files:**
- Create: `apps/daemon/src/time.ts`
- Create: `apps/daemon/src/time.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it } from "vitest";
import { formatDateBrt, isInNightWindow, nowMs } from "./time.js";

describe("time helpers", () => {
  it("formatDateBrt converte epoch ms para 'YYYY-MM-DD' em horário BRT", () => {
    // 2026-05-02T03:00:00Z = 2026-05-02 00:00 BRT (UTC-3)
    const utcMs = Date.UTC(2026, 4, 2, 3, 0, 0);
    expect(formatDateBrt(utcMs)).toBe("2026-05-02");
  });

  it("isInNightWindow retorna true para 23h-09h", () => {
    const utcMs23 = Date.UTC(2026, 4, 3, 2, 0, 0); // 23:00 BRT do dia 2
    const utcMs03 = Date.UTC(2026, 4, 2, 6, 0, 0); // 03:00 BRT
    const utcMs10 = Date.UTC(2026, 4, 2, 13, 0, 0); // 10:00 BRT
    expect(isInNightWindow(utcMs23, 23, 9)).toBe(true);
    expect(isInNightWindow(utcMs03, 23, 9)).toBe(true);
    expect(isInNightWindow(utcMs10, 23, 9)).toBe(false);
  });

  it("nowMs retorna número crescente", () => {
    const a = nowMs();
    const b = nowMs();
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
const BRT_OFFSET_HOURS = -3;

export function nowMs(): number {
  return Date.now();
}

export function formatDateBrt(epochMs: number): string {
  const adjusted = new Date(epochMs + BRT_OFFSET_HOURS * 3600 * 1000);
  const yyyy = adjusted.getUTCFullYear();
  const mm = String(adjusted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(adjusted.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isInNightWindow(epochMs: number, startHour: number, endHour: number): boolean {
  const adjusted = new Date(epochMs + BRT_OFFSET_HOURS * 3600 * 1000);
  const h = adjusted.getUTCHours();
  if (startHour > endHour) return h >= startHour || h < endHour;
  return h >= startHour && h < endHour;
}
```

- [ ] **Step 3: Run test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test time
git add apps/daemon/src/time.ts apps/daemon/src/time.test.ts
git commit -m "feat(daemon): helpers de tempo BRT e janela noturna"
```

---

### Task 30: `jsonl-parser.ts` — parse linha JSONL

**Files:**
- Create: `apps/daemon/src/ingestor/jsonl-parser.ts`
- Create: `apps/daemon/src/ingestor/jsonl-parser.test.ts`

O Claude Code grava no JSONL formato com várias `type` possíveis: `last-prompt`, `permission-mode`, `system`, `user`, `assistant`. Mensagens user/assistant têm metadados de tokens. Vamos parsear e ignorar tipos irrelevantes.

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it } from "vitest";
import { parseJsonlLine } from "./jsonl-parser.js";

describe("parseJsonlLine", () => {
  it("ignora linhas que não são user/assistant", () => {
    expect(parseJsonlLine('{"type":"last-prompt","leafUuid":"x"}')).toBeNull();
    expect(parseJsonlLine('{"type":"permission-mode","permissionMode":"x"}')).toBeNull();
    expect(parseJsonlLine('{"type":"system","content":"x"}')).toBeNull();
  });

  it("parseia mensagem user com text content", () => {
    const line = JSON.stringify({
      type: "user",
      uuid: "u-1",
      timestamp: "2026-05-02T15:30:00Z",
      message: { role: "user", content: "Olá" },
    });
    const msg = parseJsonlLine(line);
    expect(msg?.role).toBe("user");
    expect(msg?.uuid).toBe("u-1");
    expect(msg?.text).toBe("Olá");
    expect(msg?.timestampMs).toBe(Date.parse("2026-05-02T15:30:00Z"));
  });

  it("parseia mensagem assistant com tokens e modelo", () => {
    const line = JSON.stringify({
      type: "assistant",
      uuid: "a-1",
      timestamp: "2026-05-02T15:31:00Z",
      message: {
        role: "assistant",
        model: "claude-opus-4-7",
        content: [{ type: "text", text: "Oi!" }],
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          cache_read_input_tokens: 500,
          cache_creation_input_tokens: 50,
        },
      },
    });
    const msg = parseJsonlLine(line);
    expect(msg?.role).toBe("assistant");
    expect(msg?.text).toBe("Oi!");
    expect(msg?.model).toBe("claude-opus-4-7");
    expect(msg?.tokens).toEqual({ input: 100, output: 20, cacheRead: 500, cacheCreation: 50 });
  });

  it("retorna null para linhas malformadas", () => {
    expect(parseJsonlLine("{")).toBeNull();
    expect(parseJsonlLine("not-json")).toBeNull();
    expect(parseJsonlLine("")).toBeNull();
  });

  it("extrai tool_uses de assistant content array", () => {
    const line = JSON.stringify({
      type: "assistant",
      uuid: "a-2",
      timestamp: "2026-05-02T15:32:00Z",
      message: {
        role: "assistant",
        model: "claude-sonnet-4-6",
        content: [
          { type: "text", text: "Vou rodar o teste." },
          { type: "tool_use", name: "Bash", input: { command: "pnpm test" } },
        ],
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    });
    const msg = parseJsonlLine(line);
    expect(msg?.toolUses).toEqual([{ name: "Bash", input: { command: "pnpm test" } }]);
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import type { TranscriptMessage } from "@tracker/shared";

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
}

export function parseJsonlLine(line: string): TranscriptMessage | null {
  if (!line || line.length < 2) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }

  const type = obj["type"];
  if (type !== "user" && type !== "assistant") return null;

  const uuid = obj["uuid"];
  const timestamp = obj["timestamp"];
  const message = obj["message"] as Record<string, unknown> | undefined;
  if (typeof uuid !== "string" || typeof timestamp !== "string" || !message) return null;

  const role = message["role"];
  if (role !== "user" && role !== "assistant") return null;

  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) return null;

  let text = "";
  const toolUses: Array<{ name: string; input: unknown }> = [];
  const content = message["content"];
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    const blocks = content as ContentBlock[];
    for (const b of blocks) {
      if (b.type === "text" && typeof b.text === "string") text += b.text;
      else if (b.type === "tool_use" && b.name) toolUses.push({ name: b.name, input: b.input });
    }
  }

  const usage = message["usage"] as Record<string, number> | undefined;
  const model = message["model"];

  const out: TranscriptMessage = {
    uuid,
    role,
    timestampMs: ts,
    text,
  };

  if (typeof model === "string") out.model = model;
  if (toolUses.length > 0) out.toolUses = toolUses;
  if (usage) {
    out.tokens = {
      input: Number(usage["input_tokens"] ?? 0),
      output: Number(usage["output_tokens"] ?? 0),
      cacheRead: Number(usage["cache_read_input_tokens"] ?? 0),
      cacheCreation: Number(usage["cache_creation_input_tokens"] ?? 0),
    };
  }

  return out;
}
```

- [ ] **Step 3: Run test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test jsonl-parser
git add apps/daemon/src/ingestor/jsonl-parser.ts apps/daemon/src/ingestor/jsonl-parser.test.ts
git commit -m "feat(daemon): parser de linha JSONL do Claude Code"
```

---

### Task 31: `ClaudeCodeJsonlSource` (TranscriptSource concreto)

**Files:**
- Create: `apps/daemon/src/ingestor/claude-code-source.ts`
- Create: `apps/daemon/src/ingestor/claude-code-source.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeCodeJsonlSource } from "./claude-code-source.js";

let testDir: string;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "tracker-source-"));
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("ClaudeCodeJsonlSource.listFiles", () => {
  it("descobre todos os .jsonl em <root>/<project>/<uuid>.jsonl", async () => {
    mkdirSync(join(testDir, "-Users-luiz-dev-csp"), { recursive: true });
    mkdirSync(join(testDir, "-Users-luiz-dev-sinusal-sinusal-legado"), { recursive: true });
    writeFileSync(join(testDir, "-Users-luiz-dev-csp", "abc.jsonl"), "");
    writeFileSync(join(testDir, "-Users-luiz-dev-sinusal-sinusal-legado", "xyz.jsonl"), "");
    writeFileSync(join(testDir, "-Users-luiz-dev-csp", "abc.json"), ""); // ignorado

    const src = new ClaudeCodeJsonlSource(testDir);
    const files = await src.listFiles();
    expect(files).toHaveLength(2);
    expect(files.find((f) => f.sessionId === "abc")?.projectDir).toContain("csp");
    expect(files.find((f) => f.sessionId === "xyz")?.projectDir).toContain("sinusal");
  });

  it("retorna size e mtime corretos", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "uuid.jsonl");
    writeFileSync(file, "hello\n");

    const src = new ClaudeCodeJsonlSource(testDir);
    const files = await src.listFiles();
    expect(files[0]!.sizeBytes).toBe(6);
    expect(files[0]!.mtimeMs).toBeGreaterThan(0);
  });
});

describe("ClaudeCodeJsonlSource.readDelta", () => {
  it("lê todas as mensagens válidas a partir de offset 0", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "uuid.jsonl");
    const lines = [
      JSON.stringify({ type: "last-prompt", leafUuid: "x" }),
      JSON.stringify({
        type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "Oi" },
      }),
      JSON.stringify({
        type: "assistant", uuid: "a1", timestamp: "2026-05-02T10:00:05Z",
        message: { role: "assistant", model: "claude-sonnet-4-6", content: [{ type: "text", text: "Olá!" }],
          usage: { input_tokens: 5, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
      }),
    ];
    writeFileSync(path, lines.join("\n") + "\n");

    const src = new ClaudeCodeJsonlSource(testDir);
    const files = await src.listFiles();
    const delta = await src.readDelta(files[0]!, 0);
    expect(delta.messages).toHaveLength(2); // ignora last-prompt
    expect(delta.messages[0]!.uuid).toBe("u1");
    expect(delta.messages[1]!.uuid).toBe("a1");
    expect(delta.toOffset).toBe(files[0]!.sizeBytes);
  });

  it("lê apenas o delta a partir do offset informado", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "uuid.jsonl");
    const line1 = JSON.stringify({
      type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
      message: { role: "user", content: "Primeira" },
    });
    const line2 = JSON.stringify({
      type: "user", uuid: "u2", timestamp: "2026-05-02T10:00:10Z",
      message: { role: "user", content: "Segunda" },
    });
    writeFileSync(path, line1 + "\n" + line2 + "\n");

    const src = new ClaudeCodeJsonlSource(testDir);
    const files = await src.listFiles();
    const offsetAfterFirst = Buffer.byteLength(line1 + "\n", "utf8");
    const delta = await src.readDelta(files[0]!, offsetAfterFirst);
    expect(delta.messages).toHaveLength(1);
    expect(delta.messages[0]!.uuid).toBe("u2");
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import { stat, readFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import fg from "fast-glob";
import type { TranscriptDelta, TranscriptFileInfo, TranscriptSource } from "@tracker/shared";
import { parseJsonlLine } from "./jsonl-parser.js";

export class ClaudeCodeJsonlSource implements TranscriptSource {
  readonly name = "claude-code-jsonl";

  constructor(private readonly rootDir: string) {}

  async listFiles(): Promise<TranscriptFileInfo[]> {
    const matches = await fg("*/*.jsonl", { cwd: this.rootDir, absolute: true, suppressErrors: true });
    const out: TranscriptFileInfo[] = [];
    for (const path of matches) {
      const s = await stat(path);
      const sessionId = basename(path, extname(path));
      const projectDir = basename(dirname(path));
      out.push({
        path,
        sessionId,
        projectDir,
        sizeBytes: s.size,
        mtimeMs: s.mtimeMs,
      });
    }
    return out;
  }

  async readDelta(file: TranscriptFileInfo, fromOffset: number): Promise<TranscriptDelta> {
    const buf = await readFile(file.path);
    const slice = buf.subarray(fromOffset);
    const text = slice.toString("utf8");
    const messages = [];
    let consumed = fromOffset;
    let lineStart = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\n") {
        const line = text.slice(lineStart, i);
        const msg = parseJsonlLine(line);
        if (msg) messages.push(msg);
        consumed = fromOffset + Buffer.byteLength(text.slice(0, i + 1), "utf8");
        lineStart = i + 1;
      }
    }
    return {
      file,
      fromOffset,
      toOffset: consumed,
      messages,
    };
  }
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test claude-code-source
git add apps/daemon/src/ingestor/claude-code-source.ts apps/daemon/src/ingestor/claude-code-source.test.ts
git commit -m "feat(daemon): implementa ClaudeCodeJsonlSource (descoberta + leitura incremental)"
```

---

## Milestone M5 — Ingestor Orchestrator

### Task 32: `runs.ts` — wrapper de daemon_runs

**Files:**
- Create: `apps/daemon/src/runs.ts`
- Create: `apps/daemon/src/runs.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient, runMigrations, listDaemonRuns, type DbClient } from "@tracker/db";
import { withDaemonRun, type DaemonRunMetrics } from "./runs.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("withDaemonRun", () => {
  it("envolve trabalho com start+finish quando OK", async () => {
    await withDaemonRun(db, "tick", async (metrics) => {
      metrics.filesScanned = 3;
      metrics.tasksCreated = 1;
    });
    const runs = listDaemonRuns(db, { limit: 1 });
    expect(runs[0]!.ok).toBe(true);
    expect(runs[0]!.filesScanned).toBe(3);
    expect(runs[0]!.tasksCreated).toBe(1);
    close();
  });

  it("captura erros, marca ok=false e re-lança", async () => {
    await expect(withDaemonRun(db, "tick", async () => {
      throw new Error("boom");
    })).rejects.toThrow("boom");
    const runs = listDaemonRuns(db, { limit: 1 });
    expect(runs[0]!.ok).toBe(false);
    expect(JSON.parse(runs[0]!.errors!)[0].message).toBe("boom");
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import { startDaemonRun, finishDaemonRun, type DbClient } from "@tracker/db";

export interface DaemonRunMetrics {
  filesScanned: number;
  filesProcessed: number;
  tasksCreated: number;
  tasksUpdated: number;
}

export async function withDaemonRun<T>(
  db: DbClient,
  kind: string,
  work: (metrics: DaemonRunMetrics) => Promise<T>,
): Promise<T> {
  const id = startDaemonRun(db, kind);
  const metrics: DaemonRunMetrics = {
    filesScanned: 0,
    filesProcessed: 0,
    tasksCreated: 0,
    tasksUpdated: 0,
  };
  try {
    const result = await work(metrics);
    finishDaemonRun(db, id, { ...metrics, ok: true });
    return result;
  } catch (err) {
    const errObj = err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) };
    finishDaemonRun(db, id, { ...metrics, ok: false, errors: [errObj] });
    throw err;
  }
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test runs
git add apps/daemon/src/runs.ts apps/daemon/src/runs.test.ts
git commit -m "feat(daemon): wrapper withDaemonRun com captura de erros e métricas"
```

---

### Task 33: Logger simples

**Files:**
- Create: `apps/daemon/src/logger.ts`

- [ ] **Step 1: Implementação simples (sem TDD — wrapper sobre console)**

```typescript
type Level = "info" | "warn" | "error";

export interface Logger {
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

export function createLogger(prefix = "[daemon]"): Logger {
  const log = (level: Level) => (msg: string, meta?: unknown) => {
    const ts = new Date().toISOString();
    const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
    const line = `${ts} ${prefix} ${level.toUpperCase()} ${msg}${metaStr}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/daemon/src/logger.ts
git commit -m "feat(daemon): logger simples com timestamp e prefix"
```

---

### Task 34: `config.ts` — env loader

**Files:**
- Create: `apps/daemon/src/config.ts`
- Create: `apps/daemon/src/config.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it } from "vitest";
import { loadConfig, type DaemonConfig } from "./config.js";

describe("loadConfig", () => {
  it("usa defaults quando env vazio", () => {
    const cfg = loadConfig({ HOME: "/Users/luiz" });
    expect(cfg.claudeProjectsDir).toBe("/Users/luiz/.claude/projects");
    expect(cfg.dbPath.endsWith("data/tracker.db")).toBe(true);
    expect(cfg.tickIntervalMs).toBe(60_000);
    expect(cfg.anthropicApiKey).toBeUndefined();
  });

  it("respeita overrides", () => {
    const cfg = loadConfig({
      HOME: "/Users/luiz",
      CLAUDE_PROJECTS_DIR: "/custom/path",
      TRACKER_DB_PATH: "/custom/db.db",
      ANTHROPIC_API_KEY: "sk-ant-x",
      TRACKER_TICK_INTERVAL_MS: "30000",
    });
    expect(cfg.claudeProjectsDir).toBe("/custom/path");
    expect(cfg.dbPath).toBe("/custom/db.db");
    expect(cfg.anthropicApiKey).toBe("sk-ant-x");
    expect(cfg.tickIntervalMs).toBe(30_000);
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import { join } from "node:path";

export interface DaemonConfig {
  claudeProjectsDir: string;
  dbPath: string;
  trackerRoot: string;
  anthropicApiKey: string | undefined;
  tickIntervalMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv): DaemonConfig {
  const home = env["HOME"] ?? process.env["HOME"] ?? "";
  const trackerRoot = env["TRACKER_ROOT"] ?? join(home, "dev", "tracker");
  return {
    claudeProjectsDir: env["CLAUDE_PROJECTS_DIR"] ?? join(home, ".claude", "projects"),
    dbPath: env["TRACKER_DB_PATH"] ?? join(trackerRoot, "data", "tracker.db"),
    trackerRoot,
    anthropicApiKey: env["ANTHROPIC_API_KEY"],
    tickIntervalMs: Number(env["TRACKER_TICK_INTERVAL_MS"] ?? 60_000),
  };
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test config
git add apps/daemon/src/config.ts apps/daemon/src/config.test.ts
git commit -m "feat(daemon): config loader com overrides via env"
```

---

### Task 35: `ingestor.ts` — orquestrador de ingestão

**Files:**
- Create: `apps/daemon/src/ingestor/ingestor.ts`
- Create: `apps/daemon/src/ingestor/ingestor.test.ts`

Esse módulo agrupa: descobrir arquivos novos/modificados, criar/upsert sessions/projects, ler delta de cada um, retornar buffers de mensagens por sessão para o detector consumir.

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createClient as createDb, runMigrations, getSessionByJsonlPath,
  listProjects, type DbClient,
} from "@tracker/db";
import { ClaudeCodeJsonlSource } from "./claude-code-source.js";
import { ingestAllPending } from "./ingestor.js";

let testDir: string;
let db: DbClient;
let closeDb: () => void;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "tracker-ingest-"));
  const h = createDb(":memory:");
  db = h.db; closeDb = () => h.sqlite.close();
  runMigrations(db);
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  closeDb();
});

function writeJsonl(path: string, lines: object[]) {
  writeFileSync(path, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
}

describe("ingestAllPending", () => {
  it("descobre arquivos, cria projects/sessions e retorna buffers", async () => {
    const dir = join(testDir, "-Users-luiz-dev-csp");
    mkdirSync(dir, { recursive: true });
    writeJsonl(join(dir, "abc.jsonl"), [
      { type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "Olá" } },
      { type: "assistant", uuid: "a1", timestamp: "2026-05-02T10:00:05Z",
        message: {
          role: "assistant", model: "claude-sonnet-4-6",
          content: [{ type: "text", text: "Oi!" }],
          usage: { input_tokens: 5, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        }
      },
    ]);
    const source = new ClaudeCodeJsonlSource(testDir);
    const buffers = await ingestAllPending(db, source);
    expect(buffers).toHaveLength(1);
    expect(buffers[0]!.messages).toHaveLength(2);
    const projects = listProjects(db);
    expect(projects).toHaveLength(1);
    expect(projects[0]!.slug).toBe("csp");
    expect(getSessionByJsonlPath(db, join(dir, "abc.jsonl"))).not.toBeNull();
  });

  it("não re-processa arquivos sem delta (mesmo offset)", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    writeJsonl(join(dir, "x.jsonl"), [
      { type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "A" } },
    ]);
    const source = new ClaudeCodeJsonlSource(testDir);
    await ingestAllPending(db, source);
    const second = await ingestAllPending(db, source);
    expect(second).toHaveLength(0);
  });

  it("processa apenas o delta após reescrita", async () => {
    const dir = join(testDir, "-proj");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "x.jsonl");
    writeJsonl(file, [
      { type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "A" } },
    ]);
    const source = new ClaudeCodeJsonlSource(testDir);
    await ingestAllPending(db, source);

    // append nova linha
    const newLine = JSON.stringify({
      type: "user", uuid: "u2", timestamp: "2026-05-02T10:01:00Z",
      message: { role: "user", content: "B" },
    });
    const { appendFileSync } = await import("node:fs");
    appendFileSync(file, newLine + "\n");

    const second = await ingestAllPending(db, source);
    expect(second).toHaveLength(1);
    expect(second[0]!.messages).toHaveLength(1);
    expect(second[0]!.messages[0]!.uuid).toBe("u2");
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import {
  upsertProjectByCwdPath, upsertSession, updateSessionOffset,
  type DbClient,
} from "@tracker/db";
import type { TranscriptDelta, TranscriptSource } from "@tracker/shared";
import { getSessionByJsonlPath } from "@tracker/db";

function deriveProjectFromDir(projectDir: string): { slug: string; name: string; cwdPath: string } {
  // "-Users-luiz-dev-csp" → cwdPath="/Users/luiz/dev/csp"
  // slug = último segmento
  const cwdPath = projectDir.startsWith("-") ? projectDir.slice(1).replace(/-/g, "/") : projectDir;
  const slug = cwdPath.split("/").filter(Boolean).pop() ?? "unknown";
  const name = slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { slug, name, cwdPath: "/" + cwdPath };
}

export async function ingestAllPending(
  db: DbClient,
  source: TranscriptSource,
): Promise<TranscriptDelta[]> {
  const files = await source.listFiles();
  const deltas: TranscriptDelta[] = [];

  for (const file of files) {
    const existing = getSessionByJsonlPath(db, file.path);
    const offset = existing?.lastProcessedOffset ?? 0;

    if (existing && offset >= file.sizeBytes) continue;

    if (!existing) {
      const proj = deriveProjectFromDir(file.projectDir);
      const project = upsertProjectByCwdPath(db, {
        slug: proj.slug,
        name: proj.name,
        cwdPath: proj.cwdPath,
        claudeProjectDir: file.projectDir,
      });
      upsertSession(db, {
        id: file.sessionId,
        projectId: project.id,
        jsonlPath: file.path,
      });
    }

    const delta = await source.readDelta(file, offset);
    if (delta.messages.length === 0 && delta.toOffset === offset) continue;

    updateSessionOffset(db, file.sessionId, delta.toOffset);
    deltas.push(delta);
  }

  return deltas;
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test ingestor
git add apps/daemon/src/ingestor/ingestor.ts apps/daemon/src/ingestor/ingestor.test.ts
git commit -m "feat(daemon): ingestor orquestra discovery, projeto/sessão upsert e leitura de delta"
```

---

## Milestone M6 — Detector de Fronteira

### Task 36: `boundary.ts` — heurística de fronteira de tarefa (função pura)

**Files:**
- Create: `apps/daemon/src/detector/boundary.ts`
- Create: `apps/daemon/src/detector/boundary.test.ts`

Função pura que recebe (mensagem nova, mensagem anterior do assistant, settings) e devolve decisão {action: "continue"|"close"|"pause", confidence: number, reason: string}.

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it } from "vitest";
import { decideBoundary } from "./boundary.js";
import { DEFAULT_SETTINGS } from "@tracker/shared";

const settings = DEFAULT_SETTINGS.detection;

function userMsg(text: string, hourBrt: number, gapMin = 0): { ts: number; text: string } {
  // Constrói epoch em BRT
  const utcHour = hourBrt + 3; // BRT to UTC
  return {
    ts: Date.UTC(2026, 4, 2, utcHour, 0, 0) + gapMin * 60_000,
    text,
  };
}

describe("decideBoundary", () => {
  it("primeira mensagem cria nova tarefa", () => {
    const m = userMsg("começar feature de pagamento", 10);
    const d = decideBoundary({
      newUser: m,
      prevAssistantTs: null,
      lastUserText: null,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("start");
  });

  it("retoma tarefa quando gap pequeno e mesmo tópico", () => {
    const prev = userMsg("começar feature de pagamento", 10);
    const next = userMsg("e agora vamos validar o input", 10, 5);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("continue");
  });

  it("'voltando' explícito → continue mesmo após gap longo", () => {
    const prev = userMsg("começar feature de pagamento", 10);
    const next = userMsg("voltando — vamos seguir aquela feature", 14, 0);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("continue");
    expect(d.reason).toContain("resume");
  });

  it("nova msg dentro da janela noturna após gap → pause", () => {
    const prev = userMsg("trabalhar feature", 22);
    const next = userMsg("uma observação rápida", 23, 60);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("pause");
  });

  it("mudança de skill → close + start", () => {
    const prev = userMsg("vamos trabalhar pagamentos", 10);
    const next = userMsg("agora outra coisa, vamos depurar", 10, 5);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: "brainstorming",
      currentSkill: "debugging",
      settings,
    });
    expect(d.action).toBe("close-and-start");
  });

  it("gap longo e jaccard baixo → close + start", () => {
    const prev = userMsg("feature pagamento clinica", 14);
    const next = userMsg("componente dashboard heatmap", 16, 60);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("close-and-start");
    expect(d.confidence).toBeGreaterThan(0);
  });

  it("gap longo mas jaccard alto → continue (ambíguo)", () => {
    const prev = userMsg("feature pagamento clinica boleto", 14);
    const next = userMsg("feature pagamento clinica boleto continuar", 14, 60);
    const d = decideBoundary({
      newUser: next,
      prevAssistantTs: prev.ts + 60_000,
      lastUserText: prev.text,
      lastSkill: null,
      currentSkill: null,
      settings,
    });
    expect(d.action).toBe("continue");
    expect(d.confidence).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import { jaccardSimilarity } from "@tracker/shared";
import { isInNightWindow } from "../time.js";

export interface BoundaryDecisionInput {
  newUser: { ts: number; text: string };
  prevAssistantTs: number | null;
  lastUserText: string | null;
  lastSkill: string | null;
  currentSkill: string | null;
  settings: {
    gapMinutesBase: number;
    nightHoursStart: number;
    nightHoursEnd: number;
    semanticThreshold: number;
    resumeKeywords: readonly string[];
    newTopicKeywords: readonly string[];
  };
}

export type BoundaryAction = "start" | "continue" | "close-and-start" | "pause";

export interface BoundaryDecision {
  action: BoundaryAction;
  confidence: number;
  reason: string;
}

function matchesAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.slice(0, 200).toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function decideBoundary(input: BoundaryDecisionInput): BoundaryDecision {
  if (input.prevAssistantTs === null || input.lastUserText === null) {
    return { action: "start", confidence: 1, reason: "no-prev-task" };
  }

  if (matchesAny(input.newUser.text, input.settings.resumeKeywords)) {
    return { action: "continue", confidence: 1, reason: "explicit-resume" };
  }

  const gapMs = input.newUser.ts - input.prevAssistantTs;
  const gapBaseMs = input.settings.gapMinutesBase * 60_000;
  const inNight = isInNightWindow(input.newUser.ts, input.settings.nightHoursStart, input.settings.nightHoursEnd);

  if (inNight && gapMs > gapBaseMs) {
    return { action: "pause", confidence: 1, reason: "night-window-pause" };
  }

  if (
    matchesAny(input.newUser.text, input.settings.newTopicKeywords) ||
    (input.lastSkill !== null && input.currentSkill !== null && input.lastSkill !== input.currentSkill)
  ) {
    return { action: "close-and-start", confidence: 1, reason: "explicit-new-topic-or-skill" };
  }

  if (gapMs > gapBaseMs) {
    const sim = jaccardSimilarity(input.newUser.text.slice(0, 500), input.lastUserText.slice(0, 500));
    if (sim < input.settings.semanticThreshold) {
      return { action: "close-and-start", confidence: 0.7, reason: "gap-and-low-similarity" };
    }
    return { action: "continue", confidence: 0.6, reason: "gap-but-high-similarity" };
  }

  return { action: "continue", confidence: 1, reason: "default" };
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test boundary
git add apps/daemon/src/detector/boundary.ts apps/daemon/src/detector/boundary.test.ts
git commit -m "feat(daemon): heurística decideBoundary (resume/topic/skill/jaccard/night)"
```

---

### Task 37: `detector.ts` — aplica boundary sobre buffer e atualiza tasks

**Files:**
- Create: `apps/daemon/src/detector/detector.ts`
- Create: `apps/daemon/src/detector/detector.test.ts`

Recebe (db, sessionId, projectId, lista de mensagens novas, settings). Cada user msg dispara `decideBoundary`. Mantém estado da "tarefa em construção" via DB (busca task open mais recente da sessão). Cria/atualiza `tasks` rows.

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, listTasks, createProject, upsertSession,
  type DbClient, getSetting,
} from "@tracker/db";
import { DEFAULT_SETTINGS } from "@tracker/shared";
import { processMessages } from "./detector.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "sess", projectId, jsonlPath: "/p/sess.jsonl" }).id;
});

describe("processMessages", () => {
  it("primeira sequência user/assistant cria 1 task open", async () => {
    await processMessages(db, sessionId, projectId, [
      { uuid: "u1", role: "user", timestampMs: 1000, text: "começar feature", tokens: undefined },
      { uuid: "a1", role: "assistant", timestampMs: 2000, text: "ok!", model: "claude-sonnet-4-6",
        tokens: { input: 10, output: 5, cacheRead: 0, cacheCreation: 0 } },
    ], DEFAULT_SETTINGS.detection);
    const tasks = listTasks(db, { sessionId });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.status).toBe("open");
    expect(tasks[0]!.tokensInput).toBe(10);
    expect(tasks[0]!.tokensOutput).toBe(5);
    close();
  });

  it("nova msg user com gap longo + tópico diferente → close + new task", async () => {
    await processMessages(db, sessionId, projectId, [
      { uuid: "u1", role: "user", timestampMs: Date.UTC(2026, 4, 2, 13, 0, 0),
        text: "feature pagamento clinica", tokens: undefined },
      { uuid: "a1", role: "assistant", timestampMs: Date.UTC(2026, 4, 2, 13, 0, 5),
        text: "ok", model: "claude-sonnet-4-6",
        tokens: { input: 5, output: 5, cacheRead: 0, cacheCreation: 0 } },
      { uuid: "u2", role: "user", timestampMs: Date.UTC(2026, 4, 2, 14, 0, 0),
        text: "componente dashboard heatmap", tokens: undefined },
      { uuid: "a2", role: "assistant", timestampMs: Date.UTC(2026, 4, 2, 14, 0, 5),
        text: "ok", model: "claude-sonnet-4-6",
        tokens: { input: 5, output: 5, cacheRead: 0, cacheCreation: 0 } },
    ], DEFAULT_SETTINGS.detection);
    const tasks = listTasks(db, { sessionId });
    expect(tasks.length).toBe(2);
    const closed = tasks.find((t) => t.status === "closed");
    const open = tasks.find((t) => t.status === "open");
    expect(closed).toBeTruthy();
    expect(open).toBeTruthy();
    close();
  });

  it("agrega tokens corretamente sobre múltiplas mensagens da mesma task", async () => {
    await processMessages(db, sessionId, projectId, [
      { uuid: "u1", role: "user", timestampMs: 1000, text: "feature x", tokens: undefined },
      { uuid: "a1", role: "assistant", timestampMs: 2000, text: "ok", model: "claude-sonnet-4-6",
        tokens: { input: 10, output: 5, cacheRead: 100, cacheCreation: 50 } },
      { uuid: "u2", role: "user", timestampMs: 3000, text: "feature x continua", tokens: undefined },
      { uuid: "a2", role: "assistant", timestampMs: 4000, text: "ok2", model: "claude-sonnet-4-6",
        tokens: { input: 20, output: 10, cacheRead: 0, cacheCreation: 0 } },
    ], DEFAULT_SETTINGS.detection);
    const tasks = listTasks(db, { sessionId });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.tokensInput).toBe(30);
    expect(tasks[0]!.tokensOutput).toBe(15);
    expect(tasks[0]!.tokensCacheRead).toBe(100);
    expect(tasks[0]!.tokensCacheCreation).toBe(50);
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import {
  listTasks, createTask, updateTask, closeTask, pauseTask,
  type DbClient, type TaskRow,
} from "@tracker/db";
import type { TranscriptMessage } from "@tracker/shared";
import { decideBoundary } from "./boundary.js";
import { eq, sql } from "drizzle-orm";

interface DetectorSettings {
  gapMinutesBase: number;
  nightHoursStart: number;
  nightHoursEnd: number;
  semanticThreshold: number;
  resumeKeywords: readonly string[];
  newTopicKeywords: readonly string[];
}

function getOpenOrPausedTask(db: DbClient, sessionId: string): TaskRow | null {
  const all = listTasks(db, { sessionId });
  return all.find((t) => t.status === "open" || t.status === "paused") ?? null;
}

function aggregateTokens(task: TaskRow, msg: TranscriptMessage) {
  if (!msg.tokens) return null;
  return {
    tokensInput: task.tokensInput + msg.tokens.input,
    tokensOutput: task.tokensOutput + msg.tokens.output,
    tokensCacheRead: task.tokensCacheRead + msg.tokens.cacheRead,
    tokensCacheCreation: task.tokensCacheCreation + msg.tokens.cacheCreation,
    lastMessageUuid: msg.uuid,
    endedAt: msg.timestampMs,
  };
}

function deriveTitleFromUser(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 60) return trimmed;
  return trimmed.slice(0, 57) + "...";
}

export async function processMessages(
  db: DbClient,
  sessionId: string,
  projectId: string,
  messages: TranscriptMessage[],
  settings: DetectorSettings,
): Promise<void> {
  let currentTask = getOpenOrPausedTask(db, sessionId);
  let lastUserText: string | null = currentTask
    ? null /* unknown — fallback empty */
    : null;
  let lastAssistantTs: number | null = currentTask?.endedAt ?? null;

  for (const msg of messages) {
    if (msg.role === "user") {
      const decision = decideBoundary({
        newUser: { ts: msg.timestampMs, text: msg.text },
        prevAssistantTs: lastAssistantTs,
        lastUserText,
        lastSkill: null,
        currentSkill: null,
        settings,
      });

      if (decision.action === "start" || (currentTask === null && decision.action !== "pause")) {
        currentTask = createTask(db, {
          sessionId,
          projectId,
          title: deriveTitleFromUser(msg.text),
          startedAt: msg.timestampMs,
          firstMessageUuid: msg.uuid,
          confidence: decision.confidence,
        });
      } else if (decision.action === "close-and-start" && currentTask) {
        closeTask(db, currentTask.id, lastAssistantTs ?? msg.timestampMs, currentTask.lastMessageUuid);
        currentTask = createTask(db, {
          sessionId,
          projectId,
          title: deriveTitleFromUser(msg.text),
          startedAt: msg.timestampMs,
          firstMessageUuid: msg.uuid,
          confidence: decision.confidence,
        });
      } else if (decision.action === "pause" && currentTask) {
        if (currentTask.status === "open") pauseTask(db, currentTask.id);
        // Não cria nova; espera próxima msg fora da janela noturna
      } else if (decision.action === "continue" && currentTask?.status === "paused") {
        updateTask(db, currentTask.id, { status: "open" });
        currentTask = { ...currentTask, status: "open" };
      }

      lastUserText = msg.text;
    }

    if (msg.role === "assistant" && currentTask && currentTask.status !== "paused") {
      const agg = aggregateTokens(currentTask, msg);
      if (agg) {
        const modelsArray = currentTask.modelsUsed ? JSON.parse(currentTask.modelsUsed) as string[] : [];
        if (msg.model && !modelsArray.includes(msg.model)) modelsArray.push(msg.model);
        updateTask(db, currentTask.id, {
          ...agg,
          modelsUsed: JSON.stringify(modelsArray),
          primaryModel: currentTask.primaryModel ?? msg.model ?? null,
        });
        currentTask = { ...currentTask, ...agg };
      }
      lastAssistantTs = msg.timestampMs;
    }
  }
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test detector
git add apps/daemon/src/detector/detector.ts apps/daemon/src/detector/detector.test.ts
git commit -m "feat(daemon): processMessages aplica boundary e agrega tokens em tasks"
```

---

## Milestone M7 — Pricing & Billing

### Task 38: `pricer.ts` — calcula `cost_usd` por task

**Files:**
- Create: `apps/daemon/src/pricing/pricer.ts`
- Create: `apps/daemon/src/pricing/pricer.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, seedDatabase, listTasks, createProject,
  upsertSession, createTask, updateTask, type DbClient,
} from "@tracker/db";
import { recomputeTaskCost } from "./pricer.js";

let db: DbClient;
let close: () => void;
let sessionId: string;
let projectId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("recomputeTaskCost", () => {
  it("calcula custo com pricing válido em task.startedAt", () => {
    const task = createTask(db, {
      sessionId, projectId, title: "T", startedAt: Date.parse("2026-05-02T10:00:00Z"),
    });
    updateTask(db, task.id, {
      tokensInput: 1_000_000,
      tokensOutput: 0,
      tokensCacheRead: 0,
      tokensCacheCreation: 0,
      primaryModel: "claude-sonnet-4-6",
    });
    recomputeTaskCost(db, task.id);
    const updated = listTasks(db, { sessionId })[0]!;
    expect(updated.costUsd).toBeCloseTo(3, 5); // 1M * 3/1M = 3
    close();
  });

  it("ignora task sem primary_model (custo zero)", () => {
    const task = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    recomputeTaskCost(db, task.id);
    const updated = listTasks(db, { sessionId })[0]!;
    expect(updated.costUsd).toBe(0);
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import {
  findPricingFor, getTaskById, updateTask, type DbClient,
} from "@tracker/db";
import { calculateCost } from "@tracker/shared";

export function recomputeTaskCost(db: DbClient, taskId: string): void {
  const task = getTaskById(db, taskId);
  if (!task || !task.primaryModel) return;

  const pricing = findPricingFor(db, task.primaryModel, task.startedAt);
  if (!pricing) return;

  const cost = calculateCost(
    {
      input: task.tokensInput,
      output: task.tokensOutput,
      cacheRead: task.tokensCacheRead,
      cacheCreation: task.tokensCacheCreation,
    },
    {
      model: pricing.model,
      inputPerMtok: pricing.inputPerMtok,
      outputPerMtok: pricing.outputPerMtok,
      cacheReadPerMtok: pricing.cacheReadPerMtok,
      cacheCreationPerMtok: pricing.cacheCreationPerMtok,
      validFromMs: pricing.validFrom,
      validUntilMs: pricing.validUntil,
    },
  );

  updateTask(db, taskId, { costUsd: cost });
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test pricer
git add apps/daemon/src/pricing/pricer.ts apps/daemon/src/pricing/pricer.test.ts
git commit -m "feat(daemon): recomputeTaskCost aplica pricing histórico ao cost_usd"
```

---

### Task 39: Aplicar tempo derivado e cost no detector

**Files:**
- Modify: `apps/daemon/src/detector/detector.ts`
- Add update inside `processMessages` after token aggregation: call `recomputeTaskCost(db, taskId)` and recompute time blocks via `calculateTimeBlocks` using settings.

- [ ] **Step 1: Test ajustado**

Adicione novo test em `detector.test.ts`:

```typescript
it("calcula time blocks e cost após agregar tokens", async () => {
  // seed pricing já feito implicitamente pelo seedDatabase no setup? Não — adicionar aqui:
  const { seedDatabase } = await import("@tracker/db");
  seedDatabase(db);
  await processMessages(db, sessionId, projectId, [
    { uuid: "u1", role: "user", timestampMs: 1000, text: "feature x", tokens: undefined },
    { uuid: "a1", role: "assistant", timestampMs: 2000, text: "ok", model: "claude-sonnet-4-6",
      tokens: { input: 1000, output: 200, cacheRead: 0, cacheCreation: 0 } },
  ], DEFAULT_SETTINGS.detection);
  const t = listTasks(db, { sessionId })[0]!;
  expect(t.timeTotalSeconds).toBeGreaterThan(0);
  expect(t.costUsd).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Modificar `processMessages`**

Após `updateTask` que agrega tokens, adicionar chamadas:

```typescript
import { recomputeTaskCost } from "../pricing/pricer.js";
import { calculateTimeBlocks, getSetting } from "@tracker/shared";
import { getSetting as getDbSetting } from "@tracker/db";

// dentro do loop, após updateTask de tokens:
const timeCfg = {
  timePerInputTokenSeconds: getDbSetting<number>(db, "timePerInputTokenSeconds") ?? 0.5,
  timePerProcessingOutputTokenSeconds: getDbSetting<number>(db, "timePerProcessingOutputTokenSeconds") ?? 0.05,
  timePerReadingTokenSeconds: getDbSetting<number>(db, "timePerReadingTokenSeconds") ?? 0.15,
  cacheReadFactor: getDbSetting<number>(db, "cacheReadFactor") ?? 0.1,
};
const blocks = calculateTimeBlocks({
  input: agg.tokensInput,
  output: agg.tokensOutput,
  cacheRead: agg.tokensCacheRead,
  cacheCreation: agg.tokensCacheCreation,
}, timeCfg);
updateTask(db, currentTask.id, {
  timeInputSeconds: blocks.inputSeconds,
  timeProcessingOutputSeconds: blocks.processingOutputSeconds,
  timeReadingSeconds: blocks.readingSeconds,
  timeTotalSeconds: blocks.totalSeconds,
});
recomputeTaskCost(db, currentTask.id);
```

(Importar do `@tracker/db` em vez de `@tracker/shared`. O `getSetting` do `@tracker/shared` não existe — só `parseSettingValue`.)

- [ ] **Step 3: Run test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test detector
git add apps/daemon/src/detector/detector.ts apps/daemon/src/detector/detector.test.ts
git commit -m "feat(daemon): processMessages agora calcula time blocks e cost por task"
```

---

### Task 40: `biller.ts` — calcula `billable_hours`

**Files:**
- Create: `apps/daemon/src/biller/biller.ts`
- Create: `apps/daemon/src/biller/biller.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, seedDatabase, createProject, upsertSession,
  createTask, updateTask, getTaskById, createClientRow, type DbClient,
} from "@tracker/db";
import { recomputeBillableHours } from "./biller.js";

let db: DbClient;
let close: () => void;
let sessionId: string;
let projectId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("recomputeBillableHours", () => {
  it("calcula com factor default (0.4) quando task sem cliente", () => {
    const task = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, task.id, {
      timeTotalSeconds: 3600, // 1h Claude
      humanHoursEstimate: 3, // 3h humano
      humanHoursSource: "haiku",
    });
    recomputeBillableHours(db, task.id);
    const updated = getTaskById(db, task.id)!;
    // (1 + 3) / 2 * 0.4 = 0.8
    expect(updated.billableHours).toBeCloseTo(0.8, 5);
    close();
  });

  it("usa billable_factor do cliente quando definido", () => {
    const c = createClientRow(db, { name: "Acme", billableFactor: 0.6 });
    const task = createTask(db, { sessionId, projectId, clientId: c.id, title: "T", startedAt: 1 });
    updateTask(db, task.id, {
      timeTotalSeconds: 3600,
      humanHoursEstimate: 3,
      humanHoursSource: "haiku",
    });
    recomputeBillableHours(db, task.id);
    const updated = getTaskById(db, task.id)!;
    // (1 + 3) / 2 * 0.6 = 1.2
    expect(updated.billableHours).toBeCloseTo(1.2, 5);
    close();
  });

  it("não recalcula quando billable_hours_locked=true", () => {
    const task = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, task.id, {
      timeTotalSeconds: 3600,
      humanHoursEstimate: 3,
      humanHoursSource: "haiku",
      billableHours: 9.99,
      billableHoursLocked: true,
    });
    recomputeBillableHours(db, task.id);
    expect(getTaskById(db, task.id)!.billableHours).toBe(9.99);
    close();
  });

  it("não calcula quando human_hours_estimate é null", () => {
    const task = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, task.id, { timeTotalSeconds: 3600 });
    recomputeBillableHours(db, task.id);
    expect(getTaskById(db, task.id)!.billableHours).toBeNull();
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import {
  getTaskById, updateTask, getClientById, getSetting, type DbClient,
} from "@tracker/db";

export function recomputeBillableHours(db: DbClient, taskId: string): void {
  const task = getTaskById(db, taskId);
  if (!task) return;
  if (task.billableHoursLocked) return;
  if (task.humanHoursEstimate === null || task.humanHoursEstimate === undefined) return;

  let factor = getSetting<number>(db, "billableFactorDefault") ?? 0.4;
  if (task.clientId) {
    const client = getClientById(db, task.clientId);
    if (client && client.billableFactor !== null) factor = client.billableFactor;
  }

  const claudeHours = (task.timeTotalSeconds ?? 0) / 3600;
  const billable = ((claudeHours + task.humanHoursEstimate) / 2) * factor;

  updateTask(db, taskId, { billableHours: billable });
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test biller
git add apps/daemon/src/biller/biller.ts apps/daemon/src/biller/biller.test.ts
git commit -m "feat(daemon): recomputeBillableHours aplica fórmula meio-termo com factor cliente"
```

---

## Milestone M8 — Currency

### Task 41: `awesomeapi.ts` — fetch USD-BRL

**Files:**
- Create: `apps/daemon/src/currency/awesomeapi.ts`
- Create: `apps/daemon/src/currency/awesomeapi.test.ts`

- [ ] **Step 1: Test (mock fetch)**

```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fetchUsdBrlLatest } from "./awesomeapi.js";

describe("fetchUsdBrlLatest", () => {
  beforeEach(() => { vi.spyOn(globalThis, "fetch"); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("parseia resposta válida", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ USDBRL: { bid: "4.97", code: "USD", codein: "BRL" } }),
    } as Response);
    const rate = await fetchUsdBrlLatest();
    expect(rate).toBeCloseTo(4.97, 5);
  });

  it("lança em response não-OK", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(fetchUsdBrlLatest()).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
const ENDPOINT = "https://economia.awesomeapi.com.br/json/last/USD-BRL";

interface AwesomeApiResponse {
  USDBRL: { bid: string };
}

export async function fetchUsdBrlLatest(): Promise<number> {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`AwesomeAPI: HTTP ${res.status}`);
  const data = (await res.json()) as AwesomeApiResponse;
  const bid = Number(data.USDBRL?.bid);
  if (!Number.isFinite(bid) || bid <= 0) throw new Error(`AwesomeAPI: bid inválido ${data.USDBRL?.bid}`);
  return bid;
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test awesomeapi
git add apps/daemon/src/currency/awesomeapi.ts apps/daemon/src/currency/awesomeapi.test.ts
git commit -m "feat(daemon): fetcher de USD-BRL via AwesomeAPI"
```

---

### Task 42: `currency-updater.ts` — job diário + backfill

**Files:**
- Create: `apps/daemon/src/currency/updater.ts`
- Create: `apps/daemon/src/currency/updater.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  createClient, runMigrations, getCurrencyRate, type DbClient,
} from "@tracker/db";
import { updateCurrencyToday } from "./updater.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});
afterEach(() => { vi.restoreAllMocks(); });

describe("updateCurrencyToday", () => {
  it("salva rate retornada pela API com source=awesomeapi", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ USDBRL: { bid: "4.97" } }),
    } as Response);
    const date = "2026-05-02";
    await updateCurrencyToday(db, () => Date.UTC(2026, 4, 2, 12, 0, 0));
    expect(getCurrencyRate(db, date)?.usdBrl).toBeCloseTo(4.97, 5);
    expect(getCurrencyRate(db, date)?.source).toBe("awesomeapi");
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import { upsertCurrencyRate, type DbClient } from "@tracker/db";
import { fetchUsdBrlLatest } from "./awesomeapi.js";
import { formatDateBrt } from "../time.js";

export async function updateCurrencyToday(
  db: DbClient,
  now: () => number = Date.now,
): Promise<void> {
  const rate = await fetchUsdBrlLatest();
  const date = formatDateBrt(now());
  upsertCurrencyRate(db, date, rate, "awesomeapi");
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test updater
git add apps/daemon/src/currency/updater.ts apps/daemon/src/currency/updater.test.ts
git commit -m "feat(daemon): job diário de atualização de cotação USD-BRL"
```

---

## Milestone M9 — Recalc & Close-Idle

### Task 43: `recalc.ts` — recalcular tempo/billable em massa

**Files:**
- Create: `apps/daemon/src/recalc/recalc.ts`
- Create: `apps/daemon/src/recalc/recalc.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, seedDatabase, createProject, upsertSession,
  createTask, updateTask, getTaskById, setSetting, type DbClient,
} from "@tracker/db";
import { recalcTimeAndBillableForAll, recalcCostForAll } from "./recalc.js";

let db: DbClient;
let close: () => void;
let sessionId: string;
let projectId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("recalcTimeAndBillableForAll", () => {
  it("atualiza time_* de todas as tasks após mudança de settings", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, t.id, { tokensInput: 100, tokensOutput: 100, primaryModel: "claude-sonnet-4-6" });
    recalcTimeAndBillableForAll(db);
    const t1 = getTaskById(db, t.id)!;
    const before = t1.timeTotalSeconds;
    setSetting(db, "timePerInputTokenSeconds", 1.0);
    recalcTimeAndBillableForAll(db);
    const t2 = getTaskById(db, t.id)!;
    expect(t2.timeTotalSeconds).toBeGreaterThan(before);
    close();
  });

  it("não toca billable_hours quando locked", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    updateTask(db, t.id, {
      tokensInput: 100, tokensOutput: 100, primaryModel: "claude-sonnet-4-6",
      humanHoursEstimate: 1, humanHoursSource: "manual",
      billableHours: 5.5, billableHoursLocked: true,
    });
    recalcTimeAndBillableForAll(db);
    expect(getTaskById(db, t.id)!.billableHours).toBe(5.5);
    close();
  });
});

describe("recalcCostForAll", () => {
  it("atualiza cost_usd após mudança de pricing", () => {
    const t = createTask(db, {
      sessionId, projectId, title: "T", startedAt: Date.parse("2026-05-02T10:00:00Z"),
    });
    updateTask(db, t.id, { tokensInput: 1_000_000, primaryModel: "claude-sonnet-4-6" });
    recalcCostForAll(db);
    expect(getTaskById(db, t.id)!.costUsd).toBeCloseTo(3, 5);
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import {
  listTasks, updateTask, getSetting, type DbClient,
} from "@tracker/db";
import { calculateTimeBlocks } from "@tracker/shared";
import { recomputeTaskCost } from "../pricing/pricer.js";
import { recomputeBillableHours } from "../biller/biller.js";

function loadTimeConfig(db: DbClient) {
  return {
    timePerInputTokenSeconds: getSetting<number>(db, "timePerInputTokenSeconds") ?? 0.5,
    timePerProcessingOutputTokenSeconds: getSetting<number>(db, "timePerProcessingOutputTokenSeconds") ?? 0.05,
    timePerReadingTokenSeconds: getSetting<number>(db, "timePerReadingTokenSeconds") ?? 0.15,
    cacheReadFactor: getSetting<number>(db, "cacheReadFactor") ?? 0.1,
  };
}

export function recalcTimeAndBillableForAll(db: DbClient): void {
  const cfg = loadTimeConfig(db);
  const tasks = listTasks(db, {});
  for (const task of tasks) {
    const blocks = calculateTimeBlocks({
      input: task.tokensInput,
      output: task.tokensOutput,
      cacheRead: task.tokensCacheRead,
      cacheCreation: task.tokensCacheCreation,
    }, cfg);
    updateTask(db, task.id, {
      timeInputSeconds: blocks.inputSeconds,
      timeProcessingOutputSeconds: blocks.processingOutputSeconds,
      timeReadingSeconds: blocks.readingSeconds,
      timeTotalSeconds: blocks.totalSeconds,
    });
    recomputeBillableHours(db, task.id);
  }
}

export function recalcCostForAll(db: DbClient): void {
  const tasks = listTasks(db, {});
  for (const task of tasks) recomputeTaskCost(db, task.id);
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test recalc
git add apps/daemon/src/recalc/recalc.ts apps/daemon/src/recalc/recalc.test.ts
git commit -m "feat(daemon): recalc em massa de time blocks, billable e cost"
```

---

### Task 44: `close-idle.ts` — fecha tasks open inativas

**Files:**
- Create: `apps/daemon/src/close-idle/close-idle.ts`
- Create: `apps/daemon/src/close-idle/close-idle.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import {
  createClient, runMigrations, createProject, upsertSession, createTask,
  updateTask, listTasks, type DbClient,
} from "@tracker/db";
import { closeIdleTasks } from "./close-idle.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("closeIdleTasks", () => {
  it("fecha task open com último msg > idleHours", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1000 });
    updateTask(db, t.id, { endedAt: 1000 });
    const now = 1000 + 7 * 3600 * 1000; // 7h depois
    closeIdleTasks(db, 6, () => now);
    const after = listTasks(db, { sessionId })[0]!;
    expect(after.status).toBe("closed");
    close();
  });

  it("não fecha task com gap < idleHours", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1000 });
    updateTask(db, t.id, { endedAt: 1000 });
    const now = 1000 + 1 * 3600 * 1000; // 1h depois
    closeIdleTasks(db, 6, () => now);
    expect(listTasks(db, { sessionId })[0]!.status).toBe("open");
    close();
  });

  it("não fecha task paused (preserva pausa noturna)", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1000 });
    updateTask(db, t.id, { endedAt: 1000, status: "paused" });
    const now = 1000 + 24 * 3600 * 1000;
    closeIdleTasks(db, 6, () => now);
    expect(listTasks(db, { sessionId })[0]!.status).toBe("paused");
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import { listTasks, closeTask, type DbClient } from "@tracker/db";

export function closeIdleTasks(
  db: DbClient,
  idleHours: number,
  now: () => number = Date.now,
): number {
  const cutoff = now() - idleHours * 3600 * 1000;
  const opens = listTasks(db, { status: "open" });
  let closedCount = 0;
  for (const task of opens) {
    const lastTs = task.endedAt ?? task.startedAt;
    if (lastTs < cutoff) {
      closeTask(db, task.id, lastTs, task.lastMessageUuid);
      closedCount++;
    }
  }
  return closedCount;
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test close-idle
git add apps/daemon/src/close-idle/close-idle.ts apps/daemon/src/close-idle/close-idle.test.ts
git commit -m "feat(daemon): closeIdleTasks fecha tasks open com inatividade > idleHours"
```

---

## Milestone M10 — Scheduler & Entry

### Task 45: `scheduler.ts` — orquestra um tick

**Files:**
- Create: `apps/daemon/src/scheduler.ts`
- Create: `apps/daemon/src/scheduler.test.ts`

Função `runTick(db, source, settings)` que executa o pipeline inteiro de um tick: ingest → detect → close-idle. Retorna métricas. Não engloba currency (esse é job nightly).

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createClient, runMigrations, seedDatabase, listTasks, type DbClient,
} from "@tracker/db";
import { ClaudeCodeJsonlSource } from "./ingestor/claude-code-source.js";
import { runTick } from "./scheduler.js";

let testDir: string;
let db: DbClient;
let closeDb: () => void;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "tracker-tick-"));
  const h = createClient(":memory:");
  db = h.db; closeDb = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  closeDb();
});

describe("runTick", () => {
  it("ingere JSONL e cria tasks com cost computado", async () => {
    const dir = join(testDir, "-Users-luiz-dev-csp");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "abc.jsonl");
    writeFileSync(path, [
      JSON.stringify({ type: "user", uuid: "u1", timestamp: "2026-05-02T10:00:00Z",
        message: { role: "user", content: "feature pagamento" } }),
      JSON.stringify({ type: "assistant", uuid: "a1", timestamp: "2026-05-02T10:00:30Z",
        message: { role: "assistant", model: "claude-sonnet-4-6",
          content: [{ type: "text", text: "ok" }],
          usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }),
    ].join("\n") + "\n");

    const source = new ClaudeCodeJsonlSource(testDir);
    const metrics = await runTick(db, source);
    expect(metrics.filesProcessed).toBeGreaterThan(0);
    const tasks = listTasks(db, {});
    expect(tasks.length).toBe(1);
    expect(tasks[0]!.tokensInput).toBe(100);
    expect(tasks[0]!.timeTotalSeconds).toBeGreaterThan(0);
    expect(tasks[0]!.costUsd).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import { type DbClient, getSetting } from "@tracker/db";
import type { TranscriptSource } from "@tracker/shared";
import { ingestAllPending } from "./ingestor/ingestor.js";
import { processMessages } from "./detector/detector.js";
import { closeIdleTasks } from "./close-idle/close-idle.js";

export interface TickMetrics {
  filesScanned: number;
  filesProcessed: number;
  tasksCreated: number;
  tasksUpdated: number;
  tasksClosedIdle: number;
}

export async function runTick(db: DbClient, source: TranscriptSource): Promise<TickMetrics> {
  const settings = {
    gapMinutesBase: getSetting<number>(db, "detection.gapMinutesBase") ?? 30,
    nightHoursStart: getSetting<number>(db, "detection.nightHoursStart") ?? 23,
    nightHoursEnd: getSetting<number>(db, "detection.nightHoursEnd") ?? 9,
    semanticThreshold: getSetting<number>(db, "detection.semanticThreshold") ?? 0.65,
    resumeKeywords: getSetting<string[]>(db, "detection.resumeKeywords") ?? ["voltando", "retomando", "continua"],
    newTopicKeywords: getSetting<string[]>(db, "detection.newTopicKeywords") ?? ["agora", "outra coisa"],
  };

  const allFiles = await source.listFiles();
  const deltas = await ingestAllPending(db, source);

  for (const delta of deltas) {
    const sessionId = delta.file.sessionId;
    const projectByDir = await source.listFiles().then((files) =>
      files.find((f) => f.sessionId === sessionId)?.projectDir);
    if (!projectByDir) continue;

    // Buscar projectId via session já criada
    const { getSessionById } = await import("@tracker/db");
    const session = getSessionById(db, sessionId);
    if (!session) continue;
    await processMessages(db, sessionId, session.projectId, delta.messages, settings);
  }

  const idleHours = getSetting<number>(db, "detection.idleCloseHours") ?? 6;
  const closedCount = closeIdleTasks(db, idleHours);

  return {
    filesScanned: allFiles.length,
    filesProcessed: deltas.length,
    tasksCreated: 0, // métricas aproximadas — preciso seria contar antes/depois
    tasksUpdated: 0,
    tasksClosedIdle: closedCount,
  };
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test scheduler
git add apps/daemon/src/scheduler.ts apps/daemon/src/scheduler.test.ts
git commit -m "feat(daemon): scheduler runTick orquestra ingest + detect + close-idle"
```

---

### Task 46: `index.ts` — entry do daemon

**Files:**
- Modify: `apps/daemon/src/index.ts`

- [ ] **Step 1: Implementar entry**

```typescript
import { createClient, runMigrations, seedDatabase } from "@tracker/db";
import { ClaudeCodeJsonlSource } from "./ingestor/claude-code-source.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { withDaemonRun } from "./runs.js";
import { runTick } from "./scheduler.js";
import { updateCurrencyToday } from "./currency/updater.js";
import { formatDateBrt } from "./time.js";

const log = createLogger("[daemon]");

async function main() {
  const cfg = loadConfig(process.env);
  log.info("boot", { trackerRoot: cfg.trackerRoot, dbPath: cfg.dbPath, claudeProjectsDir: cfg.claudeProjectsDir });

  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  seedDatabase(db);

  const source = new ClaudeCodeJsonlSource(cfg.claudeProjectsDir);

  let lastCurrencyDate = "";

  async function tick() {
    try {
      await withDaemonRun(db, "tick", async (m) => {
        const result = await runTick(db, source);
        m.filesScanned = result.filesScanned;
        m.filesProcessed = result.filesProcessed;
        m.tasksCreated = result.tasksClosedIdle;
      });
    } catch (err) {
      log.error("tick failed", err);
    }

    const today = formatDateBrt(Date.now());
    if (lastCurrencyDate !== today) {
      try {
        await withDaemonRun(db, "currency", async () => {
          await updateCurrencyToday(db);
        });
        lastCurrencyDate = today;
      } catch (err) {
        log.warn("currency update failed", err);
      }
    }
  }

  await tick();
  setInterval(() => { void tick(); }, cfg.tickIntervalMs);

  process.on("SIGINT", () => { log.info("shutdown"); sqlite.close(); process.exit(0); });
  process.on("SIGTERM", () => { log.info("shutdown"); sqlite.close(); process.exit(0); });
}

main().catch((err) => {
  console.error("fatal", err);
  process.exit(1);
});
```

- [ ] **Step 2: Build verifica typecheck**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm build
```

Esperado: build passa sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/daemon/src/index.ts
git commit -m "feat(daemon): entry com main loop, signals e job de currency"
```

---

## Self-Review

**Spec coverage:**
- §6.1 DISCOVER → INGEST → DETECT → PRICE → BILL → CLOSE-IDLE → LOG: ✅ tasks 31, 35, 37, 38, 39, 40, 44, 32 (LOG via withDaemonRun).
- §6.1.1 Recálculo em massa: ✅ task 43.
- §6.2 Heurística completa (resume/topic/skill/jaccard/night): ✅ task 36.
- §8 CURRENCY (USD-BRL diário): ✅ tasks 41, 42.
- TranscriptSource plugável (§12): ✅ task 31 implementa interface do shared.
- Settings consumidos via DB queries: ✅ task 39, 43, 45.

**Type consistency:** `DbClient`, `TranscriptMessage`, `TranscriptDelta` usados consistentemente. `BoundaryDecision.action` enum reutilizado em detector.

**Não-coberto (intencional, fica para Plan 3):**
- Refiner (Haiku): Plan 3.
- Estimator (Haiku): Plan 3.
- Sanitização redact aplicada: Plan 3 (quando Haiku entrar).
- IPC socket UNIX para trigger de recalc via API: Plan 3 ou 4.

**Limitações conhecidas:**
- `runTick` re-chama `source.listFiles()` 2× — pode otimizar passando o array.
- `tasksCreated`/`tasksUpdated` em métricas estão imprecisos — daria pra contar tasks antes/depois do tick.
- `processMessages` não recebe `lastSkill`/`currentSkill` ainda (sempre null) — adicionar quando detecção de skill via tool_uses for implementada (Plan 3).

---

## Execution Handoff

**Plan complete e salvo em** `docs/superpowers/plans/2026-05-02-lv-dev-tracker-fase1-plan2-daemon-core.md`.

Após executar este plano: daemon pronto para rodar (`pnpm --filter @tracker/daemon start`), processar JSONLs reais, popular tasks/sessions, computar custos. Pré-requisito para Plan 3 (que adiciona Haiku) e Plan 5 (smoke test ponta-a-ponta).

Próximo: Plan 3 — Daemon AI + CLI.
