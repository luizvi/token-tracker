#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "🧪 LV Dev Tracker — Smoke Test"
echo ""

# 1. Dashboard healthcheck
echo "1. Dashboard /api/health"
if curl -fsS http://127.0.0.1:4833/api/health > /tmp/lv-health.json; then
  pass "Dashboard responde"
  if grep -q '"daemon"' /tmp/lv-health.json; then pass "Health inclui daemon"; else fail "Health sem daemon"; fi
else
  fail "Dashboard não responde"
fi

# 2. lv-tracker status
echo ""
echo "2. lv-tracker status"
if lv-tracker status > /tmp/lv-status.txt 2>&1; then
  pass "CLI status executou"
  cat /tmp/lv-status.txt
else
  fail "CLI status falhou"
fi

# 3. /api/tasks
echo ""
echo "3. /api/tasks"
if curl -fsS http://127.0.0.1:4833/api/tasks > /tmp/lv-tasks.json; then
  pass "Tasks endpoint responde"
  TASK_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/lv-tasks.json')).tasks.length)")
  echo "   Tasks: $TASK_COUNT"
else
  fail "Tasks endpoint falhou"
fi

# 4. /api/clients
echo ""
echo "4. /api/clients"
curl -fsS http://127.0.0.1:4833/api/clients >/dev/null && pass "Clients endpoint OK" || fail "Clients falhou"

# 5. POST cliente
echo ""
echo "5. Criar cliente via POST"
RESP=$(curl -fsS -X POST http://127.0.0.1:4833/api/clients \
  -H "content-type: application/json" \
  -d '{"name":"Smoke Test Client","billableFactor":0.5}')
if echo "$RESP" | grep -q '"id"'; then pass "Cliente criado"; else fail "Cliente não criado"; fi

# 6. /api/stats/overview
echo ""
echo "6. /api/stats/overview"
curl -fsS "http://127.0.0.1:4833/api/stats/overview?period=month" >/dev/null && pass "Overview OK" || fail "Overview falhou"

# 7. /api/diagnostics
echo ""
echo "7. /api/diagnostics"
curl -fsS http://127.0.0.1:4833/api/diagnostics >/dev/null && pass "Diagnostics OK" || fail "Diagnostics falhou"

# 8. LaunchAgent daemon ativo
echo ""
echo "8. LaunchAgent daemon"
if launchctl list | grep -q com.lvdev.tracker.daemon; then pass "Daemon registrado"; else fail "Daemon não registrado"; fi

# 9. LaunchAgent dashboard ativo
echo "9. LaunchAgent dashboard"
if launchctl list | grep -q com.lvdev.tracker.dashboard; then pass "Dashboard registrado"; else fail "Dashboard não registrado"; fi

# 10. Logs existem
echo ""
echo "10. Logs"
if [ -f "$ROOT/data/logs/daemon.out.log" ]; then pass "daemon.out.log presente"; else fail "daemon.out.log ausente"; fi

# 11. DB existe e tem schema
echo ""
echo "11. SQLite schema"
if [ -f "$ROOT/data/tracker.db" ]; then
  TABLES=$(sqlite3 "$ROOT/data/tracker.db" ".tables")
  if echo "$TABLES" | grep -q tasks; then pass "Schema aplicado"; else fail "Schema não aplicado"; fi
else
  fail "tracker.db ausente"
fi

# 12. Tests do monorepo
echo ""
echo "12. pnpm test (monorepo)"
if (cd "$ROOT" && pnpm test > /tmp/lv-tests.log 2>&1); then
  pass "Todos tests verdes"
else
  fail "Tests falharam — ver /tmp/lv-tests.log"
fi

echo ""
echo "═══════════════════════════════"
echo "  ✓ Pass: $PASS   ✗ Fail: $FAIL"
echo "═══════════════════════════════"

[ "$FAIL" -eq 0 ] || exit 1
