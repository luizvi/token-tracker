# LV Dev Tracker

Local platform that ingests Claude Code JSONL transcripts and produces
per-task token, cost (USD/BRL), time, and billable-hours analytics.

> Status: Phase 1 in development. See `docs/superpowers/specs/` for design
> and `docs/superpowers/plans/` for implementation plans.

## Architecture

- **Storage:** SQLite (WAL) at `data/tracker.db`.
- **Daemon:** Node service polling JSONLs every 60s, computing tasks via
  heuristic detection + optional Haiku refinement.
- **Dashboard:** Next.js standalone at `http://localhost:4833`.
- **CLI:** `lv-tracker` for status, sync, backfill, hours input.

## Development

```bash
pnpm install
pnpm test
pnpm build
```

Requires Node >=20 and pnpm >=9.

## License

UNLICENSED — proprietary. See `LICENSE`.
