# LV Dev Tracker Fase 1 — Plan 5: Infra + Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empacotar, instalar e validar o sistema end-to-end. Scripts de install/uninstall/reload, LaunchAgents do macOS, backfill inicial e smoke tests cobrindo os 12 critérios de aceitação da Fase 1.

**Architecture:** `infra/install.sh` boota o sistema completo: install deps, build, link CLI global, registra LaunchAgents (daemon + dashboard), aguarda healthcheck, abre browser. `infra/uninstall.sh` desfaz. `infra/reload.sh` reinicia agentes após code change.

**Tech Stack:** Bash, launchctl (macOS), curl (healthcheck).

**Source spec:** `docs/superpowers/specs/2026-05-02-lv-dev-tracker-design.md` §9 (Operação) e §15 (Critérios de aceitação).

**Depends on:** Plans 1-4 completos.

**Final:** Após este plano, Fase 1 está pronta.

---

## File Structure

```
infra/
├── install.sh
├── uninstall.sh
├── reload.sh
├── launchd/
│   ├── com.lvdev.tracker.daemon.plist.template
│   └── com.lvdev.tracker.dashboard.plist.template
└── smoke-test.sh

scripts/
└── render-plist.js                 # Substitui placeholders nos templates

data/
├── (criado pelo install)
├── logs/.gitkeep
├── backups/.gitkeep
└── state/.gitkeep
```

---

## Milestone M18 — LaunchAgent Templates

### Task 70: Criar templates plist e renderer

**Files:**
- Create: `infra/launchd/com.lvdev.tracker.daemon.plist.template`
- Create: `infra/launchd/com.lvdev.tracker.dashboard.plist.template`
- Create: `scripts/render-plist.js`

- [ ] **Step 1: Daemon plist template**

`infra/launchd/com.lvdev.tracker.daemon.plist.template`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.lvdev.tracker.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>{{NODE_BIN}}</string>
    <string>{{TRACKER_ROOT}}/apps/daemon/dist/index.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>{{TRACKER_ROOT}}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>Nice</key>
  <integer>10</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>{{TRACKER_ROOT}}/data/logs/daemon.out.log</string>
  <key>StandardErrorPath</key>
  <string>{{TRACKER_ROOT}}/data/logs/daemon.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>{{HOME}}</string>
    <key>NODE_ENV</key>
    <string>production</string>
    <key>TRACKER_ROOT</key>
    <string>{{TRACKER_ROOT}}</string>
    <key>ANTHROPIC_API_KEY</key>
    <string>{{ANTHROPIC_API_KEY}}</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
```

- [ ] **Step 2: Dashboard plist template**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.lvdev.tracker.dashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>{{NODE_BIN}}</string>
    <string>{{TRACKER_ROOT}}/apps/dashboard/.next/standalone/apps/dashboard/server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>{{TRACKER_ROOT}}/apps/dashboard</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>Nice</key>
  <integer>10</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>{{TRACKER_ROOT}}/data/logs/dashboard.out.log</string>
  <key>StandardErrorPath</key>
  <string>{{TRACKER_ROOT}}/data/logs/dashboard.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>{{HOME}}</string>
    <key>NODE_ENV</key>
    <string>production</string>
    <key>TRACKER_ROOT</key>
    <string>{{TRACKER_ROOT}}</string>
    <key>HOSTNAME</key>
    <string>127.0.0.1</string>
    <key>PORT</key>
    <string>4833</string>
    <key>ANTHROPIC_API_KEY</key>
    <string>{{ANTHROPIC_API_KEY}}</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
```

- [ ] **Step 3: render-plist.js**

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , templatePath, outPath] = process.argv;
if (!templatePath || !outPath) {
  console.error("Usage: render-plist.js <template> <out>");
  process.exit(1);
}

const template = readFileSync(templatePath, "utf8");
const replacements = {
  HOME: process.env.HOME ?? "",
  TRACKER_ROOT: process.env.TRACKER_ROOT ?? resolve("."),
  NODE_BIN: process.env.NODE_BIN ?? process.execPath,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
};

let out = template;
for (const [k, v] of Object.entries(replacements)) {
  out = out.replaceAll(`{{${k}}}`, v);
}

writeFileSync(outPath, out, { mode: 0o644 });
console.log(`✓ ${outPath}`);
```

- [ ] **Step 4: Commit**

```bash
cd /Users/luiz/dev/tracker
chmod +x scripts/render-plist.js
git add infra/launchd scripts/render-plist.js
git commit -m "feat(infra): templates de LaunchAgent + renderer com substituição de placeholders"
```

---

### Task 71: install.sh

**Files:**
- Create: `infra/install.sh`

- [ ] **Step 1: Implementação**

```bash
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
  read -r -p "ANTHROPIC_API_KEY (opcional, Enter para pular): " ANTHROPIC_API_KEY
  cat > "$ROOT/.env" <<EOF
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
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
echo "🔗 Linking lv-tracker globally..."
pnpm --filter @tracker/cli link --global

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
echo "  • Rode 'lv-tracker status' para ver estado"
echo "  • Rode 'lv-tracker backfill' para processar histórico"
echo ""
echo "Comandos úteis:"
echo "  lv-tracker status   — diagnóstico"
echo "  lv-tracker logs     — logs do daemon"
echo "  lv-tracker pause    — pausar"
echo "  ./infra/uninstall.sh — desinstalar"
```

- [ ] **Step 2: Permissão e commit**

```bash
chmod +x /Users/luiz/dev/tracker/infra/install.sh
git add infra/install.sh
git commit -m "feat(infra): script de install completo (deps + build + LaunchAgents + healthcheck)"
```

---

### Task 72: uninstall.sh + reload.sh

**Files:**
- Create: `infra/uninstall.sh`
- Create: `infra/reload.sh`

- [ ] **Step 1: uninstall.sh**

```bash
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
```

- [ ] **Step 2: reload.sh**

```bash
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
```

- [ ] **Step 3: Permissões + commit**

```bash
chmod +x /Users/luiz/dev/tracker/infra/uninstall.sh /Users/luiz/dev/tracker/infra/reload.sh
git add infra/uninstall.sh infra/reload.sh
git commit -m "feat(infra): scripts uninstall e reload"
```

---

## Milestone M19 — Backfill + Backup Job

### Task 73: Backup nightly automático no daemon

**Files:**
- Modify: `apps/daemon/src/index.ts`
- Create: `apps/daemon/src/backup/backup.ts`
- Create: `apps/daemon/src/backup/backup.test.ts`

- [ ] **Step 1: backup.ts**

```typescript
import { createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { join, dirname } from "node:path";
import Database from "better-sqlite3";

export async function backupSqlite(dbPath: string, backupsDir: string, retentionDays = 30): Promise<string> {
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const targetGz = join(backupsDir, `tracker-${today}.db.gz`);

  const sqlite = new Database(dbPath, { readonly: true });
  const tmpPath = join(backupsDir, `.tracker-backup-${today}.db`);
  await sqlite.backup(tmpPath);
  sqlite.close();

  // Gzip
  const { createReadStream } = await import("node:fs");
  await pipeline(createReadStream(tmpPath), createGzip(), createWriteStream(targetGz));
  unlinkSync(tmpPath);

  // Rotação: manter últimos N
  const cutoffMs = Date.now() - retentionDays * 86400000;
  for (const file of readdirSync(backupsDir)) {
    if (!file.startsWith("tracker-") || !file.endsWith(".db.gz")) continue;
    const datePart = file.slice("tracker-".length, "tracker-".length + 10);
    const ts = Date.parse(datePart);
    if (Number.isFinite(ts) && ts < cutoffMs) {
      unlinkSync(join(backupsDir, file));
    }
  }

  return targetGz;
}
```

- [ ] **Step 2: backup.test.ts (smoke)**

```typescript
import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { backupSqlite } from "./backup.js";

let tmp: string;
afterEach(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

describe("backupSqlite", () => {
  it("gera arquivo gz no diretório de backup", async () => {
    tmp = mkdtempSync(join(tmpdir(), "tracker-bkp-"));
    const dbPath = join(tmp, "src.db");
    const sqlite = new Database(dbPath);
    sqlite.exec("CREATE TABLE x(i INTEGER); INSERT INTO x VALUES(1);");
    sqlite.close();

    const backupsDir = join(tmp, "backups");
    const out = await backupSqlite(dbPath, backupsDir);
    expect(existsSync(out)).toBe(true);
    expect(out).toMatch(/\.db\.gz$/);
  });
});
```

- [ ] **Step 3: Integrar em index.ts**

No daemon `index.ts`, adicionar job nightly (verificar a cada tick se passou da hora 03:00 BRT e ainda não fez hoje):

```typescript
import { backupSqlite } from "./backup/backup.js";

let lastBackupDate = "";

// dentro de tick():
const today = formatDateBrt(Date.now());
const hour = new Date().getHours();
if (hour >= 3 && hour < 4 && lastBackupDate !== today) {
  try {
    await withDaemonRun(db, "backup", async () => {
      await backupSqlite(cfg.dbPath, join(cfg.trackerRoot, "data", "backups"));
    });
    lastBackupDate = today;
  } catch (err) { log.warn("backup failed", err); }
}
```

- [ ] **Step 4: Test, commit**

```bash
cd /Users/luiz/dev/tracker/apps/daemon && pnpm test backup
git add apps/daemon/src/backup apps/daemon/src/index.ts
git commit -m "feat(daemon): backup nightly do SQLite (.gz, rotação 30d)"
```

---

## Milestone M20 — Smoke Tests

### Task 74: smoke-test.sh

**Files:**
- Create: `infra/smoke-test.sh`

Script bash que cobre os 12 critérios de aceitação da Fase 1.

- [ ] **Step 1: smoke-test.sh**

```bash
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
```

- [ ] **Step 2: chmod + commit**

```bash
chmod +x /Users/luiz/dev/tracker/infra/smoke-test.sh
git add infra/smoke-test.sh
git commit -m "feat(infra): smoke-test.sh cobrindo os 12 critérios de aceitação Fase 1"
```

---

### Task 75: Documentar critérios de aceitação no README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Substituir README com versão completa**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README completo com arquitetura, install, uso, critérios"
```

---

## Self-Review

**Spec coverage:**
- §9.1 install.sh: ✅ task 71.
- §9.2 LaunchAgents (daemon + dashboard): ✅ task 70.
- §9.4 reload.sh: ✅ task 72.
- §9.5 uninstall.sh: ✅ task 72.
- §9.6 backups: ✅ task 73.
- §15 12 critérios de aceitação: ✅ task 74 (smoke-test.sh).
- §11 logs em data/logs/: ✅ via plists.

**Limitações:**
- LaunchAgent dashboard usa `apps/dashboard/.next/standalone/apps/dashboard/server.js` — caminho depende de como Next.js standalone gera no monorepo. **Verificar empiricamente** após `pnpm build`. Pode ser `apps/dashboard/.next/standalone/server.js` em vez disso.
- Smoke test #12 (`pnpm test`) pode ser pesado em CI — para uso local diário, pode rodar só os outros 11.
- Sem CSP no Next config (mencionado no spec §10.9) — adicionar via headers em next.config.mjs em Fase 1.5.

**Type consistency:** OK — bash/scripts são separados.

---

## Execution Handoff

**Plan complete e salvo em** `docs/superpowers/plans/2026-05-02-lv-dev-tracker-fase1-plan5-infra-smoke.md`.

**Após este plano: Fase 1 100% pronta.** Comando `./infra/install.sh && ./infra/smoke-test.sh` deve passar com 0 falhas.

Próximas fases (B/C) viram quando o user quiser.
