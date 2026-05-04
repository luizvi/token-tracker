# token-tracker

Analytics local-first de tokens, custo e tempo para o **Claude Code**.

> Versão em inglês: [`docs/i18n/README.en.md`](./docs/i18n/README.en.md) (mantida como base para futura internacionalização — pode ficar desatualizada em relação a este).

O `token-tracker` lê os transcripts JSONL do Claude Code (`~/.claude/projects/**`),
agrupa as mensagens em "tarefas" via heurística e mostra exatamente quantos
tokens você queimou, em qual projeto, contra qual cliente, por quanto dinheiro —
em USD e BRL — além das horas faturáveis derivadas do tempo real de conversa.

Roda 100% na sua máquina. Nenhum dado sai da interface de loopback.

Também funciona como **plugin do Claude Code**: adiciona slash commands para o
próprio Claude abrir, pausar e fechar tasks manuais contra o dashboard local, e
inclui a skill `registro-atividades` que combina `git log`, `claude-mem` e o
banco do tracker para gerar relatórios de atividades prontos para planilha de
horas.

> **Status:** funcional, em uso diário pelo autor. macOS apenas (LaunchAgent).
> O repositório está privado enquanto API e schema estabilizam.

---

## O que você ganha

- **Contabilidade por tarefa** — cada bloco de conversa é dimensionado em tokens de input/output/cache, precificado contra `model_pricing` válido no `started_at` da tarefa, e marcado com tempo de relógio + tempo ativo.
- **USD ↔ BRL** — taxa diária da AwesomeAPI cacheada em `currency_rates`. BRL é computado em tempo de leitura, então relatórios históricos ficam consistentes.
- **Horas faturáveis por cliente** — clientes têm hourly rate, expectativa de horas mensais, budget de custo de IA e datas contratuais. O dashboard projeta margem e renovação.
- **Tasks manuais** — para trabalho fora do Claude Code (reuniões, código manual, reviews). Iniciadas/pausadas/fechadas via slash command de qualquer sessão CC.
- **Refinamento via Haiku (opcional)** — se `ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN` estiver configurado, o daemon faz batches de chamadas pequenas ao Haiku para nomear tarefas e estimar horas-humano.
- **Dashboard** — Next.js standalone em `127.0.0.1:4833` com filtros, forecast, insights, reconstrução de transcript em tarefas mescladas e tracking de renovação contratual.
- **CLI** — `lv-tracker` para status, sync, backfill, refine, input de horas, logs.
- **Diagnóstico embutido** — todo tick do daemon escreve uma linha em `daemon_runs`; `/diagnostics` e `lv-tracker logs` leem dali, não dos arquivos de log.

---

## Arquitetura

```
~/.claude/projects/**.jsonl
        │   tail incremental (offset em bytes por sessão)
        ▼
┌──────────────────────────────────────────────────────┐
│  apps/daemon  (LaunchAgent — tick a cada 60s)        │
│  ingestor → detector → biller → currency → refiner   │
│           → estimator → recalc → close-idle → backup │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
        data/tracker.db  (SQLite WAL — escritor único)
               │
   ┌───────────┼───────────────┬────────────────┐
   ▼           ▼               ▼                ▼
 dashboard   CLI            Claude Code     claude-mem
 :4833    lv-tracker       slash commands   timeline
 (Next 15)                 (este plugin)    (plugin separado)
```

**Invariante de DB único.** Daemon, dashboard e CLI abrem o mesmo arquivo
SQLite (`data/tracker.db`) via o pacote `@tracker/db`, com WAL +
`foreign_keys=ON` + `synchronous=NORMAL`. O daemon é o único escritor para
dados derivados de ingestão; dashboard/CLI escrevem só campos editados pelo
usuário (manual hours, settings, manual_events, manual tasks).

---

## Requisitos

- **macOS** — daemon e dashboard rodam como LaunchAgents (`launchctl`). Linux/Windows não são suportados hoje.
- **Node ≥ 20** — auto-detectado pelo instalador.
- **pnpm ≥ 9** — habilitado via `corepack` se faltando.
- **`jq`** — usado pelos slash commands. `brew install jq`.
- **Claude Code** — para gerar os transcripts JSONL que serão ingeridos.
- **(opcional) chave Anthropic API ou token OAuth do Claude Code** — sem isso a ingestão ainda funciona; só refinamento/estimativa via Haiku ficam desligados.

---

## Instalação

São dois caminhos independentes. O **plugin** dá ao Claude Code os slash
commands. O **backend** ingere transcripts e serve o dashboard. Normalmente
você quer os dois.

### 1. Backend (daemon + dashboard + CLI)

```bash
git clone git@github.com:luizvi/token-tracker.git ~/dev/token-tracker
cd ~/dev/token-tracker
./infra/install.sh
```

O instalador:

1. Verifica Node ≥ 20 e pnpm ≥ 9 (habilita corepack se necessário).
2. Pergunta `ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN` (Enter pula ambos — daemon ainda funciona, só sem refinamento Haiku).
3. Roda `pnpm install`, aplica migrations, builda todos os apps com Turbo.
4. Renderiza os plists do LaunchAgent a partir de `infra/launchd/*.template`, copia para `~/Library/LaunchAgents/` e bootstrap.
5. Verifica que o dashboard responde em `http://127.0.0.1:4833`.

Verificar:

```bash
launchctl list | grep lvdev          # ambos os agents listados com PID
lv-tracker status                    # resumo curto de saúde
open http://127.0.0.1:4833           # ou: lv-tracker open
```

Outros scripts de ciclo de vida:

```bash
./infra/reload.sh        # reinstala deps, rebuilda, recarrega agents
./infra/uninstall.sh     # remove agents (preserva data/ a menos que confirmado)
./infra/smoke-test.sh    # 12 critérios de aceitação
```

### 2. Plugin do Claude Code (slash commands + skill)

Este repositório também é seu próprio marketplace do Claude Code, então dá pra
instalar o plugin direto da URL do GitHub assim que o Claude Code conseguir
alcançar o repo.

```text
/plugin install luizvi/token-tracker
```

Isso registra quatro entradas dentro do Claude Code:

| Entrada | O que faz |
|---|---|
| `/iniciar-task <título>` | Abre uma task manual marcada com o `cwd` atual. POST em `/api/manual-tasks`. |
| `/pausar-task` | Pausa a task manual aberta para o `cwd` atual. |
| `/concluir-task` | Fecha a task manual aberta para o `cwd` atual. |
| skill `registro-atividades` | Gera tabela diária de timesheet a partir de `git log` + timeline do `claude-mem` + histórico do `token-tracker`. Disparada por frases como "registro de atividades", "timesheet", "recapitular trabalho". |

Os slash commands batem em `http://127.0.0.1:${TRACKER_PORT:-4833}/api/manual-tasks`.
Se o dashboard não estiver rodando, os comandos falham na cara — não enfileiram.

---

## Uso

### CLI

```bash
lv-tracker status                          # resumo: pausado?, último tick, erros
lv-tracker sync                            # força tick agora
lv-tracker backfill                        # passada histórica completa, uma vez
lv-tracker tasks recent -n 20              # últimas N tarefas
lv-tracker hours                           # entrada interativa de horas humanas
lv-tracker refine --backfilled --project=<nome>
lv-tracker logs --tail
lv-tracker open                            # abre o dashboard no browser
```

### Slash commands (de dentro do Claude Code)

```text
/iniciar-task implementando integração com webhook
# → abre task manual marcada com $PWD atual

/pausar-task
# → pausa a task manual aberta

/concluir-task
# → fecha a task manual aberta
```

### Skill de relatório de atividades

```text
/registro-atividades últimas 2 semanas
```

Gera uma tabela markdown com uma linha por dia, descrições consolidando git
log, timeline do `claude-mem` (se instalado), API do `token-tracker` e,
opcionalmente, `gh pr list`. Coluna de estimativa de horas é opcional.

---

## Integração com `claude-mem`

Se você também tem [`claude-mem`](https://github.com/thedotmack/claude-mem)
instalado, a skill `registro-atividades` puxa do timeline dele via
`mcp__plugin_claude-mem_mcp-search__timeline` e `__search`. Isso te dá
contexto narrativo nos dias em que os commits sozinhos não contam a história
toda (investigações, reviews de PR, decisões).

A integração é **somente leitura e opcional** — `token-tracker` não precisa do
`claude-mem`, e vice-versa. Foram desenhados para coexistir:

- `claude-mem` lembra _o que foi decidido, aprendido e entregue_.
- `token-tracker` mede _quanto tempo, tokens e dinheiro custou_.

---

## Configuração

Variáveis de ambiente (todas opcionais exceto chaves para features Haiku).
Carregadas de `.env` na raiz do repo pelo daemon via `process.env`:

| Var | Default | Função |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Chave API pay-as-you-go. Esta ou o OAuth token habilitam refiner/estimator. |
| `CLAUDE_CODE_OAUTH_TOKEN` | — | Token do plano Max/Pro (`claude setup-token`). Alternativa à API key. |
| `TRACKER_ROOT` | `$HOME/dev/tracker` | Raiz do repo. Sobrescrever só para installs não-padrão. |
| `TRACKER_DB_PATH` | `$TRACKER_ROOT/data/tracker.db` | Path do arquivo SQLite. |
| `CLAUDE_PROJECTS_DIR` | `$HOME/.claude/projects` | De onde ler o JSONL. |
| `TRACKER_TICK_INTERVAL_MS` | `60000` | Intervalo do tick do daemon. |
| `PORT` | `4833` | Porta do dashboard. |
| `HOSTNAME` | `127.0.0.1` | Bind do dashboard. **Sempre loopback — não há auth.** |
| `TRACKER_PORT` | `4833` | Usada pelos slash commands para alcançar o dashboard. Sobrescrever se você rodou o dashboard em outra porta. |

Settings de runtime (gap thresholds, idle close hours, batching do Haiku, flag
de pausa do daemon) ficam na tabela `settings` e são editáveis pela página
`/settings` do dashboard. Mudanças entram em vigor no próximo tick — sem
restart do daemon.

---

## Layout do projeto

```
token-tracker/
├── .claude-plugin/plugin.json     # manifesto do plugin (este repo É o plugin)
├── commands/                      # slash commands do plugin
│   ├── iniciar-task.md
│   ├── pausar-task.md
│   └── concluir-task.md
├── skills/registro-atividades/    # skill geradora de timesheet
├── apps/
│   ├── daemon/                    # ingestor + detector + biller + currency + refiner
│   ├── dashboard/                 # Next 15 standalone, porta 4833
│   └── cli/                       # binário lv-tracker
├── packages/
│   ├── shared/                    # utils puros (ULID, jaccard, redact, pricing)
│   ├── db/                        # schema Drizzle SQLite + queries + migrations
│   └── config/                    # eslint + prettier compartilhados
├── infra/
│   ├── install.sh                 # install completo
│   ├── reload.sh                  # rebuild + recarrega agents
│   ├── uninstall.sh               # remove agents (data/ preservado)
│   ├── smoke-test.sh              # 12 critérios de aceitação
│   └── launchd/                   # templates de plist
├── docs/
│   ├── i18n/README.en.md          # versão em inglês para internacionalização futura
│   └── superpowers/               # specs/, plans/, relatorios/
└── data/                          # runtime — gitignored
    ├── tracker.db                 # SQLite WAL
    ├── backups/                   # snapshots diários 03:00 BRT
    ├── logs/                      # daemon.{out,err}.log, dashboard.{out,err}.log
    └── state/                     # estado do ingestor
```

---

## Convenções

- **IDs** são ULIDs (ordenáveis lexicograficamente, com prefixo de tempo). Sem UUID, sem autoincrement.
- **Tempo** é Unix ms (inteiro). Agrupamento diário/por período em BRT.
- **Dinheiro** é `real` (USD); BRL é computado na leitura a partir de `currency_rates`.
- **Ingestão JSONL é append-only** — `sessions.last_processed_offset` é o offset em bytes; nunca reparseia do zero a menos que seja backfill explícito.
- **Escritor único.** Daemon escreve dados de ingestão. Dashboard/CLI só escrevem campos editados pelo usuário.

---

## Troubleshooting

```bash
# O daemon está rodando?
launchctl list | grep lvdev
# Ambas as linhas devem mostrar PID. Se uma estiver "—" / "0", crashou.

# Por que o último tick falhou?
lv-tracker logs --tail
# Ou direto no DB:
sqlite3 data/tracker.db "SELECT started_at, kind, ok, errors FROM daemon_runs ORDER BY started_at DESC LIMIT 10;"

# Dashboard não responde em :4833?
tail -50 data/logs/dashboard.err.log
./infra/reload.sh

# Erro de native module / better-sqlite3 após upgrade do Node?
pnpm rebuild better-sqlite3
./infra/reload.sh

# Slash command diz "Connection refused"
curl -fsS http://127.0.0.1:4833/api/health
# Se isso falhar, o agent do dashboard caiu. Recarrega:
launchctl kickstart -k gui/$UID/com.lvdev.tracker.dashboard
```

---

## Roadmap

- **Agora:** estabilizando schema e dashboard. Repo privado; este README é o contrato pra qualquer release público futuro.
- **Próximo:** updates SSE em tempo real, embeddings semânticos como fallback do detector, status line opcional do CC (`lv-tracker statusline`), README internacionalizado a partir do backup em `docs/i18n/`.
- **Depois:** app nativo macOS na menu bar, sync multi-máquina (DB no iCloud ou hook rsync), daemon multiplataforma (unidade systemd no Linux).

---

## Segurança & privacidade

- O dashboard escuta **só `127.0.0.1`**. Não há auth; não exponha.
- Transcripts contêm tudo o que você digitou e o que o Claude respondeu. O daemon redacts segredos óbvios (`packages/shared/src/redact.ts`) antes de persistir resumos, mas os JSONL originais em `~/.claude/projects/` ficam intocados.
- `data/` (DB, backups, logs, state) é gitignored. `.env` é gitignored e fica em `chmod 600` após o instalador.
- Este projeto não faz phone home, não envia telemetria, não sobe nada. Só chama a AwesomeAPI para USD-BRL e (se você optar) a API da Anthropic para refinamento Haiku.

---

## Licença

MIT — veja [LICENSE](./LICENSE).
