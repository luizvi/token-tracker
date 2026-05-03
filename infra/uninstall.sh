#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"

echo "🔧 LV Dev Tracker — Uninstall"

launchctl bootout "gui/$(id -u)/com.lvdev.tracker.daemon" 2>/dev/null || true
launchctl bootout "gui/$(id -u)/com.lvdev.tracker.dashboard" 2>/dev/null || true

rm -f "$LAUNCHD_DIR/com.lvdev.tracker.daemon.plist"
rm -f "$LAUNCHD_DIR/com.lvdev.tracker.dashboard.plist"

echo "✓ LaunchAgents removidos"

read -r -p "Apagar data/ (DB + logs + backups)? [y/N] " resp
if [[ "$resp" =~ ^[Yy]$ ]]; then
  rm -rf "$ROOT/data"
  echo "✓ data/ removido"
else
  echo "✓ data/ preservado"
fi

echo ""
echo "✅ Uninstall concluído"
echo "Para remover lv-tracker do PATH global: pnpm --filter @tracker/cli unlink --global"
