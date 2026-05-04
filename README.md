# token-tracker

> **Sabe exatamente quanto cada projeto Claude Code te custou — em tokens, dólar, real e horas faturáveis.**
> Local-first. Roda na sua máquina, não sobe nada. Built para devs que tratam IA como custo e horas como receita.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Plugin Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![macOS](https://img.shields.io/badge/macOS-supported-black?logo=apple)]()
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Luiz%20Vi-0A66C2?logo=linkedin)](https://www.linkedin.com/in/luiz-vi/)

> 🇺🇸 English version: [`docs/i18n/README.en.md`](./docs/i18n/README.en.md) (mantida como base para futura internacionalização — pode estar desatualizada).

---

## O problema

Você usa Claude Code todo dia. No fim do mês:

- Não sabe **qual cliente queimou mais token**.
- Não sabe **se o projeto X ainda tá dando margem** ou se o custo de IA virou prejuízo.
- Lembra "mais ou menos" das horas trabalhadas — e na hora de faturar, chuta.
- Olha pro `console.anthropic.com` e vê só um número agregado, sem dizer onde foi gasto.

`token-tracker` resolve isso lendo os transcripts JSONL do próprio Claude Code (`~/.claude/projects/**`), agrupando mensagens em "tarefas" via heurística, e mostrando — por tarefa, projeto e cliente — quantos tokens, quanto USD/BRL, quanto tempo, e quantas horas faturáveis. Tudo em um dashboard local em `127.0.0.1:4833`.

**Nada sai da sua máquina.** Sem telemetria. Sem cloud. Sem auth porque é loopback.

---

## Pra quem é

Se você se reconhece em qualquer um desses, vai gostar:

🧑‍💻 **Dev solo / freela faturando por hora**
Quer saber se a hora cobrada cobre o custo de IA, e quer relatório de horas pronto pra planilha do cliente.

🏢 **Agência ou estúdio com múltiplos contratos**
Vários projetos rodando em paralelo, cada um com hourly rate, budget mensal de IA, data de renovação. Precisa ver margem por cliente, não só custo total.

🔬 **Dev solo controlando uso pessoal**
Tem plano Max/Pro e quer entender onde tá o custo escondido — qual repo, qual sessão, qual tarefa virou rabbit hole. Tracking obsessivo de produtividade pessoal.

Se você só usa Claude Code casualmente e não cobra ninguém por isso, este projeto provavelmente é overkill — mas você é bem-vindo.

---

## O que você vê no dashboard

- **Tarefas** com título refinado por Haiku, custo USD/BRL, duração de relógio, tempo ativo, horas humanas estimadas.
- **Forecast por cliente** — projeção de horas faturáveis e margem até o fim do mês, comparando contra hourly rate e budget de IA contratado.
- **Renovação contratual** — datas de início/fim, alerta de aproximação.
- **Insights via Haiku (opcional)** — resumo executivo do mês com base em revenue + custos reais.
- **Tasks manuais** — pra trabalho fora do Claude Code (reuniões, código manual, reviews). Iniciadas/pausadas/fechadas via slash command de qualquer sessão CC.
- **Diagnóstico embutido** — toda execução do daemon escreve métrica em `daemon_runs`; `/diagnostics` e `lv-tracker logs` leem dali, não dos arquivos de log.

> 💡 **Status:** funcional, em uso diário pelo autor desde o início de 2026. macOS apenas (LaunchAgent). Open source MIT.

---

## Como funciona (visão de 30 segundos)

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

**Invariante de DB único.** Daemon, dashboard e CLI abrem o mesmo arquivo SQLite (`data/tracker.db`) via o pacote `@tracker/db`, com WAL + `foreign_keys=ON` + `synchronous=NORMAL`. O daemon é o único escritor para dados derivados de ingestão; dashboard/CLI escrevem só campos editados pelo usuário (manual hours, settings, manual_events, manual tasks).

---

## Uso no dia a dia

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

Gera uma tabela markdown com uma linha por dia, descrições consolidando git log, timeline do `claude-mem` (se instalado), API do `token-tracker` e, opcionalmente, `gh pr list`. Coluna de estimativa de horas é opcional.

---

## Instalação

São dois caminhos independentes. O **plugin** dá ao Claude Code os slash commands. O **backend** ingere transcripts e serve o dashboard. Normalmente você quer os dois.

### Requisitos

- **macOS** — daemon e dashboard rodam como LaunchAgents (`launchctl`). Linux/Windows não são suportados hoje.
- **Node ≥ 20** — auto-detectado pelo instalador.
- **pnpm ≥ 9** — habilitado via `corepack` se faltando.
- **`jq`** — usado pelos slash commands. `brew install jq`.
- **Claude Code** — para gerar os transcripts JSONL que serão ingeridos.
- **(opcional) chave Anthropic API ou token OAuth do Claude Code** — sem isso a ingestão ainda funciona; só refinamento/estimativa via Haiku ficam desligados.

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

Este repositório também é seu próprio marketplace do Claude Code, então dá pra instalar o plugin direto da URL do GitHub.

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

Os slash commands batem em `http://127.0.0.1:${TRACKER_PORT:-4833}/api/manual-tasks`. Se o dashboard não estiver rodando, os comandos falham na cara — não enfileiram.

---

## Integração com `claude-mem`

Se você também tem [`claude-mem`](https://github.com/thedotmack/claude-mem) instalado, a skill `registro-atividades` puxa do timeline dele via `mcp__plugin_claude-mem_mcp-search__timeline` e `__search`. Isso te dá contexto narrativo nos dias em que os commits sozinhos não contam a história toda (investigações, reviews de PR, decisões).

A integração é **somente leitura e opcional** — `token-tracker` não precisa do `claude-mem`, e vice-versa. Foram desenhados para coexistir:

- `claude-mem` lembra _o que foi decidido, aprendido e entregue_.
- `token-tracker` mede _quanto tempo, tokens e dinheiro custou_.

---

## Configuração

Variáveis de ambiente (todas opcionais exceto chaves para features Haiku). Carregadas de `.env` na raiz do repo pelo daemon via `process.env`:

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

Settings de runtime (gap thresholds, idle close hours, batching do Haiku, flag de pausa do daemon) ficam na tabela `settings` e são editáveis pela página `/settings` do dashboard. Mudanças entram em vigor no próximo tick — sem restart do daemon.

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

- **Agora:** estabilizando schema, dashboard e API pública.
- **Próximo:** updates SSE em tempo real, embeddings semânticos como fallback do detector, status line opcional do CC (`lv-tracker statusline`), README internacionalizado a partir do backup em `docs/i18n/`.
- **Depois:** app nativo macOS na menu bar, sync multi-máquina (DB no iCloud ou hook rsync), daemon multiplataforma (unidade systemd no Linux).

Tem ideia, dor parecida ou caso de uso interessante? Abre uma issue ou me chama no [LinkedIn](https://www.linkedin.com/in/luiz-vi/).

---

## Segurança & privacidade

- O dashboard escuta **só `127.0.0.1`**. Não há auth; não exponha.
- Transcripts contêm tudo o que você digitou e o que o Claude respondeu. O daemon redacts segredos óbvios (`packages/shared/src/redact.ts`) antes de persistir resumos, mas os JSONL originais em `~/.claude/projects/` ficam intocados.
- `data/` (DB, backups, logs, state) é gitignored. `.env` é gitignored e fica em `chmod 600` após o instalador.
- Este projeto **não faz phone home**, não envia telemetria, não sobe nada. Só chama a AwesomeAPI para USD-BRL e (se você optar) a API da Anthropic para refinamento Haiku.

---

## Apoie o projeto

Este projeto é open source e gratuito. Se ele te economizou tempo, dor de cabeça ou descobriu um cliente que tava no prejuízo, considere:

- ⭐ **Dar uma estrela no repo** — ajuda outras pessoas a encontrarem.
- 💸 **Pix (Brasil)** — chave aleatória: `28ab8119-c379-479d-bf2f-03f17eb7cfa1`
- 💼 **LinkedIn** — [Luiz Vi](https://www.linkedin.com/in/luiz-vi/) (conecta, comenta, compartilha — alcance vale tanto quanto Pix)
- 🐛 **Issue ou PR** — feedback honesto vale mais que doação. Se algo quebrou, me conta.

Se você usa o tracker num contexto comercial (agência, estúdio, time), considera dar uma referência no LinkedIn ou indicar pra colegas — isso ajuda muito mais do que parece.

---

## Licença

MIT — veja [LICENSE](./LICENSE).
