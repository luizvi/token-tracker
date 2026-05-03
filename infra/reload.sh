#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "🔄 Reload..."
pnpm install --frozen-lockfile
pnpm build

launchctl kickstart -k "gui/$(id -u)/com.lvdev.tracker.daemon"
launchctl kickstart -k "gui/$(id -u)/com.lvdev.tracker.dashboard"

echo "✓ Daemon e dashboard reiniciados"

# Aguarda
for i in $(seq 1 15); do
  if curl -fsS -o /dev/null http://127.0.0.1:4833/api/health 2>/dev/null; then
    echo "✓ Dashboard respondendo"
    exit 0
  fi
  sleep 1
done

echo "⚠ Dashboard não respondeu em 15s"
