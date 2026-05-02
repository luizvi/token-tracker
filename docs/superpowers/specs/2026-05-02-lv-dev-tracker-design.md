# LV Dev Tracker — Design Spec

**Status:** Draft awaiting user review
**Owner:** Luiz Vinicius (luizvi)
**Created:** 2026-05-02
**Scope:** Fase 1 — Token & Hours Tracker (sub-projeto A)
**Out of scope (para fases futuras, registrado):** Goals dos devs (B), macOS Time Tracker (C, repo separado), Notas (parte de B).

---

## 1. Resumo

Plataforma local rodando em `/Users/luiz/dev/tracker` que ingere os transcripts JSONL do Claude Code (em `~/.claude/projects/**`), agrupa mensagens em "tarefas" via heurística automática, calcula tokens, custo USD/BRL, tempos derivados e horas faturáveis por cliente, e expõe um dashboard web local em `http://localhost:4833`.

Fase 1 entrega: ingestão automática, detecção heurística de tarefas com refinamento opcional via Haiku, cálculo de custo com pricing histórico, conversão diária USD→BRL com histórico, dashboard com gráficos e edição (merge/split/edit/recalc), eventos manuais (reuniões), limites por cliente, e CLI `lv-tracker`.

A arquitetura é estruturada para ser distribuível como lib npm e/ou plugin Claude Code no futuro, sem refatoração — apenas rename + README + license.

## 2. Objetivos & Não-objetivos

**Objetivos:**

1. Saber quantos tokens cada **tarefa** consumiu (não só sessão inteira).
2. Saber custo em USD e BRL por tarefa, sessão, projeto, cliente, dia/semana/mês.
3. Estimar **horas humanas equivalentes** automaticamente (Haiku) com edição manual.
4. Calcular **horas faturáveis** com regra `(claude_time + human_estimate) / 2 × billable_factor`, onde `billable_factor` é editável global e per-cliente.
5. Acompanhar **limites de horas mensais/semanais por cliente** com projeção e alerta.
6. Registrar **eventos manuais** (reuniões etc.) que entram nos totais do cliente.
7. Operar **sem cerimônia manual** no fluxo do CC: detecção automática de fronteiras de tarefa.
8. Ser **agnóstico de projeto**: funciona com qualquer projeto que já use CC.
9. **Robusto e leve**: SQLite local, daemon longo-vivo via LaunchAgent, footprint mínimo.
10. Construído desde o início como código distribuível (lib futura).

**Não-objetivos da Fase 1:**

- Goals/metas dos devs (Alekssander, Igor) — Fase B.
- Time tracker macOS nativo — Fase C, repo separado.
- Notas livres — parte de Fase B.
- Push realtime UI (SSE) — daemon-only batch é suficiente.
- Auth/multi-usuário — bind loopback resolve.
- Suporte cross-platform — macOS-only (LaunchAgent).
- Embeddings semânticos — jaccard de tokens basta na Fase 1.

## 3. Decisões fechadas

| # | Decisão | Valor |
|---|---|---|
| 1 | Granularidade de tarefa | Ciclo coerente (vários turnos resolvendo um objetivo) |
| 2 | Detecção de fronteira | Heurística determinista + refinamento opcional via Haiku + fallback manual via UI/CLI |
| 3 | UI/Dashboard | Next.js 15 standalone em `localhost:4833` (bind loopback) |
| 4 | Storage | SQLite WAL local em `/Users/luiz/dev/tracker/data/tracker.db` |
| 5 | Modo de coleta | Daemon batch via LaunchAgent, varredura JSONL incremental a cada 60s |
| 6 | Backfill | Completo na primeira execução, marcado com flag `is_backfilled` |
| 7 | Modelo de tempos | 3 blocos derivados de tokens: input / processamento+output / leitura. Constantes editáveis em Settings |
| 8 | Estimativa humana | Haiku auto + edição manual; recalcula billable apenas sob clique |
| 9 | Custo | `model_pricing` versionado por modelo + `currency_rates` diários USD↔BRL com histórico |
| 10 | Taxonomia | Project (auto), Client (manual), Tags (manual) — schema completo na Fase 1 |
| 11 | Limite por cliente | `hour_limit_value` (NULL=ilimitado, max 200), por week ou month |
| 12 | Eventos manuais | Tabela própria, contam para horas do cliente, custo=0 |
| 13 | Paleta | Base claude-mem (marrom-quente light, preto-quente dark) + accent verde `#1fe879` (lvdev) |
| 14 | Tipografia | Monaspace Radon para números/timestamps; Inter para chrome |
| 15 | Schema | Inclui placeholders Fase 2 (devs/goals/notes) para evitar migration depois |
| 16 | Distribuição futura | Naming neutro (`@tracker/*`), config por env, `TranscriptSource` plugável, pricing seedável de JSON, sem dados pessoais no seed |

## 4. Estrutura do repositório

```
/Users/luiz/dev/tracker/
├── apps/
│   ├── dashboard/          # Next.js 15 standalone (UI + API routes)
│   │   ├── app/            # App router: /, /tasks, /tasks/[id], /clients,
│   │   │                   #  /clients/[id], /projects, /projects/[id],
│   │   │                   #  /events, /settings, /settings/pricing,
│   │   │                   #  /settings/currency, /diagnostics
│   │   ├── components/     # shadcn/ui customizado com tokens lvdev
│   │   ├── lib/            # client-side helpers
│   │   └── public/
│   ├── daemon/             # Node service (ingest + cotação + Haiku jobs)
│   │   ├── src/
│   │   │   ├── ingestor/   # Lê JSONL, identifica deltas, popula sessions
│   │   │   ├── detector/   # Heurística de fronteira de tarefa
│   │   │   ├── refiner/    # Haiku: refina título + categoria
│   │   │   ├── estimator/  # Haiku: estima horas humanas
│   │   │   ├── pricing/    # Calcula cost_usd por task
│   │   │   ├── currency/   # Fetch diário USD-BRL
│   │   │   ├── biller/     # Calcula billable_hours
│   │   │   ├── scheduler/  # Loop principal (60s + jobs nightly)
│   │   │   └── redact/     # Sanitização de segredos antes de mandar p/ Haiku
│   │   └── index.ts
│   └── cli/                # `lv-tracker` (binário pnpm-link global)
├── packages/
│   ├── db/                 # Drizzle ORM: schema, migrations, queries tipadas
│   ├── shared/             # Tipos, constantes, pricing seed (JSON), utils
│   └── config/             # tsconfig, eslint, prettier compartilhados
├── data/
│   ├── tracker.db          # SQLite WAL (gitignored)
│   ├── backups/            # Snapshots .db.gz (rotação 30 dias)
│   ├── logs/               # daemon.out.log, daemon.err.log,
│   │                       # dashboard.out.log, dashboard.err.log
│   └── state/
│       └── jsonl-cursors.json  # Posição lida em cada arquivo (cache)
├── infra/
│   ├── launchd/
│   │   ├── com.lvdev.tracker.daemon.plist.template
│   │   └── com.lvdev.tracker.dashboard.plist.template
│   ├── install.sh
│   ├── uninstall.sh
│   └── reload.sh
├── docs/
│   └── superpowers/specs/  # Este arquivo
├── package.json            # pnpm workspaces root
├── pnpm-workspace.yaml
├── turbo.json              # Builds incrementais
├── .env.example
├── .gitignore
├── LICENSE                 # UNLICENSED na Fase 1; trocar quando publicar
└── README.md
```

**Stack:**

- Node ≥20, TypeScript estrito, pnpm, Turbo
- Next.js 15 (App Router, output: 'standalone')
- React 19, Tailwind v4, shadcn/ui, Recharts, lucide-react
- SQLite via `better-sqlite3` + Drizzle ORM
- Daemon: Node puro com `setInterval`
- Haiku via `@anthropic-ai/sdk` (modelo `claude-haiku-4-5-20251001`)
- Cotação: `economia.awesomeapi.com.br/json/last/USD-BRL` (gratuita, sem cadastro)
- Fonte: Monaspace Radon (woff2 servido pelo dashboard) + Inter system fallback
- Validação: Zod para settings e payloads de API

## 5. Modelo de dados (SQLite)

### 5.1 Convenções

- PKs: `text` ULID gerado em app (ordenação cronológica natural).
- Timestamps: `integer` epoch milissegundos (sem timezone surprise).
- Monetário: `real` USD, 6 casas decimais.
- Booleans: `integer` 0/1 (sem tipo nativo no SQLite).
- Enums: `CHECK IN (...)` constraint.
- Índices em todas as FKs e colunas de filtro frequente.

### 5.2 Tabelas — Fase 1

```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hour_limit_value REAL,                 -- NULL = ilimitado
  hour_limit_period TEXT CHECK(hour_limit_period IN ('week','month')),
  billable_factor REAL DEFAULT 0.4,
  color TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cwd_path TEXT NOT NULL UNIQUE,
  claude_project_dir TEXT UNIQUE,
  client_id TEXT REFERENCES clients(id),
  color TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_projects_client ON projects(client_id);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                   -- uuid do JSONL (1:1 com filename)
  project_id TEXT NOT NULL REFERENCES projects(id),
  jsonl_path TEXT NOT NULL UNIQUE,
  started_at INTEGER,
  ended_at INTEGER,
  message_count INTEGER NOT NULL DEFAULT 0,
  total_tokens_input INTEGER NOT NULL DEFAULT 0,
  total_tokens_output INTEGER NOT NULL DEFAULT 0,
  total_tokens_cache_read INTEGER NOT NULL DEFAULT 0,
  total_tokens_cache_creation INTEGER NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  last_processed_offset INTEGER NOT NULL DEFAULT 0,
  last_processed_at INTEGER
);
CREATE INDEX idx_sessions_project ON sessions(project_id);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  client_id TEXT REFERENCES clients(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,                         -- feature|hotfix|refactor|research|...
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','paused','closed')),
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  first_message_uuid TEXT,
  last_message_uuid TEXT,

  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_cache_read INTEGER NOT NULL DEFAULT 0,
  tokens_cache_creation INTEGER NOT NULL DEFAULT 0,
  primary_model TEXT,
  models_used TEXT,                      -- JSON array

  time_input_seconds REAL NOT NULL DEFAULT 0,
  time_processing_output_seconds REAL NOT NULL DEFAULT 0,
  time_reading_seconds REAL NOT NULL DEFAULT 0,
  time_total_seconds REAL NOT NULL DEFAULT 0,

  human_hours_estimate REAL,
  human_hours_source TEXT NOT NULL DEFAULT 'none'
    CHECK(human_hours_source IN ('haiku','manual','none')),
  human_hours_reasoning TEXT,            -- preenchido pelo Haiku, editável

  billable_hours REAL,
  billable_hours_locked INTEGER NOT NULL DEFAULT 0,

  cost_usd REAL NOT NULL DEFAULT 0,

  is_backfilled INTEGER NOT NULL DEFAULT 0,
  refined_by_haiku INTEGER NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 1.0,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_tasks_project_started ON tasks(project_id, started_at DESC);
CREATE INDEX idx_tasks_client_started ON tasks(client_id, started_at DESC);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_started ON tasks(started_at DESC);
CREATE INDEX idx_tasks_session ON tasks(session_id);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);

CREATE TABLE manual_events (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  project_id TEXT REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'other'
    CHECK(kind IN ('meeting','call','review','other')),
  start_at INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_events_client_start ON manual_events(client_id, start_at DESC);
CREATE INDEX idx_events_project_start ON manual_events(project_id, start_at DESC);

CREATE TABLE model_pricing (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  input_per_mtok REAL NOT NULL,
  output_per_mtok REAL NOT NULL,
  cache_read_per_mtok REAL NOT NULL,
  cache_creation_per_mtok REAL NOT NULL,
  valid_from INTEGER NOT NULL,
  valid_until INTEGER,
  source TEXT NOT NULL DEFAULT 'manual'
);
CREATE INDEX idx_pricing_model_from ON model_pricing(model, valid_from DESC);

CREATE TABLE currency_rates (
  date TEXT PRIMARY KEY,                 -- 'YYYY-MM-DD'
  usd_brl REAL NOT NULL,
  source TEXT NOT NULL,                  -- 'manual'|'awesomeapi'|'bcb'
  fetched_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE daemon_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,                    -- 'tick'|'backfill'|'currency'|'refine'|'estimate'
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  files_scanned INTEGER NOT NULL DEFAULT 0,
  files_processed INTEGER NOT NULL DEFAULT 0,
  tasks_created INTEGER NOT NULL DEFAULT 0,
  tasks_updated INTEGER NOT NULL DEFAULT 0,
  errors TEXT,                           -- JSON
  ok INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_daemon_runs_started ON daemon_runs(started_at DESC);
```

### 5.3 Tabelas — Placeholders Fase 2 (criadas vazias)

```sql
CREATE TABLE devs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  github_handle TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  dev_id TEXT REFERENCES devs(id),
  title TEXT NOT NULL,
  description TEXT,
  target_at INTEGER,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK(scope IN ('global','project','client','task','dev')),
  scope_ref TEXT,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### 5.4 Settings — chaves padrão (JSON values)

| Key | Default | Significado |
|---|---|---|
| `time_per_input_token_seconds` | `0.5` | Tempo médio por token de input (humano escreve/cola contexto) |
| `time_per_processing_output_token_seconds` | `0.05` | Proxy de proc + geração |
| `time_per_reading_token_seconds` | `0.15` | Tempo médio de leitura/absorção do output |
| `cache_read_factor` | `0.1` | Fator aplicado a `cache_read_tokens` (cache é instantâneo, mas você ainda lê) |
| `billable_factor_default` | `0.4` | `(claude_h + human_h)/2 × factor` |
| `detection.gap_minutes_base` | `30` | Gap base para fechar tarefa |
| `detection.night_hours_start` | `23` | Início da janela noturna |
| `detection.night_hours_end` | `9` | Fim da janela noturna |
| `detection.semantic_threshold` | `0.65` | Jaccard mínimo p/ considerar mesmo tópico |
| `detection.resume_keywords` | `["voltando","retomando","continua","vamos seguir","volta"]` | Regex tokens |
| `detection.new_topic_keywords` | `["agora","outra coisa","muda de assunto","novo "]` | Regex tokens |
| `detection.idle_close_hours` | `6` | Fecha tarefa open inativa há > X horas |
| `haiku.auto_refine_above_tokens` | `5000` | Refina automaticamente tarefas acima desse tamanho |
| `haiku.auto_estimate_hours` | `true` | Estima horas humanas automaticamente |
| `haiku.max_concurrent` | `3` | Concorrência |
| `haiku.requests_per_second` | `1` | Throttle |
| `currency.preferred_display` | `"USD"` | USD ou BRL |
| `currency.fetch_at_hour_brt` | `6` | Hora local p/ atualizar cotação |

## 6. Fluxo de dados (Daemon)

### 6.1 Loop principal — a cada 60s

1. **DISCOVER** — varre `~/.claude/projects/*/*.jsonl`, compara `stat.size` com `last_processed_offset` em `sessions`, marca arquivos *dirty*.
2. **INGEST** — para cada arquivo dirty: garante row em `sessions`+`projects`, faz `seek(last_processed_offset)`, lê linha-a-linha até EOF, empilha mensagens no buffer da sessão. Atualiza offset.
3. **DETECT** — sobre o buffer, aplica heurística (§6.2) para definir/atualizar tasks.
4. **PRICE** — para cada task nova/atualizada: aplica `model_pricing` válido em `task.started_at`, calcula `tokens_* × pricing/1M`, soma `cost_usd`. Calcula 3 blocos de tempo via constantes em `settings`.
5. **REFINE** (assíncrono, fila) — tasks com `tokens > settings.haiku.auto_refine_above_tokens` OU (`is_backfilled=1` e `confidence < 0.7`) entram numa fila Haiku; concorrência limitada por settings; resposta atualiza `title`, `description`, `category`, `refined_by_haiku=1`.
6. **ESTIMATE** (assíncrono, fila) — tasks com `human_hours_source='none'` E `settings.haiku.auto_estimate_hours=true` recebem chute; resposta JSON `{ hours, reasoning }` grava `human_hours_estimate`, `human_hours_reasoning`, `human_hours_source='haiku'`.
7. **BILL** — tasks com `human_hours_estimate` definido E `billable_hours_locked=0`: aplica `(claude_h + human_h)/2 × billable_factor` (per-cliente se houver, senão default). Atualiza `billable_hours`.
8. **CURRENCY** — 1× por dia (06:00 BRT default): fetch `economia.awesomeapi.com.br/json/last/USD-BRL`, INSERT OR REPLACE em `currency_rates`. Backfill histórico de 365 dias na primeira execução.
9. **CLOSE-IDLE** — tasks `status='open'` com último msg > `settings.detection.idle_close_hours` E não em janela noturna → `status='closed'`.
10. **LOG** — INSERT em `daemon_runs`.

### 6.1.1 Recálculo em massa após mudança de settings

Quando o user salva uma chave de settings que afeta cálculos derivados (`time_per_*_token_seconds`, `cache_read_factor`, `billable_factor_default`), a API `POST /api/settings` enfileira um job no daemon (via socket UNIX em `data/state/daemon.sock` ou via `daemon_runs.kind='recalc'` que o daemon faz polling). O job percorre todas as tasks e recalcula:

- `time_input_seconds`, `time_processing_output_seconds`, `time_reading_seconds`, `time_total_seconds` sempre.
- `billable_hours` somente onde `billable_hours_locked=0`.

`cost_usd` **não** é afetado por settings (depende só de `model_pricing`); recalc dele ocorre apenas quando o user edita `model_pricing` via UI. Mesma mecânica de job.

### 6.2 Heurística de detecção

Para cada novo `user` message no buffer da sessão:

1. Se não há tarefa em construção → cria nova (start = msg.ts).
2. Se há tarefa em construção, calcula:
   - `gap = msg.ts - prev_assistant.ts` (segundos).
   - `is_resume` = regex `settings.detection.resume_keywords` match nos primeiros 200 chars.
   - `is_new_topic_kw` = regex `settings.detection.new_topic_keywords` match.
   - `is_skill_change` = invocou skill diferente da anterior.
   - `is_night_window` = `msg.hour ∈ [night_start, night_end)` (consideração de virada de dia).
   - `jaccard` = jaccard de tokens normalizados (min length 4, lowercase, sem stop-words PT/EN) entre primeiros 500 chars do user msg atual e dos últimos 2 user msgs.
3. Decisão:
   - Se `is_resume` → continua tarefa, `confidence=1.0`.
   - Se `is_night_window` E `gap > settings.detection.gap_minutes_base*60` → marca tarefa atual como `status='paused'`, **não** abre nova ainda; próxima msg fora da janela noturna decide se retoma (pelos sinais acima) ou abre nova.
   - Se `is_new_topic_kw` OU `is_skill_change` → fecha atual (`status='closed'`), abre nova, `confidence=1.0`.
   - Se `gap > settings.detection.gap_minutes_base*60` E `jaccard < settings.detection.semantic_threshold` → fecha atual, abre nova, `confidence=0.7`.
   - Se `gap > settings.detection.gap_minutes_base*60` E `jaccard ≥ threshold` → continua, `confidence=0.6` (caso ambíguo, marcado para review).
   - Default → continua, `confidence=1.0`.
4. Ao fechar uma tarefa: agrega tokens das mensagens, calcula `models_used` JSON (deduplicado), define `primary_model` (= modelo com maior soma de `output_tokens` na tarefa; em empate, o mais recente), grava em `tasks`.

### 6.3 Backfill (one-shot, primeira execução)

- Mesma pipeline acima, todas as tasks marcadas `is_backfilled=1`.
- Roda em background com prioridade baixa (`Nice 15`).
- Não dispara REFINE/ESTIMATE automaticamente (custo controlado).
- UI mostra progresso (`/diagnostics` + banner no topo).
- Operador pode disparar refinamento via UI ou `lv-tracker refine --backfilled --project=X`.

### 6.4 Sanitização (redact) antes do Haiku

- Implementada em `apps/daemon/src/redact/`.
- Regex extensível em `packages/shared/src/redact-patterns.ts`.
- Padrões: AKIA, AWS_SECRET_ACCESS_KEY, ANTHROPIC_API_KEY, generic `Bearer [A-Za-z0-9]{40,}`, `password=`, `passwd=`, `.env` lines com `=` e valor não vazio, GitHub PAT (ghp_, gho_, ghu_, ghs_), Stripe keys (sk_live_, pk_live_).
- Substituição: `[REDACTED:KIND]`.
- Aplicada em qualquer texto enviado para fora da máquina (Haiku).

## 7. UI / Dashboard

### 7.1 Mapa de rotas (Fase 1)

```
/                       Overview com KPIs e gráficos
/tasks                  Lista filtrável + ações em massa
/tasks/[id]             Detalhe da tarefa
/clients                Cards de clientes com progresso
/clients/[id]           Detalhe do cliente
/projects               Lista
/projects/[id]          Detalhe + associação cliente
/events                 CRUD de eventos manuais
/settings               Constantes de cálculo + detecção + Haiku + currency
/settings/pricing       CRUD de model_pricing
/settings/currency      Histórico USD-BRL + cotação manual
/diagnostics            daemon_runs (logs visuais)
/devs (placeholder)     Fase 2
/goals (placeholder)    Fase 2
/notes (placeholder)    Fase 2
```

### 7.2 Componentes-chave

**`<TaskTable>` — coração da UI.** Colunas: status (bolinha), title (com opacidade 60% se backfilled), project chip, client chip, tags chips, time_total, human_hours (+ badge `auto`), billable_hours (+ ícone lock), cost (USD ou BRL toggle global), started_at relativo, barra de confidence embaixo da row (vermelha < 0.6).

Ações em massa (checkboxes): merge, move to project, move to client, add tags, refine with Haiku, recalc billable, delete.

Ação por linha: split modal (lista user msgs com previews; clicar uma quebra a tarefa nesse ponto).

**`<OverviewKPIs>`** — 8 cards (tokens/custo hoje/semana/mês, top cliente, tarefas em aberto, refinos pendentes) + 3 gráficos Recharts: linha de custo USD por dia (30d), barra empilhada de tokens por projeto (semana), heatmap dia×hora.

**`<ClientCard>`** — barra de progresso `billable / limit`, velocidade (h/dia), projeção fim de período (verde/vermelho), sparkline 14d, badge "Ilimitado" se `hour_limit_value=NULL`.

**`<TaskDetail>`** — metadados, tokens detalhados por modelo, custo USD+BRL, 3 blocos de tempo, human_hours editável + reasoning, billable_hours editável + lock toggle + recalc, transcript expandível com tokens por turno, ações: refinar, dividir, mover, deletar.

**`<EventForm>`** — cliente, projeto opcional, kind, título, descrição, datetime, duration (presets 15/30/60/120), tags.

**`<Settings>`** — sliders dos 3 blocos de tempo com preview "tarefa típica X tokens daria Y min", inputs para detecção, toggles Haiku, billable_factor_default, currency display.

### 7.3 Estilo visual

- Sidebar 240px, background `--color-bg-secondary` claude-mem (marrom-quente light, preto-quente dark).
- Header sticky com filters globais (project multi, period, USD/BRL toggle, search).
- Cards: border 1px, radius 6px, paleta claude-mem.
- Accent `#1fe879` em: progresso OK, badge `auto`, botões primários, hover de links.
- Vermelho: erros daemon, cliente acima do limite, confidence < 0.6.
- Monaspace Radon para tudo numérico; Inter para UI chrome.
- Sem responsivo mobile; target ≥1280px.

### 7.4 API routes (Next.js)

```
GET  /api/tasks?project=&client=&period=&status=&q=
GET  /api/tasks/[id]
PATCH /api/tasks/[id]
POST /api/tasks/merge                       { taskIds: string[] }
POST /api/tasks/[id]/split                  { atMessageUuid: string }
POST /api/tasks/[id]/refine
POST /api/tasks/[id]/estimate-hours
POST /api/tasks/[id]/recalc-billable
POST /api/tasks/[id]/lock                   toggle billable_hours_locked
DELETE /api/tasks/[id]

GET/POST /api/clients
PATCH/DELETE /api/clients/[id]

GET/POST /api/projects
PATCH/DELETE /api/projects/[id]

GET/POST /api/events
PATCH/DELETE /api/events/[id]

GET/POST /api/tags
PATCH/DELETE /api/tags/[id]

GET /api/settings
POST /api/settings                          { key: string, value: any }

GET/POST/PATCH/DELETE /api/pricing
GET/POST /api/currency
POST /api/currency/manual                   { date, usd_brl }

GET /api/stats/overview?period=
GET /api/stats/by-project?period=
GET /api/stats/by-client?period=
GET /api/stats/heatmap?period=

GET /api/diagnostics?limit=&kind=
GET /api/health
```

UI consome via `fetch` do client side. Polling de 30s no overview/tasks. SSE deferred para Fase 1.5.

## 8. CLI `lv-tracker`

```
lv-tracker status                    Daemon up? Dashboard up? Última run?
lv-tracker sync [--project=X]        Força um ciclo do daemon agora
lv-tracker backfill [--since=DATE] [--project=X]
lv-tracker tasks recent [-n 20]      Tarefas recentes no terminal
lv-tracker tasks show <id>           Detalhe de uma task
lv-tracker hours [--client=X]        Batch interativo de input de horas humanas
lv-tracker refine <task-id|--backfilled> [--project=X]
lv-tracker pricing add               Wizard p/ adicionar row em model_pricing
lv-tracker currency [--manual=4.97]  Atualizar cotação ou definir manual
lv-tracker pause                     Pausa daemon (sem desinstalar)
lv-tracker resume
lv-tracker logs [--tail] [--errors]
lv-tracker open                      Abre localhost:4833
lv-tracker version
```

CLI compartilha `packages/db` e `packages/shared` com daemon — zero divergência de schema/queries.

## 9. Operação (LaunchAgent + Install)

### 9.1 Instalação (`infra/install.sh`)

1. Verifica Node ≥20 e pnpm; instala pnpm via `corepack enable` se faltar.
2. `pnpm install` no monorepo.
3. `pnpm --filter @tracker/db migrate` aplica schema.
4. Pede `ANTHROPIC_API_KEY` interativamente; grava `.env` (chmod 600).
5. `pnpm build` (Turbo: dashboard standalone + daemon bundle + cli).
6. `pnpm --filter @tracker/cli link --global` → comando `lv-tracker` no PATH.
7. Backfill histórico de cotação USD-BRL (1 chamada bulk).
8. Substitui placeholders nos `.plist.template` (`${HOME}`, `${TRACKER_ROOT}`) e copia para `~/Library/LaunchAgents/`.
9. `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.lvdev.tracker.daemon.plist`.
10. `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.lvdev.tracker.dashboard.plist`.
11. Aguarda `/api/health` em `localhost:4833`.
12. Dispara backfill em background.
13. `open http://localhost:4833`.

### 9.2 LaunchAgents

**Daemon plist** (`com.lvdev.tracker.daemon.plist`):
- `RunAtLoad=true`, `KeepAlive=true`.
- `WorkingDirectory=${TRACKER_ROOT}`.
- `ProgramArguments`: `node apps/daemon/dist/index.js`.
- `EnvironmentVariables`: carrega de `.env` (incluindo `ANTHROPIC_API_KEY`, `NODE_ENV=production`).
- `StandardOutPath=data/logs/daemon.out.log`, `StandardErrorPath=data/logs/daemon.err.log`.
- `ProcessType=Background`, `Nice=10`.
- `ThrottleInterval=10` (anti-flap).

**Dashboard plist** (`com.lvdev.tracker.dashboard.plist`):
- `RunAtLoad=true`, `KeepAlive=true`.
- `ProgramArguments`: `node apps/dashboard/.next/standalone/server.js`.
- `EnvironmentVariables`: `PORT=4833`, `HOSTNAME=127.0.0.1`, `NODE_ENV=production`.
- `StandardOutPath=data/logs/dashboard.out.log`, `StandardErrorPath=data/logs/dashboard.err.log`.
- `ProcessType=Background`, `Nice=10`.

### 9.3 Footprint esperado

- Daemon ocioso: ~80MB RAM, <1% CPU médio.
- Dashboard standalone ocioso: ~100MB RAM, ~zero CPU.
- SQLite WAL: poucos MB; backups gz rotacionados.

### 9.4 Reload / Update

`infra/reload.sh`:
- `git pull && pnpm install && pnpm build`.
- Drizzle migrations idempotentes aplicadas no startup.
- `launchctl kickstart -k gui/$(id -u)/com.lvdev.tracker.daemon`.
- `launchctl kickstart -k gui/$(id -u)/com.lvdev.tracker.dashboard`.

### 9.5 Desinstalação (`infra/uninstall.sh`)

- `launchctl bootout` ambos agentes.
- Remove `.plist` de `~/Library/LaunchAgents/`.
- Pergunta antes de apagar `data/`.

### 9.6 Backups

- Job nightly do daemon: `sqlite3 tracker.db ".backup data/backups/tracker-YYYY-MM-DD.db"` + gzip.
- Mantém últimos 30 backups.
- WAL checkpoint antes do backup.

## 10. Segurança

1. Bind apenas em `127.0.0.1:4833` — sem exposição na LAN.
2. Sem auth na Fase 1 (mono-usuário local). Token-based opcional na Fase 2 se expor via Tailscale/tunnel.
3. `.env` com chmod 600.
4. `ANTHROPIC_API_KEY` só usado pelo daemon; UI nunca chama Anthropic direto.
5. `.gitignore` cobre `.env`, `data/`, `*.log`, `node_modules/`, `.next/`, `dist/`, `*.db`, `*.db-shm`, `*.db-wal`.
6. Transcripts são lidos read-only — daemon nunca escreve em `~/.claude/projects/`.
7. Sanitização (redact) obrigatória antes de mandar texto para Haiku (§6.4).
8. Rate limit interno: 1 req/s para Haiku, retry exponencial até 3x em 429/5xx.
9. CSP no Next.js: `default-src 'self'`, sem `unsafe-eval`.

## 11. Observabilidade

- `daemon_runs` é a primeira camada (visível em `/diagnostics`).
- Logs em arquivo (rotacionados por tamanho, max 10MB × 5 arquivos).
- `/api/health` retorna `{ daemon: { lastRun, ok, lag_seconds }, db: 'ok', dashboard: 'ok' }`.
- Status line opcional do CC (Fase 1.5): `lv-tracker statusline` retorna `tokens-hoje:1.2M | $4.30 | sinusal:open` para uso em `~/.claude/settings.json`.

## 12. Distribuição futura (não-objetivo Fase 1, mas habilitado)

- Naming neutro: `@tracker/db`, `@tracker/shared`, `@tracker/daemon`, `@tracker/dashboard`, `@tracker/cli`.
- Configuração por env (paths, port, db location, claude_projects_dir) com defaults sensatos.
- `TranscriptSource` interface plugável; default `ClaudeCodeJsonlSource`. Permite suporte futuro a Codex/Cursor sem refator.
- `model_pricing` seedável de `packages/shared/pricing/anthropic.json` versionado.
- Sem dados pessoais no seed (clientes Sinusal/Mamute/etc são populados pelo user no install).
- License `UNLICENSED` na Fase 1; trocar para MIT/Apache no momento da publicação.
- README minimalista pronto para crescer (arquitetura, install, troubleshooting).
- LaunchAgent é macOS-only; cross-platform (systemd Linux, Task Scheduler Windows) entra quando houver demanda.

## 13. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Heurística de fronteira erra muito → tarefas mal cortadas | UI permite merge/split com 1 clique; refinamento Haiku como segunda camada; constantes ajustáveis em Settings; flag `confidence` destaca casos ambíguos |
| Estimativa de horas humana via Haiku descalibrada | Edição manual sempre possível; `billable_hours_locked` previne sobrescrita; `human_hours_reasoning` permite auditar |
| Pricing desatualizado quando Anthropic muda preço | Tabela versionada com `valid_from/valid_until`; UI permite editar; warning visual se modelo sem pricing válido |
| API de cotação cair | Tabela permite cotação manual; fallback usa última cotação válida; UI alerta em `/diagnostics` |
| Daemon trava ou crasha | LaunchAgent `KeepAlive=true` reinicia; `daemon_runs` registra falhas; logs persistem; `lv-tracker status` revela problemas |
| SQLite corrompido | Backups diários + WAL mode reduzem chance; `lv-tracker restore` (Fase 1.5) restaura do backup mais recente |
| Volume de transcripts crescer muito | Ingestão incremental por offset evita reprocessamento; índices em colunas de filtro mantêm queries rápidas; SQLite aguenta GBs sem dor |
| Vazamento de segredos via Haiku | Camada de redact obrigatória; lista regex extensível; teste unitário de `redact()` no CI |
| Hook do CC interferir no fluxo | Fase 1 não usa hooks (puro batch); arquitetura prevê hooks só na Fase 1.5+ se necessário |

## 14. Plano de fases

**Fase 1 (este spec):** Token & Hours Tracker funcional ponta-a-ponta. Esperado: ~10 commits de schema/migrations, ~20 commits de daemon, ~15 commits de UI, ~5 de CLI, ~5 de infra. Ordem proposta:

1. Bootstrap monorepo (pnpm workspaces, turbo, tsconfig, eslint).
2. `packages/db`: schema Drizzle + migrations + seed pricing.
3. `apps/daemon` ingestor mínimo (lê JSONL, popula sessions/tasks sem heurística).
4. `apps/daemon` detector (heurística + jaccard).
5. `apps/daemon` pricing + billing + currency.
6. `apps/daemon` refiner + estimator (Haiku) com redact.
7. `apps/cli` comandos básicos.
8. `apps/dashboard` skeleton + `/tasks` + `/tasks/[id]`.
9. `apps/dashboard` `/clients` + `/projects` + `/events`.
10. `apps/dashboard` `/` overview com gráficos.
11. `apps/dashboard` `/settings` + `/diagnostics` + pricing/currency.
12. `infra/` install/uninstall/reload + LaunchAgents.
13. Smoke test ponta-a-ponta + backfill.

**Fase 1.5 (opcional, sem comprometer Fase 1):** SSE realtime, embeddings semânticos se jaccard fraco, status line do CC, hooks plugáveis.

**Fase 2 (sub-projeto B):** Devs, Goals, Notes — usa schema já criado.

**Fase 3 (sub-projeto C):** macOS Time Tracker, repo separado, comunicação via SQLite compartilhado ou API local.

## 15. Critérios de aceitação Fase 1

1. `./infra/install.sh` em máquina limpa termina com dashboard rodando em `localhost:4833` e backfill em progresso.
2. Após backfill, `/tasks` lista tarefas históricas dos 17 projetos com tokens, custo, project, e flag `is_backfilled`.
3. Posso criar cliente, associar projetos, definir limite mensal e ver progresso em `/clients/[id]`.
4. Posso criar evento manual e ele entra nos totais do cliente.
5. Posso editar `time_per_*_token_seconds` em `/settings` e ver `time_total_seconds` recalcular para tarefas existentes.
6. Posso refinar uma tarefa via UI e ver `title` melhorado em <30s.
7. Posso editar `human_hours_estimate`, clicar "Recalc billable" e ver o valor atualizar pela fórmula.
8. Posso travar `billable_hours` e ele não é sobrescrito por reruns automáticos.
9. `/diagnostics` mostra última run do daemon e qualquer erro.
10. `lv-tracker status` retorna estado do daemon e dashboard.
11. Reiniciar Mac → ambos agentes voltam sozinhos.
12. Pressionar `Ctrl+C` numa sessão de CC não afeta nada do tracker (isolamento total).
