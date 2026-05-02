# LV Dev Tracker Fase 1 — Plan 3: Daemon AI + CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar refinamento e estimativa de horas via Haiku 4.5 (com sanitização obrigatória), filas com throttling, e o CLI `lv-tracker` completo.

**Architecture:** O daemon ganha duas filas assíncronas (refine + estimate) com throttling 1 req/s e concorrência max 3, ambas chamando Haiku via `@anthropic-ai/sdk`. Antes de cada chamada, todo texto enviado passa pelo `redact()` do `@tracker/shared`. O CLI (`apps/cli`) é um binário Node que conversa com o mesmo SQLite (read+write) e oferece comandos status/sync/backfill/refine/hours/etc.

**Tech Stack:** Anthropic SDK, p-throttle, commander (CLI), prompts (input interativo), kleur (cores).

**Source spec:** `docs/superpowers/specs/2026-05-02-lv-dev-tracker-design.md` §6.1 step 5-6, §6.4 (redact), §8 (CLI), §10.7 (segurança Haiku).

**Depends on:** Plan 1 + Plan 2 completos.

**Chain:** Após Plan 3, segue Plan 4 (Dashboard) → Plan 5 (Infra + Smoke).

---

## File Structure

```
apps/daemon/src/
├── refiner/
│   ├── haiku-client.ts             # Wrapper Anthropic SDK + throttle
│   ├── haiku-client.test.ts
│   ├── prompts.ts                  # System/user prompts para refine + estimate
│   ├── prompts.test.ts
│   ├── refiner.ts                  # Loop: tasks elegíveis → Haiku → atualiza title/category
│   └── refiner.test.ts
└── estimator/
    ├── estimator.ts                # Loop: tasks sem human_hours → Haiku → atualiza
    └── estimator.test.ts

apps/cli/
├── package.json
├── tsconfig.json
├── bin/
│   └── lv-tracker.ts               # shebang entry
└── src/
    ├── index.ts                    # Commander setup
    ├── commands/
    │   ├── status.ts               # daemon up? última run?
    │   ├── sync.ts                 # força runTick imediato
    │   ├── backfill.ts             # processa JSONL inteiro
    │   ├── tasks-recent.ts
    │   ├── tasks-show.ts
    │   ├── hours.ts                # batch interativo de input de horas
    │   ├── refine.ts               # dispara refinamento de task(s)
    │   ├── pricing.ts
    │   ├── currency.ts
    │   ├── pause.ts
    │   ├── resume.ts
    │   ├── logs.ts
    │   ├── open.ts
    │   └── version.ts
    └── ui.ts                       # helpers de formatação (kleur, tabela)
```

---

## Milestone M11 — Anthropic SDK Wrapper

### Task 47: Adicionar deps Anthropic + p-throttle

**Files:**
- Modify: `apps/daemon/package.json`

- [ ] **Step 1: Adicionar deps**

Edite `apps/daemon/package.json`, dependencies:
```json
"@anthropic-ai/sdk": "^0.32.0",
"p-throttle": "^7.0.0"
```

- [ ] **Step 2: Install**

```bash
cd /Users/luiz/dev/tracker && pnpm install
```

- [ ] **Step 3: Commit**

```bash
git add apps/daemon/package.json pnpm-lock.yaml
git commit -m "chore(daemon): adiciona @anthropic-ai/sdk e p-throttle"
```

---

### Task 48: `haiku-client.ts` — wrapper SDK com redact e throttle

**Files:**
- Create: `apps/daemon/src/refiner/haiku-client.ts`
- Create: `apps/daemon/src/refiner/haiku-client.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { HaikuClient } from "./haiku-client.js";

describe("HaikuClient.complete", () => {
  it("redige texto antes de enviar para a API", async () => {
    const client = new HaikuClient({ apiKey: "sk-ant-test", model: "claude-haiku-4-5-20251001" });
    const sendSpy = vi.spyOn(client as unknown as { sendRaw: () => Promise<string> }, "sendRaw")
      .mockResolvedValue("response");
    await client.complete({
      system: "system has AKIAIOSFODNN7EXAMPLE",
      user: "user has ANTHROPIC_API_KEY=sk-ant-api03-secret123secret123secret123secret123",
    });
    const sentArgs = sendSpy.mock.calls[0]![0] as { system: string; user: string };
    expect(sentArgs.system).toContain("[REDACTED:AWS_ACCESS_KEY]");
    expect(sentArgs.user).toContain("[REDACTED:");
  });

  it("respeita throttle (não estoura requestsPerSecond)", async () => {
    const client = new HaikuClient({
      apiKey: "sk-ant-test",
      model: "claude-haiku-4-5-20251001",
      requestsPerSecond: 2,
    });
    vi.spyOn(client as unknown as { sendRaw: () => Promise<string> }, "sendRaw").mockResolvedValue("ok");

    const t0 = Date.now();
    await Promise.all([
      client.complete({ system: "s", user: "u" }),
      client.complete({ system: "s", user: "u" }),
      client.complete({ system: "s", user: "u" }),
    ]);
    const elapsed = Date.now() - t0;
    // 3 requests a 2/s => mínimo ~1000ms (3rd waits 1s)
    expect(elapsed).toBeGreaterThanOrEqual(400); // tolerância
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import pThrottle from "p-throttle";
import { redact } from "@tracker/shared";

export interface HaikuClientOptions {
  apiKey: string;
  model: string;
  requestsPerSecond?: number;
  maxTokens?: number;
}

export interface CompleteRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

export class HaikuClient {
  private readonly anthropic: Anthropic;
  private readonly model: string;
  private readonly defaultMaxTokens: number;
  private readonly throttledSend: (req: CompleteRequest) => Promise<string>;

  constructor(options: HaikuClientOptions) {
    this.anthropic = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model;
    this.defaultMaxTokens = options.maxTokens ?? 1024;
    const limit = options.requestsPerSecond ?? 1;
    const throttle = pThrottle({ limit, interval: 1000 });
    this.throttledSend = throttle((req: CompleteRequest) => this.sendRaw(req));
  }

  async complete(req: CompleteRequest): Promise<string> {
    const safe: CompleteRequest = {
      system: redact(req.system),
      user: redact(req.user),
      maxTokens: req.maxTokens,
    };
    return this.throttledSend(safe);
  }

  private async sendRaw(req: CompleteRequest): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? this.defaultMaxTokens,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });
    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  }
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test haiku-client
git add apps/daemon/src/refiner/haiku-client.ts apps/daemon/src/refiner/haiku-client.test.ts
git commit -m "feat(daemon): HaikuClient com redact obrigatório e throttle p-throttle"
```

---

### Task 49: `prompts.ts` — prompts para refine + estimate

**Files:**
- Create: `apps/daemon/src/refiner/prompts.ts`
- Create: `apps/daemon/src/refiner/prompts.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it } from "vitest";
import { buildRefinePrompt, parseRefineResponse, buildEstimatePrompt, parseEstimateResponse } from "./prompts.js";

describe("buildRefinePrompt", () => {
  it("inclui contexto do projeto e mensagens", () => {
    const p = buildRefinePrompt({
      projectName: "Sinusal",
      messages: [
        { role: "user", text: "preciso corrigir bug do cálculo de pagamento" },
        { role: "assistant", text: "vou investigar o ExameController..." },
      ],
    });
    expect(p.system).toContain("título");
    expect(p.user).toContain("Sinusal");
    expect(p.user).toContain("preciso corrigir");
  });
});

describe("parseRefineResponse", () => {
  it("extrai title + category de JSON válido", () => {
    const out = parseRefineResponse('{"title":"Bug cálculo pagamento","category":"hotfix"}');
    expect(out.title).toBe("Bug cálculo pagamento");
    expect(out.category).toBe("hotfix");
  });

  it("aceita JSON dentro de markdown code block", () => {
    const out = parseRefineResponse('```json\n{"title":"X","category":"feature"}\n```');
    expect(out.title).toBe("X");
  });

  it("retorna nulls quando JSON malformado", () => {
    const out = parseRefineResponse("isso não é JSON");
    expect(out.title).toBeNull();
    expect(out.category).toBeNull();
  });
});

describe("buildEstimatePrompt", () => {
  it("monta prompt para estimativa de horas humanas", () => {
    const p = buildEstimatePrompt({
      title: "Refatorar service de pagamentos",
      description: "extrair lógica de juros para classe separada",
      filesTouched: ["app/Services/PagamentoService.php"],
    });
    expect(p.system).toContain("horas");
    expect(p.user).toContain("Refatorar");
  });
});

describe("parseEstimateResponse", () => {
  it("extrai hours numérico e reasoning", () => {
    const r = parseEstimateResponse('{"hours": 2.5, "reasoning": "task simples"}');
    expect(r.hours).toBe(2.5);
    expect(r.reasoning).toBe("task simples");
  });

  it("retorna null quando JSON inválido", () => {
    expect(parseEstimateResponse("inválido").hours).toBeNull();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
const REFINE_SYSTEM = `Você analisa transcripts de sessões do Claude Code e produz um título conciso (max 60 chars) e uma categoria.

Categorias possíveis: feature, hotfix, refactor, research, infra, docs, debug, other.

Responda APENAS com JSON no formato: {"title": "...", "category": "..."}
Não inclua explicações, comentários, ou markdown.`;

const ESTIMATE_SYSTEM = `Você é um sênior em desenvolvimento de software. Estime quantas horas um humano experiente levaria para completar a tarefa descrita SEM usar IA.

Considere:
- complexidade técnica
- tamanho da mudança
- risco de edge cases
- tempo de testes

Responda APENAS com JSON: {"hours": <número>, "reasoning": "<1-2 frases>"}`;

export interface RefineInput {
  projectName: string;
  messages: Array<{ role: string; text: string }>;
}

export function buildRefinePrompt(input: RefineInput): { system: string; user: string } {
  const transcript = input.messages
    .slice(0, 30)
    .map((m) => `[${m.role}] ${m.text.slice(0, 800)}`)
    .join("\n\n");
  return {
    system: REFINE_SYSTEM,
    user: `Projeto: ${input.projectName}\n\nTranscript (até 30 msgs, truncadas):\n\n${transcript}`,
  };
}

export interface RefineOutput {
  title: string | null;
  category: string | null;
}

export function parseRefineResponse(text: string): RefineOutput {
  const json = extractJson(text);
  if (!json) return { title: null, category: null };
  return {
    title: typeof json["title"] === "string" ? json["title"] : null,
    category: typeof json["category"] === "string" ? json["category"] : null,
  };
}

export interface EstimateInput {
  title: string;
  description?: string;
  filesTouched?: string[];
}

export function buildEstimatePrompt(input: EstimateInput): { system: string; user: string } {
  const filesStr = input.filesTouched?.length
    ? `\n\nArquivos tocados:\n${input.filesTouched.slice(0, 20).join("\n")}`
    : "";
  return {
    system: ESTIMATE_SYSTEM,
    user: `Tarefa: ${input.title}${input.description ? `\n\nDescrição: ${input.description}` : ""}${filesStr}`,
  };
}

export interface EstimateOutput {
  hours: number | null;
  reasoning: string | null;
}

export function parseEstimateResponse(text: string): EstimateOutput {
  const json = extractJson(text);
  if (!json) return { hours: null, reasoning: null };
  const hours = typeof json["hours"] === "number" ? json["hours"] : null;
  return {
    hours,
    reasoning: typeof json["reasoning"] === "string" ? json["reasoning"] : null,
  };
}

function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  // Tenta direto primeiro
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {}
  // Tenta extrair de markdown ```json ... ```
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1]!) as Record<string, unknown>;
    } catch {}
  }
  // Tenta extrair primeiro objeto {...}
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as Record<string, unknown>;
    } catch {}
  }
  return null;
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test prompts
git add apps/daemon/src/refiner/prompts.ts apps/daemon/src/refiner/prompts.test.ts
git commit -m "feat(daemon): prompts e parsers JSON-tolerant para refine + estimate"
```

---

## Milestone M12 — Refiner

### Task 50: `refiner.ts` — loop de refinamento

**Files:**
- Create: `apps/daemon/src/refiner/refiner.ts`
- Create: `apps/daemon/src/refiner/refiner.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  createClient, runMigrations, seedDatabase, createProject, upsertSession,
  createTask, updateTask, getTaskById, type DbClient,
} from "@tracker/db";
import { refineTask, type Refiner } from "./refiner.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
  projectId = createProject(db, { slug: "p", name: "Project Name", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("refineTask", () => {
  it("aplica title + category retornados pelo Haiku", async () => {
    const t = createTask(db, { sessionId, projectId, title: "feature pagamento", startedAt: 1000 });
    updateTask(db, t.id, { tokensInput: 10000 }); // > threshold
    const fakeRefiner: Refiner = {
      refine: vi.fn().mockResolvedValue({ title: "Bug cálculo pagamento", category: "hotfix" }),
    };
    await refineTask(db, t.id, fakeRefiner);
    const r = getTaskById(db, t.id)!;
    expect(r.title).toBe("Bug cálculo pagamento");
    expect(r.category).toBe("hotfix");
    expect(r.refinedByHaiku).toBe(true);
    close();
  });

  it("não atualiza task se Haiku retorna nulls", async () => {
    const t = createTask(db, { sessionId, projectId, title: "original", startedAt: 1 });
    const fakeRefiner: Refiner = {
      refine: vi.fn().mockResolvedValue({ title: null, category: null }),
    };
    await refineTask(db, t.id, fakeRefiner);
    expect(getTaskById(db, t.id)!.title).toBe("original");
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import {
  getTaskById, getProjectByCwdPath, listProjects, getSessionById, updateTask,
  type DbClient, type TaskRow,
} from "@tracker/db";
import { HaikuClient } from "./haiku-client.js";
import { buildRefinePrompt, parseRefineResponse } from "./prompts.js";

export interface Refiner {
  refine(input: { projectName: string; messages: Array<{ role: string; text: string }> }):
    Promise<{ title: string | null; category: string | null }>;
}

export class HaikuRefiner implements Refiner {
  constructor(private readonly client: HaikuClient) {}
  async refine(input: { projectName: string; messages: Array<{ role: string; text: string }> }) {
    const { system, user } = buildRefinePrompt(input);
    const text = await this.client.complete({ system, user, maxTokens: 256 });
    return parseRefineResponse(text);
  }
}

export async function refineTask(db: DbClient, taskId: string, refiner: Refiner): Promise<void> {
  const task = getTaskById(db, taskId);
  if (!task) return;

  // Buscar projectName
  const project = listProjects(db).find((p) => p.id === task.projectId);
  if (!project) return;

  // Mensagens da sessão (simplificação Fase 1: usa título atual + descrição existente)
  // Para Plan 4+ podemos passar transcript completo
  const messages = [
    { role: "user", text: task.title },
    ...(task.description ? [{ role: "context", text: task.description }] : []),
  ];

  const result = await refiner.refine({ projectName: project.name, messages });
  if (!result.title && !result.category) return;
  updateTask(db, taskId, {
    title: result.title ?? task.title,
    category: result.category ?? task.category,
    refinedByHaiku: true,
  });
}

export function listTasksEligibleForRefine(
  db: DbClient,
  thresholdTokens: number,
): TaskRow[] {
  const { listTasks } = require("@tracker/db");
  return listTasks(db, {}).filter((t: TaskRow) =>
    !t.refinedByHaiku &&
    (t.tokensInput + t.tokensOutput + t.tokensCacheRead) > thresholdTokens,
  );
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test refiner
git add apps/daemon/src/refiner/refiner.ts apps/daemon/src/refiner/refiner.test.ts
git commit -m "feat(daemon): refineTask aplica title/category de Haiku via Refiner injetável"
```

---

## Milestone M13 — Estimator

### Task 51: `estimator.ts` — loop de estimativa de horas humanas

**Files:**
- Create: `apps/daemon/src/estimator/estimator.ts`
- Create: `apps/daemon/src/estimator/estimator.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  createClient, runMigrations, seedDatabase, createProject, upsertSession,
  createTask, getTaskById, type DbClient,
} from "@tracker/db";
import { estimateTaskHours, type Estimator } from "./estimator.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const h = createClient(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  seedDatabase(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
});

describe("estimateTaskHours", () => {
  it("aplica hours + reasoning, source=haiku", async () => {
    const t = createTask(db, { sessionId, projectId, title: "Refatorar service", startedAt: 1 });
    const fake: Estimator = {
      estimate: vi.fn().mockResolvedValue({ hours: 3, reasoning: "complexity médio" }),
    };
    await estimateTaskHours(db, t.id, fake);
    const r = getTaskById(db, t.id)!;
    expect(r.humanHoursEstimate).toBe(3);
    expect(r.humanHoursSource).toBe("haiku");
    expect(r.humanHoursReasoning).toBe("complexity médio");
    close();
  });

  it("não sobrescreve quando source=manual", async () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    const { updateTask } = await import("@tracker/db");
    updateTask(db, t.id, { humanHoursEstimate: 5, humanHoursSource: "manual" });
    const fake: Estimator = {
      estimate: vi.fn().mockResolvedValue({ hours: 99, reasoning: "x" }),
    };
    await estimateTaskHours(db, t.id, fake);
    const r = getTaskById(db, t.id)!;
    expect(r.humanHoursEstimate).toBe(5);
    expect(r.humanHoursSource).toBe("manual");
    expect(fake.estimate).not.toHaveBeenCalled();
    close();
  });

  it("não atualiza quando Haiku retorna hours=null", async () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    const fake: Estimator = {
      estimate: vi.fn().mockResolvedValue({ hours: null, reasoning: null }),
    };
    await estimateTaskHours(db, t.id, fake);
    expect(getTaskById(db, t.id)!.humanHoursEstimate).toBeNull();
    close();
  });
});
```

- [ ] **Step 2: Implementação**

```typescript
import {
  getTaskById, updateTask, type DbClient,
} from "@tracker/db";
import { HaikuClient } from "../refiner/haiku-client.js";
import { buildEstimatePrompt, parseEstimateResponse } from "../refiner/prompts.js";
import { recomputeBillableHours } from "../biller/biller.js";

export interface Estimator {
  estimate(input: { title: string; description?: string; filesTouched?: string[] }):
    Promise<{ hours: number | null; reasoning: string | null }>;
}

export class HaikuEstimator implements Estimator {
  constructor(private readonly client: HaikuClient) {}
  async estimate(input: { title: string; description?: string; filesTouched?: string[] }) {
    const { system, user } = buildEstimatePrompt(input);
    const text = await this.client.complete({ system, user, maxTokens: 256 });
    return parseEstimateResponse(text);
  }
}

export async function estimateTaskHours(
  db: DbClient,
  taskId: string,
  estimator: Estimator,
): Promise<void> {
  const task = getTaskById(db, taskId);
  if (!task) return;
  if (task.humanHoursSource === "manual") return;

  const result = await estimator.estimate({
    title: task.title,
    description: task.description ?? undefined,
  });
  if (result.hours === null) return;

  updateTask(db, taskId, {
    humanHoursEstimate: result.hours,
    humanHoursSource: "haiku",
    humanHoursReasoning: result.reasoning,
  });

  // Recompute billable após atualizar horas humanas
  recomputeBillableHours(db, taskId);
}
```

- [ ] **Step 3: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test estimator
git add apps/daemon/src/estimator/estimator.ts apps/daemon/src/estimator/estimator.test.ts
git commit -m "feat(daemon): estimateTaskHours via Haiku + recompute billable após"
```

---

### Task 52: Integrar refiner+estimator no scheduler do daemon

**Files:**
- Modify: `apps/daemon/src/scheduler.ts`
- Modify: `apps/daemon/src/index.ts`

- [ ] **Step 1: Adicionar fila Haiku ao tick**

Em `scheduler.ts`, adicionar nova função `runRefineAndEstimateBatch`:

```typescript
import { HaikuRefiner, listTasksEligibleForRefine, refineTask } from "./refiner/refiner.js";
import { HaikuEstimator, estimateTaskHours } from "./estimator/estimator.js";
import { listTasks, getSetting, type DbClient } from "@tracker/db";
import { HaikuClient } from "./refiner/haiku-client.js";

export interface RefineEstimateMetrics {
  refined: number;
  estimated: number;
}

export async function runRefineAndEstimateBatch(
  db: DbClient,
  client: HaikuClient,
  maxBatch = 10,
): Promise<RefineEstimateMetrics> {
  const refiner = new HaikuRefiner(client);
  const estimator = new HaikuEstimator(client);

  const refineThreshold = getSetting<number>(db, "haiku.autoRefineAboveTokens") ?? 5000;
  const autoEstimate = getSetting<boolean>(db, "haiku.autoEstimateHours") ?? true;

  const refineCandidates = listTasksEligibleForRefine(db, refineThreshold).slice(0, maxBatch);
  let refined = 0;
  for (const t of refineCandidates) {
    try { await refineTask(db, t.id, refiner); refined++; } catch {}
  }

  let estimated = 0;
  if (autoEstimate) {
    const candidates = listTasks(db, {}).filter((t) => t.humanHoursSource === "none").slice(0, maxBatch);
    for (const t of candidates) {
      try { await estimateTaskHours(db, t.id, estimator); estimated++; } catch {}
    }
  }

  return { refined, estimated };
}
```

- [ ] **Step 2: Modificar `index.ts` para invocar fila Haiku quando key existir**

No `tick()`:

```typescript
if (cfg.anthropicApiKey) {
  try {
    await withDaemonRun(db, "haiku-batch", async () => {
      const haikuClient = new HaikuClient({
        apiKey: cfg.anthropicApiKey!,
        model: "claude-haiku-4-5-20251001",
        requestsPerSecond: getSetting<number>(db, "haiku.requestsPerSecond") ?? 1,
      });
      await runRefineAndEstimateBatch(db, haikuClient, 5);
    });
  } catch (err) {
    log.warn("haiku batch failed", err);
  }
}
```

- [ ] **Step 3: Build e commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm build && pnpm test
git add apps/daemon/src/scheduler.ts apps/daemon/src/index.ts
git commit -m "feat(daemon): integra refine + estimate Haiku no tick principal"
```

---

## Milestone M14 — CLI

### Task 53: Inicializar `apps/cli`

**Files:**
- Create: `apps/cli/package.json`
- Create: `apps/cli/tsconfig.json`
- Create: `apps/cli/bin/lv-tracker.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@tracker/cli",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "lv-tracker": "./dist/bin/lv-tracker.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx bin/lv-tracker.ts",
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@tracker/db": "workspace:*",
    "@tracker/shared": "workspace:*",
    "@tracker/daemon": "workspace:*",
    "commander": "^12.1.0",
    "kleur": "^4.1.5",
    "prompts": "^2.4.2",
    "undici": "^7.0.0"
  },
  "devDependencies": {
    "@tracker/config": "workspace:*",
    "@types/node": "^20.17.10",
    "@types/prompts": "^2.4.9",
    "tsx": "^4.19.2",
    "typescript": "^5.6.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: tsconfig + entry**

`apps/cli/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "noEmit": false,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["bin/**/*", "src/**/*"]
}
```

`apps/cli/bin/lv-tracker.ts`:
```typescript
#!/usr/bin/env node
import { runCli } from "../src/index.js";

runCli(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Install + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm install
git add apps/cli pnpm-lock.yaml
git commit -m "feat(cli): inicializa @tracker/cli com commander"
```

---

### Task 54: `src/index.ts` + `ui.ts` + comandos básicos

**Files:**
- Create: `apps/cli/src/index.ts`
- Create: `apps/cli/src/ui.ts`
- Create: `apps/cli/src/commands/version.ts`
- Create: `apps/cli/src/commands/status.ts`

- [ ] **Step 1: ui.ts**

```typescript
import kleur from "kleur";

export const ui = {
  success: (msg: string) => console.log(kleur.green(`✓ ${msg}`)),
  info: (msg: string) => console.log(kleur.cyan(msg)),
  warn: (msg: string) => console.log(kleur.yellow(`⚠ ${msg}`)),
  error: (msg: string) => console.error(kleur.red(`✗ ${msg}`)),
  dim: (msg: string) => console.log(kleur.dim(msg)),

  table(rows: Array<Record<string, string | number>>) {
    if (rows.length === 0) {
      console.log(kleur.dim("(sem dados)"));
      return;
    }
    const keys = Object.keys(rows[0]!);
    const widths: Record<string, number> = {};
    for (const k of keys) {
      widths[k] = Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length));
    }
    const header = keys.map((k) => k.padEnd(widths[k]!)).join("  ");
    console.log(kleur.bold(header));
    console.log(kleur.dim(keys.map((k) => "─".repeat(widths[k]!)).join("  ")));
    for (const r of rows) {
      console.log(keys.map((k) => String(r[k] ?? "").padEnd(widths[k]!)).join("  "));
    }
  },

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m < 60) return `${m}m${s.toString().padStart(2, "0")}s`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h${mm.toString().padStart(2, "0")}m`;
  },

  formatUsd(amount: number): string {
    return `$${amount.toFixed(amount < 1 ? 4 : 2)}`;
  },
};
```

- [ ] **Step 2: commands/version.ts**

```typescript
import { ui } from "../ui.js";

export function versionCommand(): void {
  ui.info("lv-tracker 0.1.0 (Fase 1)");
}
```

- [ ] **Step 3: commands/status.ts**

```typescript
import { createClient, runMigrations, listDaemonRuns, getLatestCurrencyRate } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export function statusCommand(): void {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const latestRuns = listDaemonRuns(db, { limit: 5 });
  const lastTick = latestRuns.find((r) => r.kind === "tick");
  const lastError = latestRuns.find((r) => !r.ok);
  const rate = getLatestCurrencyRate(db);

  ui.info(`DB: ${cfg.dbPath}`);
  ui.info(`Claude projects: ${cfg.claudeProjectsDir}`);

  if (lastTick) {
    const ageMin = Math.round((Date.now() - lastTick.startedAt) / 60_000);
    if (lastTick.ok) ui.success(`Último tick OK há ${ageMin}min — ${lastTick.filesProcessed} arquivos`);
    else ui.error(`Último tick falhou há ${ageMin}min`);
  } else {
    ui.warn("Nenhum tick registrado ainda");
  }

  if (lastError) {
    ui.error(`Última falha (${lastError.kind}): ${lastError.errors ?? "(sem detalhes)"}`);
  }

  if (rate) {
    ui.info(`Cotação USD-BRL: ${rate.usdBrl.toFixed(4)} (${rate.date}, ${rate.source})`);
  } else {
    ui.warn("Cotação USD-BRL não registrada");
  }

  sqlite.close();
}
```

- [ ] **Step 4: src/index.ts**

```typescript
import { Command } from "commander";
import { versionCommand } from "./commands/version.js";
import { statusCommand } from "./commands/status.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name("lv-tracker")
    .description("CLI do LV Dev Tracker")
    .version("0.1.0");

  program.command("version").description("Versão").action(versionCommand);
  program.command("status").description("Status do daemon e dashboard").action(statusCommand);

  await program.parseAsync(argv);
}
```

- [ ] **Step 5: Build e teste manual**

```bash
cd /Users/luiz/dev/tracker/apps/cli && pnpm build
node dist/bin/lv-tracker.js --version
node dist/bin/lv-tracker.js status  # aponta DB inexistente — ok, vai criar via migrations
```

- [ ] **Step 6: Commit**

```bash
git add apps/cli
git commit -m "feat(cli): comandos version + status com kleur e DB direto"
```

---

### Task 55: Comandos sync / backfill / tasks-recent

**Files:**
- Create: `apps/cli/src/commands/sync.ts`
- Create: `apps/cli/src/commands/backfill.ts`
- Create: `apps/cli/src/commands/tasks-recent.ts`
- Modify: `apps/cli/src/index.ts`

- [ ] **Step 1: sync.ts**

```typescript
import { createClient, runMigrations, seedDatabase } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ClaudeCodeJsonlSource } from "@tracker/daemon/ingestor/claude-code-source";
import { runTick } from "@tracker/daemon/scheduler";
import { ui } from "../ui.js";

export async function syncCommand(): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  seedDatabase(db);

  ui.info("Forçando tick...");
  const source = new ClaudeCodeJsonlSource(cfg.claudeProjectsDir);
  const m = await runTick(db, source);
  ui.success(`Sync OK — ${m.filesProcessed} arquivos com delta, ${m.tasksClosedIdle} tasks fechadas por idle`);
  sqlite.close();
}
```

- [ ] **Step 2: backfill.ts**

```typescript
import { createClient, runMigrations, seedDatabase, listTasks } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ClaudeCodeJsonlSource } from "@tracker/daemon/ingestor/claude-code-source";
import { ingestAllPending } from "@tracker/daemon/ingestor/ingestor";
import { processMessages } from "@tracker/daemon/detector/detector";
import { getSetting, getSessionById, updateTask } from "@tracker/db";
import { ui } from "../ui.js";

export async function backfillCommand(): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  seedDatabase(db);

  const before = listTasks(db, {}).length;
  ui.info(`Antes: ${before} tasks`);

  const source = new ClaudeCodeJsonlSource(cfg.claudeProjectsDir);
  const deltas = await ingestAllPending(db, source);
  ui.info(`Processando ${deltas.length} arquivos...`);

  const settings = {
    gapMinutesBase: getSetting<number>(db, "detection.gapMinutesBase") ?? 30,
    nightHoursStart: getSetting<number>(db, "detection.nightHoursStart") ?? 23,
    nightHoursEnd: getSetting<number>(db, "detection.nightHoursEnd") ?? 9,
    semanticThreshold: getSetting<number>(db, "detection.semanticThreshold") ?? 0.65,
    resumeKeywords: getSetting<string[]>(db, "detection.resumeKeywords") ?? [],
    newTopicKeywords: getSetting<string[]>(db, "detection.newTopicKeywords") ?? [],
  };

  for (const delta of deltas) {
    const session = getSessionById(db, delta.file.sessionId);
    if (!session) continue;
    await processMessages(db, delta.file.sessionId, session.projectId, delta.messages, settings);
  }

  // Marca tasks recém-criadas como backfilled
  const after = listTasks(db, {});
  const newOnes = after.slice(0, after.length - before);
  for (const t of newOnes) updateTask(db, t.id, { isBackfilled: true });

  ui.success(`Backfill OK: ${newOnes.length} tasks novas marcadas como backfilled`);
  sqlite.close();
}
```

- [ ] **Step 3: tasks-recent.ts**

```typescript
import { createClient, runMigrations, listTasks, listProjects } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function tasksRecentCommand(opts: { limit?: number }): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const limit = opts.limit ?? 20;
  const tasks = listTasks(db, {}).slice(0, limit);
  const projects = listProjects(db);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "?";

  ui.table(tasks.map((t) => ({
    started: new Date(t.startedAt).toISOString().slice(0, 16).replace("T", " "),
    project: projectName(t.projectId).slice(0, 14),
    title: t.title.slice(0, 50),
    status: t.status,
    tokens: t.tokensInput + t.tokensOutput,
    cost: ui.formatUsd(t.costUsd),
    time: ui.formatDuration(t.timeTotalSeconds),
  })));

  sqlite.close();
}
```

- [ ] **Step 4: Registrar em index.ts**

Adicionar ao `runCli`:

```typescript
import { syncCommand } from "./commands/sync.js";
import { backfillCommand } from "./commands/backfill.js";
import { tasksRecentCommand } from "./commands/tasks-recent.js";

program.command("sync").description("Força tick imediato").action(syncCommand);
program.command("backfill").description("Processa todo histórico").action(backfillCommand);
program.command("tasks").description("Listagem de tasks").addCommand(
  new (require("commander").Command)("recent")
    .option("-n, --limit <n>", "limite", parseInt)
    .description("Tasks recentes")
    .action((opts: { limit?: number }) => tasksRecentCommand(opts)),
);
```

- [ ] **Step 5: Build, test manual, commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/cli/src/commands apps/cli/src/index.ts
git commit -m "feat(cli): comandos sync, backfill e tasks recent"
```

---

### Task 56: Comandos hours, refine, pricing add, currency, pause/resume, logs, open

**Files:**
- Create: `apps/cli/src/commands/hours.ts`
- Create: `apps/cli/src/commands/refine.ts`
- Create: `apps/cli/src/commands/pricing.ts`
- Create: `apps/cli/src/commands/currency.ts`
- Create: `apps/cli/src/commands/pause.ts`
- Create: `apps/cli/src/commands/resume.ts`
- Create: `apps/cli/src/commands/logs.ts`
- Create: `apps/cli/src/commands/open.ts`

- [ ] **Step 1: hours.ts (input interativo de horas)**

```typescript
import prompts from "prompts";
import { createClient, runMigrations, listTasks, updateTask } from "@tracker/db";
import { recomputeBillableHours } from "@tracker/daemon/biller/biller";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function hoursCommand(opts: { client?: string }): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const filter: { clientId?: string } = {};
  if (opts.client) filter.clientId = opts.client;

  const tasks = listTasks(db, filter).filter((t) => t.humanHoursEstimate === null);
  if (tasks.length === 0) { ui.success("Nenhuma task pendente de input de horas"); sqlite.close(); return; }

  ui.info(`${tasks.length} tasks sem horas humanas:`);
  for (const t of tasks.slice(0, 20)) {
    const r = await prompts({
      type: "number",
      name: "hours",
      message: `[${t.title.slice(0, 40)}] horas humanas (Enter pula)`,
      initial: 0,
      float: true,
    });
    if (r.hours && r.hours > 0) {
      updateTask(db, t.id, { humanHoursEstimate: r.hours, humanHoursSource: "manual" });
      recomputeBillableHours(db, t.id);
      ui.success(`OK ${r.hours}h`);
    }
  }

  sqlite.close();
}
```

- [ ] **Step 2: refine.ts**

```typescript
import { createClient, runMigrations, getTaskById, listTasks } from "@tracker/db";
import { HaikuClient } from "@tracker/daemon/refiner/haiku-client";
import { HaikuRefiner, refineTask } from "@tracker/daemon/refiner/refiner";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function refineCommand(taskIds: string[], opts: { backfilled?: boolean; project?: string }): Promise<void> {
  const cfg = loadConfig(process.env);
  if (!cfg.anthropicApiKey) { ui.error("ANTHROPIC_API_KEY não configurada"); process.exit(1); }

  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const client = new HaikuClient({ apiKey: cfg.anthropicApiKey, model: "claude-haiku-4-5-20251001" });
  const refiner = new HaikuRefiner(client);

  let targets: string[] = taskIds;
  if (opts.backfilled) {
    const filter: { projectId?: string } = {};
    if (opts.project) {
      const { listProjects } = await import("@tracker/db");
      const p = listProjects(db).find((p) => p.slug === opts.project);
      if (p) filter.projectId = p.id;
    }
    targets = listTasks(db, filter).filter((t) => t.isBackfilled && !t.refinedByHaiku).map((t) => t.id);
  }

  ui.info(`Refinando ${targets.length} tasks...`);
  for (const id of targets) {
    try {
      await refineTask(db, id, refiner);
      const t = getTaskById(db, id);
      ui.success(`${id} → ${t?.title}`);
    } catch (err) {
      ui.error(`${id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  sqlite.close();
}
```

- [ ] **Step 3: pricing.ts (add wizard)**

```typescript
import prompts from "prompts";
import { createClient, runMigrations, insertPricing } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function pricingAddCommand(): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  const r = await prompts([
    { type: "text", name: "model", message: "Modelo" },
    { type: "number", name: "input", message: "Input $/MTok", float: true },
    { type: "number", name: "output", message: "Output $/MTok", float: true },
    { type: "number", name: "cacheRead", message: "Cache read $/MTok", float: true, initial: 0 },
    { type: "number", name: "cacheCreation", message: "Cache creation $/MTok", float: true, initial: 0 },
    { type: "text", name: "validFrom", message: "Valid from (YYYY-MM-DD)" },
  ]);

  insertPricing(db, {
    model: r.model,
    inputPerMtok: r.input,
    outputPerMtok: r.output,
    cacheReadPerMtok: r.cacheRead,
    cacheCreationPerMtok: r.cacheCreation,
    validFrom: Date.parse(`${r.validFrom}T00:00:00Z`),
    validUntil: null,
    source: "manual",
  });
  ui.success("Pricing adicionado");
  sqlite.close();
}
```

- [ ] **Step 4: currency.ts**

```typescript
import { createClient, runMigrations, upsertCurrencyRate } from "@tracker/db";
import { updateCurrencyToday } from "@tracker/daemon/currency/updater";
import { formatDateBrt } from "@tracker/daemon/time";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export async function currencyCommand(opts: { manual?: number }): Promise<void> {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);

  if (opts.manual !== undefined) {
    const date = formatDateBrt(Date.now());
    upsertCurrencyRate(db, date, opts.manual, "manual");
    ui.success(`Cotação manual ${date} = ${opts.manual}`);
  } else {
    await updateCurrencyToday(db);
    ui.success("Cotação atualizada via AwesomeAPI");
  }
  sqlite.close();
}
```

- [ ] **Step 5: pause.ts / resume.ts (controlam settings flag)**

```typescript
// pause.ts
import { createClient, runMigrations, setSetting } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export function pauseCommand(): void {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  setSetting(db, "daemon.paused", true);
  ui.success("Daemon marcado como paused (próximo tick respeitará a flag)");
  sqlite.close();
}

// resume.ts
import { createClient, runMigrations, setSetting } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export function resumeCommand(): void {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  setSetting(db, "daemon.paused", false);
  ui.success("Daemon retomado");
  sqlite.close();
}
```

(O daemon precisa checar `daemon.paused` no início do tick — adicionar nessa task uma modificação em `apps/daemon/src/index.ts`.)

- [ ] **Step 6: logs.ts**

```typescript
import { createClient, runMigrations, listDaemonRuns } from "@tracker/db";
import { loadConfig } from "@tracker/daemon/config";
import { ui } from "../ui.js";

export function logsCommand(opts: { tail?: boolean; errors?: boolean }): void {
  const cfg = loadConfig(process.env);
  const { sqlite, db } = createClient(cfg.dbPath);
  runMigrations(db);
  const runs = listDaemonRuns(db, { limit: opts.tail ? 20 : 50 });
  const filtered = opts.errors ? runs.filter((r) => !r.ok) : runs;
  ui.table(filtered.map((r) => ({
    started: new Date(r.startedAt).toISOString().slice(0, 19).replace("T", " "),
    kind: r.kind,
    ok: r.ok ? "✓" : "✗",
    files: `${r.filesProcessed}/${r.filesScanned}`,
    tasks: `${r.tasksCreated}+${r.tasksUpdated}`,
    duration: r.endedAt ? `${((r.endedAt - r.startedAt) / 1000).toFixed(2)}s` : "running",
  })));
  sqlite.close();
}
```

- [ ] **Step 7: open.ts**

```typescript
import { execSync } from "node:child_process";
import { ui } from "../ui.js";

export function openCommand(): void {
  const url = "http://localhost:4833";
  ui.info(`Abrindo ${url}...`);
  try { execSync(`open "${url}"`); } catch { ui.warn("Falha ao abrir browser. URL: " + url); }
}
```

- [ ] **Step 8: Registrar todos no index.ts e commit**

Atualize `apps/cli/src/index.ts`:

```typescript
import { hoursCommand } from "./commands/hours.js";
import { refineCommand } from "./commands/refine.js";
import { pricingAddCommand } from "./commands/pricing.js";
import { currencyCommand } from "./commands/currency.js";
import { pauseCommand } from "./commands/pause.js";
import { resumeCommand } from "./commands/resume.js";
import { logsCommand } from "./commands/logs.js";
import { openCommand } from "./commands/open.js";

program.command("hours")
  .option("--client <id>", "filtrar por cliente")
  .description("Input interativo de horas humanas")
  .action((opts: { client?: string }) => hoursCommand(opts));

program.command("refine [taskIds...]")
  .option("--backfilled", "todos os backfilled não refinados")
  .option("--project <slug>", "filtrar por projeto")
  .description("Refinar tarefas via Haiku")
  .action((taskIds: string[], opts: { backfilled?: boolean; project?: string }) =>
    refineCommand(taskIds, opts));

program.command("pricing")
  .description("Gerencia model_pricing")
  .addCommand(new (require("commander").Command)("add").description("Adiciona row").action(pricingAddCommand));

program.command("currency")
  .option("--manual <value>", "set manual rate", parseFloat)
  .description("Atualiza ou define cotação manual")
  .action((opts: { manual?: number }) => currencyCommand(opts));

program.command("pause").description("Pausa daemon").action(pauseCommand);
program.command("resume").description("Retoma daemon").action(resumeCommand);
program.command("logs")
  .option("--tail", "tail")
  .option("--errors", "só erros")
  .description("Mostra daemon_runs")
  .action((opts: { tail?: boolean; errors?: boolean }) => logsCommand(opts));
program.command("open").description("Abre dashboard").action(openCommand);
```

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/cli
git commit -m "feat(cli): comandos hours, refine, pricing, currency, pause/resume, logs, open"
```

---

### Task 57: Daemon respeita flag `daemon.paused`

**Files:**
- Modify: `apps/daemon/src/index.ts`

- [ ] **Step 1: Adicionar check no tick**

No `tick()`, antes de chamar `runTick`:

```typescript
const paused = getSetting<boolean>(db, "daemon.paused");
if (paused === true) {
  log.info("daemon paused via setting, skipping tick");
  return;
}
```

(`getSetting` importado de `@tracker/db`.)

- [ ] **Step 2: Build, commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/daemon/src/index.ts
git commit -m "feat(daemon): respeita flag daemon.paused durante tick"
```

---

## Self-Review

**Spec coverage Plan 3:**
- §6.1 step 5 REFINE (Haiku auto): ✅ task 50, 52.
- §6.1 step 6 ESTIMATE (Haiku auto): ✅ task 51, 52.
- §6.4 redact: ✅ task 48 (via HaikuClient.complete).
- §10.7 rate limit Haiku: ✅ task 48 (p-throttle).
- §8 CLI completo: ✅ tasks 53–57.

**Limitações:**
- Refine envia apenas `task.title + task.description` ao Haiku (não transcript completo). Adequado para Fase 1 — refinamento melhor virá em Plan 4 ou Fase 1.5 quando passarmos delta de mensagens.
- `tasksCreated` em métricas continua impreciso (idem Plan 2).
- CLI não suporta cores no Windows (kleur autodetecta).

**Type consistency:** `Refiner` / `Estimator` interfaces injetáveis para testes; `HaikuRefiner` / `HaikuEstimator` são as impls.

---

## Execution Handoff

**Plan complete e salvo em** `docs/superpowers/plans/2026-05-02-lv-dev-tracker-fase1-plan3-ai-cli.md`.

Após executar este plano: daemon completo (com IA), CLI funcional. Próximo: Plan 4 (Dashboard Next.js).
