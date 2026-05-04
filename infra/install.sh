#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LAUNCHD_DIR="$HOME/Library/LaunchAgents"
DAEMON_LABEL="com.lvdev.tracker.daemon"
DASHBOARD_LABEL="com.lvdev.tracker.dashboard"

echo "🔧 LV Dev Tracker — Install"
echo "Root: $ROOT"

# 1. Verifica Node + pnpm
if ! command -v node >/dev/null; then echo "❌ Node não encontrado" >&2; exit 1; fi
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=${NODE_VERSION%%.*}
if [ "$NODE_MAJOR" -lt 20 ]; then echo "❌ Node ≥20 requerido (atual: $NODE_VERSION)" >&2; exit 1; fi
NODE_BIN=$(command -v node)
echo "✓ Node $NODE_VERSION em $NODE_BIN"

if ! command -v pnpm >/dev/null; then
  echo "Habilitando pnpm via corepack..."
  corepack enable pnpm
fi
echo "✓ pnpm $(pnpm --version)"

# 2. .env
if [ ! -f "$ROOT/.env" ]; then
  echo ""
  echo "Configurando .env..."
  echo ""
  echo "Auth Anthropic — preencha apenas UMA das duas opções:"
  echo "  1) ANTHROPIC_API_KEY: chave API normal (sk-ant-...)"
  echo "  2) CLAUDE_CODE_OAUTH_TOKEN: para usar seu plano Max/Pro (rode 'claude setup-token' em outro terminal e cole o token)"
  read -r -p "ANTHROPIC_API_KEY (Enter para pular): " ANTHROPIC_API_KEY
  read -r -p "CLAUDE_CODE_OAUTH_TOKEN (Enter para pular): " CLAUDE_CODE_OAUTH_TOKEN
  cat > "$ROOT/.env" <<EOF
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_CODE_OAUTH_TOKEN}
PORT=4833
HOSTNAME=127.0.0.1
NODE_ENV=production
TRACKER_ROOT=$ROOT
EOF
  chmod 600 "$ROOT/.env"
  echo "✓ .env criado em $ROOT/.env"
else
  echo "✓ .env existente preservado"
  # Carrega vars
  set -a; source "$ROOT/.env"; set +a
fi

# 3. Install deps
echo ""
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 4. DB migrations
echo ""
echo "🗃 Aplicando migrations..."
mkdir -p "$ROOT/data" "$ROOT/data/logs" "$ROOT/data/backups" "$ROOT/data/state"
TRACKER_DB_PATH="$ROOT/data/tracker.db" pnpm --filter @tracker/db db:migrate

# 5. Build
echo ""
echo "🔨 Build..."
pnpm build

# 6. Link CLI global
echo ""
echo "🔗 Linking CLI globally (tktr + lv-tracker)..."
(cd "$ROOT/apps/cli" && pnpm link --global) || true

# 7. Render plists
echo ""
echo "📋 Gerando LaunchAgents..."
mkdir -p "$LAUNCHD_DIR"
TRACKER_ROOT="$ROOT" NODE_BIN="$NODE_BIN" \
  node "$ROOT/scripts/render-plist.js" \
  "$ROOT/infra/launchd/com.lvdev.tracker.daemon.plist.template" \
  "$LAUNCHD_DIR/$DAEMON_LABEL.plist"
TRACKER_ROOT="$ROOT" NODE_BIN="$NODE_BIN" \
  node "$ROOT/scripts/render-plist.js" \
  "$ROOT/infra/launchd/com.lvdev.tracker.dashboard.plist.template" \
  "$LAUNCHD_DIR/$DASHBOARD_LABEL.plist"

# 8. Bootstrap (descarrega se já existe)
echo ""
echo "🚀 Bootstrapping LaunchAgents..."
launchctl bootout "gui/$(id -u)/$DAEMON_LABEL" 2>/dev/null || true
launchctl bootout "gui/$(id -u)/$DASHBOARD_LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$LAUNCHD_DIR/$DAEMON_LABEL.plist"
launchctl bootstrap "gui/$(id -u)" "$LAUNCHD_DIR/$DASHBOARD_LABEL.plist"

# 9. Aguarda healthcheck
echo ""
echo "⏳ Aguardando dashboard responder em localhost:4833..."
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:4833/api/health 2>/dev/null; then
    echo "✓ Dashboard up"
    break
  fi
  sleep 1
done

if ! curl -fsS http://127.0.0.1:4833/api/health 2>/dev/null; then
  echo "⚠ Dashboard não respondeu em 30s — verifique data/logs/dashboard.err.log"
fi

echo ""
echo "✅ Install concluído"
echo ""
echo "Próximos passos:"
echo "  • Abra http://localhost:4833"
echo "  • Rode 'tktr status' para ver estado"
echo "  • Rode 'tktr backfill' para processar histórico"
echo ""
echo "Comandos úteis (use 'tktr' ou 'lv-tracker' — equivalentes):"
echo "  tktr status         — diagnóstico"
echo "  tktr logs           — logs do daemon"
echo "  tktr pause          — pausar"
echo "  ./infra/uninstall.sh — desinstalar"
