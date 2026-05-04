# token-tracker

Local-first token, cost, and time analytics for **Claude Code**.

`token-tracker` ingests your Claude Code JSONL transcripts (`~/.claude/projects/**`),
groups messages into "tasks" via heuristics, and shows you exactly how many tokens
you burned, in which project, against which client, for how much money — in USD
and BRL — plus billable hours derived from real conversation time.

It runs entirely on your machine. No data ever leaves the loopback interface.

It also doubles as a **Claude Code plugin** that adds slash commands so Claude
itself can open, pause, and close manual tasks against the local dashboard, and
ships a `registro-atividades` skill that combines `git log`, `claude-mem`, and
the tracker DB to generate timesheet-ready activity reports.

> **Status:** working, used daily by the author. macOS only (LaunchAgent-based).
> The repo is currently private while the API and schema stabilize.

---

## What you get

- **Per-task accounting** — every conversation chunk is sized in input/output/cache tokens, priced against `model_pricing` valid at the task's `started_at`, and tagged with elapsed wall-clock + active time.
- **USD ↔ BRL** — daily AwesomeAPI rate cached in `currency_rates`. BRL is computed at read time so historical reports stay consistent.
- **Per-client billable hours** — clients have hourly rates, monthly hour expectations, AI cost budgets, and contract dates. The dashboard forecasts margin and renewal.
- **Manual tasks** — for work outside Claude Code (meetings, manual coding, reviews). Started/paused/closed via slash command from any CC session.
- **Haiku refinement (optional)** — if `ANTHROPIC_API_KEY` is set, the daemon batches small Haiku calls to label tasks and estimate human-effort hours.
- **Dashboard** — Next.js standalone on `127.0.0.1:4833` with filtering, forecast, insights, transcript reconstruction across merged tasks, and contract-renewal tracking.
- **CLI** — `lv-tracker` for status, sync, backfill, refine, hours input, logs.
- **Diagnostics built in** — every daemon tick writes a row to `daemon_runs`; `/diagnostics` and `lv-tracker logs` read from there, not from log files.

---

## Architecture

```
~/.claude/projects/**.jsonl
        │   incremental tail (byte offset per session)
        ▼
┌──────────────────────────────────────────────────────┐
│  apps/daemon  (LaunchAgent — ticks every 60s)        │
│  ingestor → detector → biller → currency → refiner   │
│           → estimator → recalc → close-idle → backup │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
        data/tracker.db  (SQLite WAL — single writer)
               │
   ┌───────────┼───────────────┬────────────────┐
   ▼           ▼               ▼                ▼
 dashboard   CLI            Claude Code     claude-mem
 :4833    lv-tracker       slash commands   timeline
 (Next 15)                 (this plugin)    (separate plugin)
```

**Single-DB invariant.** Daemon, dashboard, and CLI all open the same SQLite
file (`data/tracker.db`) via the `@tracker/db` package, with WAL +
`foreign_keys=ON` + `synchronous=NORMAL`. The daemon is the only writer for
ingestion-derived data; the dashboard/CLI write only user-edited fields
(manual hours, settings, manual_events, manual tasks).

---

## Requirements

- **macOS** — the daemon and dashboard run as `launchctl` LaunchAgents. Linux/Windows are not supported today.
- **Node ≥ 20** — auto-detected by the installer.
- **pnpm ≥ 9** — enabled via `corepack` if missing.
- **`jq`** — used by the slash commands. `brew install jq`.
- **Claude Code** — to actually generate the JSONL transcripts being ingested.
- **(optional) Anthropic API key or Claude Code OAuth token** — without it, ingestion still runs; only Haiku refinement/estimation are skipped.

---

## Install

There are two install paths and they're independent. The **plugin** is what
gives Claude Code the slash commands. The **backend** is what ingests
transcripts and serves the dashboard. You typically want both.

### 1. Backend (daemon + dashboard + CLI)

```bash
git clone git@github.com:luizvi/token-tracker.git ~/dev/token-tracker
cd ~/dev/token-tracker
./infra/install.sh
```

The installer:

1. Verifies Node ≥ 20 and pnpm ≥ 9 (enables corepack if needed).
2. Prompts for `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` (skip both with Enter — daemon still works, just no Haiku refinement).
3. Runs `pnpm install`, applies migrations, builds all apps with Turbo.
4. Renders LaunchAgent plists from `infra/launchd/*.template`, copies them to `~/Library/LaunchAgents/`, and bootstraps them.
5. Verifies dashboard responds on `http://127.0.0.1:4833`.

Verify:

```bash
launchctl list | grep lvdev          # both agents listed with PIDs
lv-tracker status                    # short health summary
open http://127.0.0.1:4833           # or lv-tracker open
```

Other lifecycle scripts:

```bash
./infra/reload.sh        # re-install deps, rebuild, reload agents
./infra/uninstall.sh     # remove agents (preserves data/ unless confirmed)
./infra/smoke-test.sh    # 12 acceptance checks
```

### 2. Claude Code plugin (slash commands + skill)

This repo doubles as its own Claude Code marketplace, so you can install the
plugin directly from the GitHub URL once Claude Code can reach the repo.

```text
/plugin install luizvi/token-tracker
```

That registers four entries inside Claude Code:

| Entry | What it does |
|---|---|
| `/iniciar-task <título>` | Opens a manual task tagged with the current `cwd`. POSTs `/api/manual-tasks`. |
| `/pausar-task` | Pauses the open manual task for the current `cwd`. |
| `/concluir-task` | Closes the open manual task for the current `cwd`. |
| `registro-atividades` skill | Generates a per-day timesheet table from `git log` + `claude-mem` timeline + `token-tracker` task history. Triggered by phrases like "registro de atividades", "timesheet", "recapitular trabalho". |

The slash commands hit `http://127.0.0.1:${TRACKER_PORT:-4833}/api/manual-tasks`.
If the dashboard isn't running, the commands fail loudly — they don't queue.

---

## Usage

### CLI

```bash
lv-tracker status                          # summary: paused?, last tick, errors
lv-tracker sync                            # force tick now
lv-tracker backfill                        # one-shot full historical pass
lv-tracker tasks recent -n 20              # last N tasks
lv-tracker hours                           # interactive human-hours entry
lv-tracker refine --backfilled --project=<name>
lv-tracker logs --tail
lv-tracker open                            # opens the dashboard in browser
```

### Slash commands (from inside Claude Code)

```text
/iniciar-task implementando integração com webhook
# → opens manual task tagged with current $PWD

/pausar-task
# → pauses the open manual task

/concluir-task
# → closes the open manual task
```

### Activity report skill

```text
/registro-atividades últimas 2 semanas
```

Produces a markdown table with one row per day, descriptions consolidated
across git log, claude-mem timeline (if installed), `token-tracker` API, and
optionally `gh pr list`. Optional hour-estimate column.

---

## Integration with `claude-mem`

If you also have [`claude-mem`](https://github.com/thedotmack/claude-mem)
installed, the `registro-atividades` skill will pull from its timeline via
`mcp__plugin_claude-mem_mcp-search__timeline` and `__search`. This gives you
narrative context for days where commits don't tell the whole story
(investigations, PR reviews, decisions).

The integration is **read-only and optional** — `token-tracker` does not
require `claude-mem`, and vice versa. They are designed to coexist:

- `claude-mem` remembers _what was decided, learned, and shipped_.
- `token-tracker` measures _how much time, tokens, and money it cost_.

---

## Configuration

Environment variables (all optional except keys for Haiku features). Loaded
from `.env` at repo root by the daemon via `process.env`:

| Var | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Pay-as-you-go API key. Either this or OAuth token enables refiner/estimator. |
| `CLAUDE_CODE_OAUTH_TOKEN` | — | Max/Pro plan token (`claude setup-token`). Alternative to API key. |
| `TRACKER_ROOT` | `$HOME/dev/tracker` | Repo root. Override only for non-standard installs. |
| `TRACKER_DB_PATH` | `$TRACKER_ROOT/data/tracker.db` | SQLite file path. |
| `CLAUDE_PROJECTS_DIR` | `$HOME/.claude/projects` | Where to read JSONL from. |
| `TRACKER_TICK_INTERVAL_MS` | `60000` | Daemon tick interval. |
| `PORT` | `4833` | Dashboard port. |
| `HOSTNAME` | `127.0.0.1` | Dashboard bind. **Always loopback — there is no auth.** |
| `TRACKER_PORT` | `4833` | Used by slash commands to reach the dashboard. Override if you ran the dashboard on a different port. |

Runtime settings (gap thresholds, idle close hours, Haiku batching, daemon
pause flag) are stored in the `settings` table and editable from the
`/settings` page in the dashboard. Changes take effect on the next tick — no
daemon restart needed.

---

## Project layout

```
token-tracker/
├── .claude-plugin/plugin.json     # plugin manifest (this repo IS the plugin)
├── commands/                      # slash commands shipped by the plugin
│   ├── iniciar-task.md
│   ├── pausar-task.md
│   └── concluir-task.md
├── skills/registro-atividades/    # timesheet-generator skill
├── apps/
│   ├── daemon/                    # ingestor + detector + biller + currency + refiner
│   ├── dashboard/                 # Next 15 standalone, port 4833
│   └── cli/                       # lv-tracker binary
├── packages/
│   ├── shared/                    # pure utils (ULID, jaccard, redact, pricing)
│   ├── db/                        # Drizzle SQLite schema + queries + migrations
│   └── config/                    # shared eslint + prettier
├── infra/
│   ├── install.sh                 # full install
│   ├── reload.sh                  # rebuild + reload agents
│   ├── uninstall.sh               # remove agents (data/ preserved)
│   ├── smoke-test.sh              # 12 acceptance checks
│   └── launchd/                   # plist templates
├── docs/
│   └── superpowers/               # specs/, plans/, relatorios/
└── data/                          # runtime — gitignored
    ├── tracker.db                 # SQLite WAL
    ├── backups/                   # daily 03:00 BRT snapshots
    ├── logs/                      # daemon.{out,err}.log, dashboard.{out,err}.log
    └── state/                     # ingestor state
```

---

## Conventions

- **IDs** are ULIDs (lexicographically sortable, time-prefixed). No UUIDs, no autoincrement.
- **Time** is Unix ms integers. Daily/period grouping is BRT.
- **Money** is `real` (USD); BRL computed on read from `currency_rates`.
- **JSONL ingestion is append-only** — `sessions.last_processed_offset` is the byte offset; we never re-parse from zero unless explicitly backfilling.
- **Single writer.** Daemon writes ingestion-derived data. Dashboard/CLI write only user-edited fields.

---

## Troubleshooting

```bash
# Is the daemon running?
launchctl list | grep lvdev
# Both lines should show a PID. If one is "—" / "0", it crashed.

# Why did the last tick fail?
lv-tracker logs --tail
# Or read directly:
sqlite3 data/tracker.db "SELECT started_at, kind, ok, errors FROM daemon_runs ORDER BY started_at DESC LIMIT 10;"

# Dashboard not responding on :4833?
tail -50 data/logs/dashboard.err.log
./infra/reload.sh

# Native module / better-sqlite3 errors after Node upgrade?
pnpm rebuild better-sqlite3
./infra/reload.sh

# Slash command says "Connection refused"
curl -fsS http://127.0.0.1:4833/api/health
# If that fails, the dashboard agent is down. Reload:
launchctl kickstart -k gui/$UID/com.lvdev.tracker.dashboard
```

---

## Roadmap

- **Now:** stabilizing schema and dashboard. Repo is private; this README is the contract for any future public release.
- **Next:** SSE realtime updates, semantic embeddings as detector fallback, opt-in CC status line (`lv-tracker statusline`).
- **Later:** macOS-native menu-bar app, multi-machine sync (e.g. via iCloud-mounted DB or rsync hook), cross-platform daemon (Linux systemd unit).

---

## Security & privacy

- The dashboard binds **`127.0.0.1` only**. There is no auth; do not expose it.
- Transcripts contain whatever you typed and Claude returned. The daemon redacts obvious secrets (`packages/shared/src/redact.ts`) before persisting summaries, but the original JSONLs in `~/.claude/projects/` are untouched.
- `data/` (DB, backups, logs, state) is gitignored. `.env` is gitignored and chmod 600 by the installer.
- This project does not phone home, ship telemetry, or upload anything. It only calls AwesomeAPI for USD-BRL and (if you opt in) the Anthropic API for Haiku refinement.

---

## License

MIT — see [LICENSE](./LICENSE).
