# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo

Local-only macOS platform that ingests Claude Code JSONL transcripts (`~/.claude/projects/**`) and produces per-task token, cost (USD/BRL), time, and billable-hours analytics. Runs as two LaunchAgents (daemon + dashboard) backed by a single SQLite WAL DB at `data/tracker.db`.

Monorepo: pnpm workspace + Turborepo. Node ≥20, pnpm ≥9 (corepack). ESM-only (`"type": "module"` everywhere). TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`.

## Commands

All run from repo root unless noted. Turbo handles cross-package build deps.

```bash
pnpm build                          # turbo run build (all)
pnpm test                           # turbo run test (all)
pnpm typecheck                      # turbo run typecheck
pnpm lint                           # turbo run lint
pnpm clean                          # turbo run clean + rm node_modules .turbo

# Single package
pnpm --filter @tracker/daemon test
pnpm --filter @tracker/db test
pnpm --filter @tracker/dashboard build

# Single test file (any package)
pnpm --filter @tracker/daemon exec vitest run src/scheduler.test.ts
pnpm --filter @tracker/daemon exec vitest run -t "test name fragment"

# DB
pnpm --filter @tracker/db db:generate     # drizzle-kit generate (after editing schema.ts)
pnpm --filter @tracker/db db:migrate      # apply migrations to TRACKER_DB_PATH

# Dashboard dev
pnpm --filter @tracker/dashboard dev      # next dev on :4833

# Daemon dev (tsx watch — no LaunchAgent)
pnpm --filter @tracker/daemon dev

# CLI dev (without install)
pnpm --filter @tracker/cli dev -- status
```

## Infra / lifecycle

The dashboard and daemon normally run as `launchctl` LaunchAgents — not via `pnpm dev`. Use the infra scripts; do not hand-edit installed plists (templates live in `infra/launchd/`).

```bash
./infra/install.sh        # full install: deps + migrations + build + plists + bootstrap
./infra/reload.sh         # reinstall deps, rebuild, reload agents
./infra/uninstall.sh      # remove agents (preserves data/ unless confirmed)
./infra/smoke-test.sh     # 12 acceptance checks

launchctl list | grep lvdev
tail -f data/logs/daemon.err.log data/logs/dashboard.err.log
```

The dashboard build has a **post-build step** (`apps/dashboard/scripts/copy-native-modules.mjs`) that copies `better-sqlite3`, `bindings`, `file-uri-to-path` from the pnpm store into `.next/standalone/`, plus `.next/static` and `public/`. Next.js standalone does not trace pnpm-symlinked native modules or static assets correctly — if you change Next config or move native deps, that script is what makes the standalone server actually serve assets and load SQLite. Don't bypass it.

## Architecture

```
~/.claude/projects/**.jsonl  →  apps/daemon (LaunchAgent, ticks every 60s)
                                    │
                                    ├── ingestor          (incremental JSONL tail, offset in sessions.last_processed_offset)
                                    ├── detector          (task boundary via gap+jaccard+keywords)
                                    ├── biller            (cost USD via model_pricing × tokens)
                                    ├── currency/updater  (AwesomeAPI USD-BRL, daily)
                                    ├── refiner           (Haiku titles for tasks > N tokens)
                                    ├── estimator         (Haiku human_hours_estimate)
                                    ├── recalc            (bulk time_total_seconds rebuild)
                                    ├── close-idle        (auto-close after detection.idleCloseHours)
                                    └── backup            (sqlite snapshot 03:00 BRT → data/backups/)
                                            │
                                    data/tracker.db (SQLite WAL, single writer = daemon, readers = dashboard + cli)
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                ▼                           ▼                           ▼
       apps/dashboard (Next 15)    apps/cli (lv-tracker)         (any reader)
       :4833 standalone            commander-based CLI
```

**Single-DB invariant.** All three apps open the same `data/tracker.db` via `@tracker/db`'s `createClient` → enables WAL, `foreign_keys=ON`, `synchronous=NORMAL`. The dashboard memoizes the handle in `apps/dashboard/src/lib/db.ts`. The daemon is the only intended writer for ingestion-derived data; the dashboard/CLI write only user-edited fields (manual hours, settings, manual_events).

**Daemon tick** (`apps/daemon/src/index.ts` → `runTick` in `scheduler.ts`):
1. Check `settings.daemon.paused` — skip if true.
2. `ingestAllPending` — for each JSONL, read from `last_processed_offset` and append-parse new messages.
3. `processMessages` per session — runs detector to assign messages to tasks (creating new ones at boundaries).
4. `closeIdleTasks` — close anything past idle threshold.
5. Once/day: currency update + `runRefineAndEstimateBatch` (Haiku, gated by `ANTHROPIC_API_KEY`) + 03:00 backup.

Every tick (and currency/backup/haiku-batch) is wrapped by `withDaemonRun` which writes a row to `daemon_runs` with metrics + ok/errors. That table powers `/diagnostics` and `lv-tracker logs` — when debugging, read `daemon_runs` first, not the log files.

**Settings are runtime-mutable.** `settings` table is JSON keyed by string (e.g. `detection.gapMinutesBase`, `haiku.autoEstimateHours`, `daemon.paused`). Changes via `/settings` page take effect on the next tick — no daemon restart needed. The keys consumed by the scheduler are listed in `runTick` and `runRefineAndEstimateBatch`; keep that contract in sync with `packages/shared/src/settings-schema.ts`.

## Packages

- **`packages/shared`** — pure utils, no I/O: ULID, jaccard similarity, redact (PII), pricing math, time-calc, settings schema, stopwords, transcript-source interface. Imported by everything; must stay dependency-free.
- **`packages/db`** — Drizzle SQLite schema + queries + migrations. `index.ts` re-exports all `queries/*` plus `createClient`, `runMigrations`, `seedDatabase`. Schema is the source of truth; regenerate migrations with `db:generate` after edits and commit both.
- **`packages/config`** — shared eslint + prettier configs (cjs).
- **`apps/daemon`** — exposes subpath exports for each module (see its `package.json` `exports`) so the dashboard can import e.g. `@tracker/daemon/refiner/refiner` without bundling the whole daemon.
- **`apps/dashboard`** — Next 15 App Router, server components by default, `output: "standalone"`, server-only deps (`better-sqlite3`, `bindings`) are in `serverExternalPackages` and webpack externals. Tailwind + Radix + recharts + shadcn-style components.
- **`apps/cli`** — `lv-tracker` binary, commander + prompts. Imports daemon modules directly to trigger sync/backfill/refine in-process (no IPC).

## Conventions

- **IDs** are ULIDs (`packages/shared/src/ulid.ts`). Don't use UUIDs or autoincrement.
- **Time** is stored as Unix ms integers (`ts(name)` helper in schema). Daily/period grouping is BRT — use `formatDateBrt` from `apps/daemon/src/time.ts`.
- **Money** is `real` (USD), with `costUsd` derived from `tokens_* × model_pricing` valid at task `started_at`. BRL is computed at read time from `currency_rates`.
- **Booleans** in schema use the `bool()` helper (integer with mode `boolean`).
- **Strings discriminating unions** use Drizzle's `text(..., { enum: [...] })` — keep enum literal arrays exhaustive.
- **JSONL ingestion is append-only**: `last_processed_offset` is byte offset; never re-parse from zero unless explicitly backfilling. The ingestor is the single source of truth for what's been seen.

## Documentation

- `docs/superpowers/specs/` — design specs (1 per feature)
- `docs/superpowers/plans/` — phased implementation plans
- `docs/relatorios/` — execution reports

When asked to plan or design new features, follow the superpowers workflow (specs → plans → execution reports). Existing artifacts cover Fase 1 (foundation, daemon-core, ai-cli, dashboard, infra-smoke).

## Environment

`.env` at repo root, loaded by daemon via `process.env`:
- `ANTHROPIC_API_KEY` — optional; without it, refiner/estimator are skipped (tick still runs).
- `TRACKER_ROOT` — defaults to `~/dev/tracker`.
- `TRACKER_DB_PATH` — defaults to `$TRACKER_ROOT/data/tracker.db`.
- `CLAUDE_PROJECTS_DIR` — defaults to `~/.claude/projects`.
- `TRACKER_TICK_INTERVAL_MS` — defaults to 60000.
- Dashboard: `PORT=4833`, `HOSTNAME=127.0.0.1` (always loopback — no auth in front of the dashboard).

## User preferences (global)

The user runs OrbStack, not Docker Desktop. If `docker` CLI fails with `~/.docker/run/docker.sock: connect: no such file`, run `docker context use orbstack`.
