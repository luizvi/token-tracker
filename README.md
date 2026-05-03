# LV Dev Tracker

Local platform that ingests Claude Code JSONL transcripts and produces
per-task token, cost (USD/BRL), time, and billable-hours analytics.

## Status

**Fase 1 — pronto.** 5 plans executados, ~150 commits, ~150 tests passando.

## Arquitetura

```
┌──────────────┐  reads JSONL    ┌─────────────────┐
│ ~/.claude/   │ ──────────────▶ │ apps/daemon     │
│ projects/**  │                  │ (LaunchAgent)   │
└──────────────┘                  └────────┬────────┘
                                           │
                                  ┌────────▼────────┐
                                  │ data/tracker.db │
                                  │ (SQLite WAL)    │
                                  └────────┬────────┘
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                ┌─────────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
                │ apps/dashboard │ │ apps/cli     │ │ AwesomeAPI   │
                │ Next.js :4833  │ │ lv-tracker   │ │ (USD-BRL)    │
                └────────────────┘ └──────────────┘ └──────────────┘
```

## Install

```bash
cd /Users/luiz/dev/tracker
./infra/install.sh
```

Requisitos:
- macOS (LaunchAgent)
- Node ≥20
- pnpm ≥9 (auto via corepack)

## Uso

```bash
# Status
lv-tracker status

# Forçar tick imediato
lv-tracker sync

# Processar histórico completo
lv-tracker backfill

# Tasks recentes
lv-tracker tasks recent -n 20

# Input interativo de horas humanas
lv-tracker hours

# Refinar tarefas via Haiku
lv-tracker refine --backfilled --project=sinusal-legado

# Logs do daemon
lv-tracker logs --tail

# Abrir dashboard
lv-tracker open
# ou diretamente: http://localhost:4833
```

## Scripts

- `./infra/install.sh` — install completo
- `./infra/uninstall.sh` — desinstala (preserva data/ a menos que confirmado)
- `./infra/reload.sh` — reinstala deps, build, reinicia agentes
- `./infra/smoke-test.sh` — valida 12 critérios de aceitação

## Critérios de aceitação Fase 1

1. ✅ `./infra/install.sh` em máquina limpa termina com dashboard rodando
2. ✅ Backfill processa JSONLs históricos com `is_backfilled=true`
3. ✅ Cliente com limite de horas + barra de progresso em `/clients`
4. ✅ Eventos manuais somam nas horas faturáveis do cliente
5. ✅ Settings → recálculo em massa de `time_total_seconds`
6. ✅ Refinamento via Haiku atualiza title em <30s
7. ✅ Editar `human_hours_estimate` + recalc dispara fórmula
8. ✅ `billable_hours_locked=true` previne sobrescrita
9. ✅ `/diagnostics` mostra last run + erros
10. ✅ `lv-tracker status` retorna estado
11. ✅ `KeepAlive=true` reinicia agentes após reboot
12. ✅ Daemon isolado de sessões CC

## Estrutura

```
tracker/
├── apps/
│   ├── daemon/        # Ingestor + detector + biller + currency
│   ├── dashboard/     # Next.js standalone
│   └── cli/           # lv-tracker
├── packages/
│   ├── shared/        # Utils puros (ULID, jaccard, redact, pricing)
│   ├── db/            # Schema Drizzle SQLite + queries
│   └── config/        # ESLint + Prettier
├── infra/
│   ├── install.sh
│   ├── uninstall.sh
│   ├── reload.sh
│   ├── smoke-test.sh
│   └── launchd/       # plists templates
├── docs/
│   └── superpowers/
│       ├── specs/     # 1 spec
│       ├── plans/     # 5 plans encadeados
│       └── relatorios/ # Relatórios de execução
└── data/              # Runtime (gitignored)
    ├── tracker.db
    ├── backups/
    ├── logs/
    └── state/
```

## Próximas fases

- **Fase 1.5** (opcional, sem comprometer Fase 1): SSE realtime, embeddings semânticos se jaccard fraco, status line CC, hooks plugáveis.
- **Fase 2 (sub-projeto B):** Devs, Goals, Notes — schema já criado.
- **Fase 3 (sub-projeto C):** macOS Time Tracker — repo separado.

## License

UNLICENSED — proprietary. See `LICENSE`. Será trocado para MIT/Apache na publicação.
