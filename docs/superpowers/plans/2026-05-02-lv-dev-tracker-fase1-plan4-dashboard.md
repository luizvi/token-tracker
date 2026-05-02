# LV Dev Tracker Fase 1 — Plan 4: Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o dashboard Next.js standalone em `localhost:4833` com todas as rotas, componentes principais, API routes e tema visual (claude-mem base + accent verde lvdev).

**Architecture:** Next.js 15 App Router (output: standalone), React 19, Tailwind v4, shadcn/ui customizado, Recharts. UI consome SQLite via `@tracker/db` em API routes server-side. Polling de 30s no overview/tasks. Todas as queries DB acontecem no server — client apenas dispara fetch e renderiza.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, shadcn/ui, Recharts, lucide-react, Zod, Monaspace Radon (font).

**Source spec:** `docs/superpowers/specs/2026-05-02-lv-dev-tracker-design.md` §7 (UI/Dashboard).

**Depends on:** Plan 1 + Plan 2 + Plan 3 completos.

**Chain:** Após Plan 4, segue Plan 5 (Infra + Smoke).

---

## File Structure

```
apps/dashboard/
├── package.json
├── tsconfig.json
├── next.config.mjs                 # output: 'standalone'
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                 # shadcn/ui config
├── public/
│   └── fonts/                      # Monaspace Radon woff2
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout (sidebar + theme + fonts)
    │   ├── globals.css             # Tailwind + CSS variables (paleta)
    │   ├── page.tsx                # Overview /
    │   ├── tasks/
    │   │   ├── page.tsx            # /tasks
    │   │   └── [id]/page.tsx       # /tasks/[id]
    │   ├── clients/
    │   │   ├── page.tsx
    │   │   └── [id]/page.tsx
    │   ├── projects/
    │   │   ├── page.tsx
    │   │   └── [id]/page.tsx
    │   ├── events/page.tsx
    │   ├── settings/
    │   │   ├── page.tsx
    │   │   ├── pricing/page.tsx
    │   │   └── currency/page.tsx
    │   ├── diagnostics/page.tsx
    │   └── api/
    │       ├── health/route.ts
    │       ├── tasks/
    │       │   ├── route.ts
    │       │   ├── [id]/route.ts
    │       │   ├── [id]/refine/route.ts
    │       │   ├── [id]/estimate-hours/route.ts
    │       │   ├── [id]/recalc-billable/route.ts
    │       │   ├── [id]/lock/route.ts
    │       │   ├── [id]/split/route.ts
    │       │   └── merge/route.ts
    │       ├── clients/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── projects/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── events/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── tags/route.ts
    │       ├── settings/route.ts
    │       ├── pricing/route.ts
    │       ├── currency/
    │       │   ├── route.ts
    │       │   └── manual/route.ts
    │       ├── stats/
    │       │   ├── overview/route.ts
    │       │   ├── by-project/route.ts
    │       │   ├── by-client/route.ts
    │       │   └── heatmap/route.ts
    │       └── diagnostics/route.ts
    ├── components/
    │   ├── ui/                     # shadcn/ui primitives (button, card, input, etc.)
    │   ├── sidebar.tsx
    │   ├── header.tsx
    │   ├── kpi-card.tsx
    │   ├── task-table.tsx
    │   ├── task-detail.tsx
    │   ├── client-card.tsx
    │   ├── event-form.tsx
    │   ├── settings-form.tsx
    │   ├── currency-toggle.tsx
    │   └── charts/
    │       ├── cost-line.tsx
    │       ├── tokens-by-project-bar.tsx
    │       └── hours-heatmap.tsx
    └── lib/
        ├── db.ts                   # Lazy singleton DbClient
        ├── format.ts               # Helpers de formatação
        └── settings.ts             # Helper para ler/escrever settings com cache
```

---

## Milestone M15 — Setup do Next.js + Theme

### Task 58: Inicializar `apps/dashboard`

**Files:**
- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/tsconfig.json`
- Create: `apps/dashboard/next.config.mjs`
- Create: `apps/dashboard/tailwind.config.ts`
- Create: `apps/dashboard/postcss.config.mjs`

- [ ] **Step 1: package.json**

```json
{
  "name": "@tracker/dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "next build",
    "start": "node .next/standalone/server.js",
    "dev": "next dev --port 4833",
    "test": "vitest run",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tracker/db": "workspace:*",
    "@tracker/shared": "workspace:*",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-tooltip": "^1.1.6",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "next": "^15.1.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.15.0",
    "tailwind-merge": "^2.5.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@tracker/config": "workspace:*",
    "@types/node": "^20.17.10",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.0",
    "vitest": "^2.1.8"
  }
}
```

> Nota: ficamos em Tailwind v3 (mais maduro com Next.js 15 do que v4). Se preferir v4, ajustar a config.

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.mjs**

```javascript
const nextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

- [ ] **Step 4: tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
          card: "var(--color-bg-card)",
        },
        border: {
          DEFAULT: "var(--color-border-primary)",
          hover: "var(--color-border-hover)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "#1fe879",
          hover: "#1bd16d",
          fg: "#0a3d20",
        },
        danger: "#d1242f",
        warning: "#d4a72c",
      },
      fontFamily: {
        mono: ["'Monaspace Radon'", "Monaco", "Menlo", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: postcss.config.mjs**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: install + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm install
git add apps/dashboard pnpm-lock.yaml
git commit -m "feat(dashboard): inicializa Next.js 15 + Tailwind + shadcn deps"
```

---

### Task 59: globals.css com paleta claude-mem + accent lvdev

**Files:**
- Create: `apps/dashboard/src/app/globals.css`

- [ ] **Step 1: globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: "Monaspace Radon";
  src: url("/fonts/monaspace-radon-var.woff2") format("woff2-variations");
  font-weight: 200 900;
  font-display: swap;
}

:root,
[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #efebe4;
  --color-bg-tertiary: #f0f0f0;
  --color-bg-card: #ffffff;
  --color-bg-card-hover: #f6f8fa;
  --color-border-primary: #d0d7de;
  --color-border-hover: #1fe879;
  --color-text-primary: #2b2520;
  --color-text-secondary: #5a5248;
  --color-text-muted: #8f8a7e;
}

[data-theme="dark"] {
  --color-bg-primary: #1a1916;
  --color-bg-secondary: #252320;
  --color-bg-tertiary: #1f1d1a;
  --color-bg-card: #252320;
  --color-bg-card-hover: #2d2a26;
  --color-border-primary: #3a3834;
  --color-border-hover: #1fe879;
  --color-text-primary: #dcd6cc;
  --color-text-secondary: #b8b0a4;
  --color-text-muted: #7a7266;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --color-bg-primary: #1a1916;
    --color-bg-secondary: #252320;
    --color-bg-tertiary: #1f1d1a;
    --color-bg-card: #252320;
    --color-bg-card-hover: #2d2a26;
    --color-border-primary: #3a3834;
    --color-border-hover: #1fe879;
    --color-text-primary: #dcd6cc;
    --color-text-secondary: #b8b0a4;
    --color-text-muted: #7a7266;
  }
}

body {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: "Inter", system-ui, sans-serif;
}

.font-mono, .num, .timestamp { font-family: "Monaspace Radon", "Monaco", monospace; }

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
}

.btn-primary {
  background: #1fe879;
  color: #0a3d20;
  font-weight: 500;
  border-radius: 4px;
  padding: 8px 14px;
}
.btn-primary:hover { background: #1bd16d; }

.chip { display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
.chip-backfilled { opacity: 0.6; }

.text-danger { color: #d1242f; }
.text-warning { color: #d4a72c; }
.text-accent { color: #1fe879; }
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/src/app/globals.css
git commit -m "feat(dashboard): paleta claude-mem com accent verde lvdev em globals.css"
```

---

### Task 60: lib/db.ts (singleton)

**Files:**
- Create: `apps/dashboard/src/lib/db.ts`
- Create: `apps/dashboard/src/lib/format.ts`

- [ ] **Step 1: db.ts**

```typescript
import { createClient, runMigrations, seedDatabase, type DbClient } from "@tracker/db";
import { join } from "node:path";

let cachedDb: DbClient | null = null;

function resolveDbPath(): string {
  if (process.env.TRACKER_DB_PATH) return process.env.TRACKER_DB_PATH;
  const root = process.env.TRACKER_ROOT ?? join(process.env.HOME ?? "", "dev", "tracker");
  return join(root, "data", "tracker.db");
}

export function getDb(): DbClient {
  if (!cachedDb) {
    const { db } = createClient(resolveDbPath());
    runMigrations(db);
    seedDatabase(db);
    cachedDb = db;
  }
  return cachedDb;
}
```

- [ ] **Step 2: format.ts**

```typescript
export function formatUsd(value: number): string {
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

export function formatBrl(value: number): string {
  return `R$${value.toFixed(value < 1 ? 4 : 2)}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m${String(Math.round(seconds % 60)).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h${String(m % 60).padStart(2, "0")}m`;
}

export function formatRelativeTime(epochMs: number): string {
  const diffSec = Math.floor((Date.now() - epochMs) / 1000);
  if (diffSec < 60) return `há ${diffSec}s`;
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)}min`;
  if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)}h`;
  return `há ${Math.floor(diffSec / 86400)}d`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/lib
git commit -m "feat(dashboard): db singleton e helpers de formatação"
```

---

### Task 61: Layout root + sidebar + header

**Files:**
- Create: `apps/dashboard/src/app/layout.tsx`
- Create: `apps/dashboard/src/components/sidebar.tsx`
- Create: `apps/dashboard/src/components/header.tsx`

- [ ] **Step 1: layout.tsx**

```tsx
import "./globals.css";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export const metadata = { title: "LV Dev Tracker" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: sidebar.tsx**

```tsx
import Link from "next/link";
import { Home, ListTodo, Users, FolderKanban, Calendar, Settings, Activity } from "lucide-react";

const items = [
  { href: "/", icon: Home, label: "Overview" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/clients", icon: Users, label: "Clientes" },
  { href: "/projects", icon: FolderKanban, label: "Projetos" },
  { href: "/events", icon: Calendar, label: "Eventos" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/diagnostics", icon: Activity, label: "Diagnostics" },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-bg-secondary border-r border-border min-h-screen">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-accent">LV Tracker</h1>
        <p className="text-xs text-text-muted">Fase 1</p>
      </div>
      <nav className="p-2">
        {items.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2 rounded text-text-secondary hover:bg-bg-card-hover hover:text-text-primary text-sm">
            <Icon size={16} /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: header.tsx**

```tsx
"use client";
import { useState } from "react";

export function Header() {
  const [period, setPeriod] = useState("week");
  const [currency, setCurrency] = useState<"USD" | "BRL">("USD");

  return (
    <header className="sticky top-0 bg-bg-primary border-b border-border z-10 px-6 py-3 flex items-center gap-4">
      <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="bg-bg-card border border-border rounded px-2 py-1 text-sm">
        <option value="today">Hoje</option>
        <option value="week">Semana</option>
        <option value="month">Mês</option>
      </select>
      <button onClick={() => setCurrency(currency === "USD" ? "BRL" : "USD")}
              className="text-sm font-mono text-text-secondary px-2 py-1 border border-border rounded hover:border-hover">
        {currency}
      </button>
      <input type="search" placeholder="Buscar..."
             className="ml-auto bg-bg-card border border-border rounded px-3 py-1 text-sm w-64" />
    </header>
  );
}
```

- [ ] **Step 4: Build (deve subir sem erros)**

```bash
cd /Users/luiz/dev/tracker/apps/dashboard && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/app/layout.tsx apps/dashboard/src/components
git commit -m "feat(dashboard): layout root com sidebar + header global"
```

---

## Milestone M16 — API Routes Core

### Task 62: API routes — `/api/tasks` + `/api/tasks/[id]` + actions

**Files:**
- Create: `apps/dashboard/src/app/api/tasks/route.ts`
- Create: `apps/dashboard/src/app/api/tasks/[id]/route.ts`
- Create: `apps/dashboard/src/app/api/tasks/[id]/refine/route.ts`
- Create: `apps/dashboard/src/app/api/tasks/[id]/estimate-hours/route.ts`
- Create: `apps/dashboard/src/app/api/tasks/[id]/recalc-billable/route.ts`
- Create: `apps/dashboard/src/app/api/tasks/[id]/lock/route.ts`
- Create: `apps/dashboard/src/app/api/tasks/merge/route.ts`
- Create: `apps/dashboard/src/app/api/health/route.ts`

- [ ] **Step 1: /api/tasks/route.ts**

```typescript
import { NextResponse } from "next/server";
import { listTasks } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("project") ?? undefined;
  const clientId = url.searchParams.get("client") ?? undefined;
  const status = (url.searchParams.get("status") ?? undefined) as "open" | "paused" | "closed" | undefined;
  const limit = Number(url.searchParams.get("limit") ?? 100);

  const db = getDb();
  const tasks = listTasks(db, { projectId, clientId, status }).slice(0, limit);
  return NextResponse.json({ tasks });
}
```

- [ ] **Step 2: /api/tasks/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { getTaskById, updateTask, listTasks } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const task = getTaskById(db, id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const updated = updateTask(db, id, body);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ task: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  // Use raw drizzle delete since query helper not exported
  const { schema } = await import("@tracker/db");
  const { eq } = await import("drizzle-orm");
  db.delete(schema.tasks).where(eq(schema.tasks.id, id)).run();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: /api/tasks/[id]/refine/route.ts**

```typescript
import { NextResponse } from "next/server";
import { HaikuClient } from "@tracker/daemon/refiner/haiku-client";
import { HaikuRefiner, refineTask } from "@tracker/daemon/refiner/refiner";
import { getDb } from "@/lib/db";
import { getTaskById } from "@tracker/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 500 });
  const db = getDb();
  const client = new HaikuClient({ apiKey, model: "claude-haiku-4-5-20251001" });
  const refiner = new HaikuRefiner(client);
  await refineTask(db, id, refiner);
  return NextResponse.json({ task: getTaskById(db, id) });
}
```

- [ ] **Step 4: /api/tasks/[id]/estimate-hours/route.ts**

Análogo, usando `HaikuEstimator` + `estimateTaskHours`.

```typescript
import { NextResponse } from "next/server";
import { HaikuClient } from "@tracker/daemon/refiner/haiku-client";
import { HaikuEstimator, estimateTaskHours } from "@tracker/daemon/estimator/estimator";
import { getDb } from "@/lib/db";
import { getTaskById } from "@tracker/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 500 });
  const db = getDb();
  const client = new HaikuClient({ apiKey, model: "claude-haiku-4-5-20251001" });
  const estimator = new HaikuEstimator(client);
  await estimateTaskHours(db, id, estimator);
  return NextResponse.json({ task: getTaskById(db, id) });
}
```

- [ ] **Step 5: /api/tasks/[id]/recalc-billable/route.ts**

```typescript
import { NextResponse } from "next/server";
import { recomputeBillableHours } from "@tracker/daemon/biller/biller";
import { getDb } from "@/lib/db";
import { getTaskById } from "@tracker/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  recomputeBillableHours(db, id);
  return NextResponse.json({ task: getTaskById(db, id) });
}
```

- [ ] **Step 6: /api/tasks/[id]/lock/route.ts**

```typescript
import { NextResponse } from "next/server";
import { getTaskById, updateTask } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const task = getTaskById(db, id);
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  updateTask(db, id, { billableHoursLocked: !task.billableHoursLocked });
  return NextResponse.json({ task: getTaskById(db, id) });
}
```

- [ ] **Step 7: /api/tasks/merge/route.ts**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTaskById, listTasks, updateTask, schema } from "@tracker/db";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

const Body = z.object({ taskIds: z.array(z.string()).min(2) });

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const db = getDb();
  const tasks = body.taskIds.map((id) => getTaskById(db, id)).filter((t): t is NonNullable<typeof t> => t !== null);
  if (tasks.length < 2) return NextResponse.json({ error: "need 2+" }, { status: 400 });

  // Soma tudo e atribui à primeira (mais antiga)
  const sorted = [...tasks].sort((a, b) => a.startedAt - b.startedAt);
  const head = sorted[0]!;
  const others = sorted.slice(1);

  const totals = others.reduce((acc, t) => ({
    tokensInput: acc.tokensInput + t.tokensInput,
    tokensOutput: acc.tokensOutput + t.tokensOutput,
    tokensCacheRead: acc.tokensCacheRead + t.tokensCacheRead,
    tokensCacheCreation: acc.tokensCacheCreation + t.tokensCacheCreation,
    timeInputSeconds: acc.timeInputSeconds + t.timeInputSeconds,
    timeProcessingOutputSeconds: acc.timeProcessingOutputSeconds + t.timeProcessingOutputSeconds,
    timeReadingSeconds: acc.timeReadingSeconds + t.timeReadingSeconds,
    timeTotalSeconds: acc.timeTotalSeconds + t.timeTotalSeconds,
    costUsd: acc.costUsd + t.costUsd,
  }), {
    tokensInput: head.tokensInput, tokensOutput: head.tokensOutput,
    tokensCacheRead: head.tokensCacheRead, tokensCacheCreation: head.tokensCacheCreation,
    timeInputSeconds: head.timeInputSeconds, timeProcessingOutputSeconds: head.timeProcessingOutputSeconds,
    timeReadingSeconds: head.timeReadingSeconds, timeTotalSeconds: head.timeTotalSeconds,
    costUsd: head.costUsd,
  });

  const lastEnded = Math.max(...sorted.map((t) => t.endedAt ?? t.startedAt));
  updateTask(db, head.id, { ...totals, endedAt: lastEnded, status: "closed" });

  for (const o of others) {
    db.delete(schema.tasks).where(eq(schema.tasks.id, o.id)).run();
  }

  return NextResponse.json({ task: getTaskById(db, head.id) });
}
```

- [ ] **Step 8: /api/health/route.ts**

```typescript
import { NextResponse } from "next/server";
import { listDaemonRuns } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const runs = listDaemonRuns(db, { kind: "tick", limit: 1 });
  const last = runs[0];
  const lagSeconds = last ? Math.floor((Date.now() - last.startedAt) / 1000) : null;
  return NextResponse.json({
    daemon: last ? { lastRun: last.startedAt, ok: last.ok, lagSeconds } : null,
    db: "ok",
    dashboard: "ok",
  });
}
```

- [ ] **Step 9: Build, commit**

```bash
cd /Users/luiz/dev/tracker/apps/dashboard && pnpm build
git add apps/dashboard/src/app/api/tasks apps/dashboard/src/app/api/health
git commit -m "feat(dashboard): API routes /tasks (CRUD/refine/estimate/recalc/lock/merge) e /health"
```

---

### Task 63: API routes — clients, projects, events, tags

**Files:**
- Create: `apps/dashboard/src/app/api/clients/route.ts` + `[id]/route.ts`
- Create: `apps/dashboard/src/app/api/projects/route.ts` + `[id]/route.ts`
- Create: `apps/dashboard/src/app/api/events/route.ts` + `[id]/route.ts`
- Create: `apps/dashboard/src/app/api/tags/route.ts`

- [ ] **Step 1: /api/clients/route.ts**

```typescript
import { NextResponse } from "next/server";
import { listClients, createClientRow } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ clients: listClients(getDb()) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const c = createClientRow(getDb(), body);
  return NextResponse.json({ client: c }, { status: 201 });
}
```

- [ ] **Step 2: /api/clients/[id]/route.ts**

```typescript
import { NextResponse } from "next/server";
import { getClientById, updateClient, deleteClient } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getClientById(getDb(), id);
  return c ? NextResponse.json({ client: c }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = updateClient(getDb(), id, await req.json());
  return updated ? NextResponse.json({ client: updated }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteClient(getDb(), id) });
}
```

- [ ] **Step 3: /api/projects/route.ts e [id]/route.ts (análogos)**

Use `listProjects`, `createProject`, `updateProjectXxx` (criar `updateProject` se necessário em `@tracker/db/queries/projects.ts`).

> Para isso, **adicionar** em `packages/db/src/queries/projects.ts`:

```typescript
export function updateProject(
  db: DbClient,
  id: string,
  patch: Partial<Omit<ProjectRow, "id" | "createdAt" | "updatedAt">>,
): ProjectRow | null {
  const current = db.select().from(projects).where(eq(projects.id, id)).all()[0];
  if (!current) return null;
  db.update(projects).set({ ...patch, updatedAt: Date.now() }).where(eq(projects.id, id)).run();
  return db.select().from(projects).where(eq(projects.id, id)).all()[0] ?? null;
}

export function deleteProject(db: DbClient, id: string): boolean {
  return db.delete(projects).where(eq(projects.id, id)).run().changes > 0;
}

export function getProjectById(db: DbClient, id: string): ProjectRow | null {
  return db.select().from(projects).where(eq(projects.id, id)).all()[0] ?? null;
}
```

(adicionar tests análogos no clients.test.ts pattern, commit separado.)

API:

```typescript
// /api/projects/route.ts
import { NextResponse } from "next/server";
import { listProjects } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() { return NextResponse.json({ projects: listProjects(getDb()) }); }

// /api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProjectById(getDb(), id);
  return p ? NextResponse.json({ project: p }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = updateProject(getDb(), id, await req.json());
  return updated ? NextResponse.json({ project: updated }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteProject(getDb(), id) });
}
```

- [ ] **Step 4: /api/events/route.ts e [id]/route.ts**

```typescript
// /api/events/route.ts
import { NextResponse } from "next/server";
import { listEvents, createEvent } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client") ?? undefined;
  return NextResponse.json({ events: listEvents(getDb(), { clientId }) });
}
export async function POST(req: Request) {
  const e = createEvent(getDb(), await req.json());
  return NextResponse.json({ event: e }, { status: 201 });
}

// /api/events/[id]/route.ts
import { NextResponse } from "next/server";
import { getEventById, deleteEvent } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = getEventById(getDb(), id);
  return e ? NextResponse.json({ event: e }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ ok: deleteEvent(getDb(), id) });
}
```

- [ ] **Step 5: /api/tags/route.ts**

```typescript
import { NextResponse } from "next/server";
import { listTags, createTag } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() { return NextResponse.json({ tags: listTags(getDb()) }); }
export async function POST(req: Request) {
  return NextResponse.json({ tag: createTag(getDb(), await req.json()) }, { status: 201 });
}
```

- [ ] **Step 6: Build + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add packages/db/src/queries/projects.ts apps/dashboard/src/app/api
git commit -m "feat(dashboard): API routes para clients, projects, events, tags + queries projects update/delete"
```

---

### Task 64: API routes — settings, pricing, currency, stats, diagnostics

**Files:**
- Create: `apps/dashboard/src/app/api/settings/route.ts`
- Create: `apps/dashboard/src/app/api/pricing/route.ts`
- Create: `apps/dashboard/src/app/api/currency/route.ts` + `manual/route.ts`
- Create: `apps/dashboard/src/app/api/stats/overview/route.ts`
- Create: `apps/dashboard/src/app/api/stats/by-project/route.ts`
- Create: `apps/dashboard/src/app/api/stats/by-client/route.ts`
- Create: `apps/dashboard/src/app/api/stats/heatmap/route.ts`
- Create: `apps/dashboard/src/app/api/diagnostics/route.ts`

- [ ] **Step 1: /api/settings/route.ts**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseSettingValue, type SettingKey } from "@tracker/shared";
import { getAllSettings, setSetting } from "@tracker/db";
import { getDb } from "@/lib/db";
import { recalcTimeAndBillableForAll } from "@tracker/daemon/recalc/recalc";

const Body = z.object({ key: z.string(), value: z.unknown() });

export async function GET() {
  return NextResponse.json({ settings: getAllSettings(getDb()) });
}

const TIME_KEYS = new Set([
  "timePerInputTokenSeconds",
  "timePerProcessingOutputTokenSeconds",
  "timePerReadingTokenSeconds",
  "cacheReadFactor",
  "billableFactorDefault",
]);

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const validated = parseSettingValue(body.key as SettingKey, body.value);
  const db = getDb();
  setSetting(db, body.key, validated);
  if (TIME_KEYS.has(body.key)) recalcTimeAndBillableForAll(db);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: /api/pricing/route.ts**

```typescript
import { NextResponse } from "next/server";
import { listAllPricing, insertPricing, updatePricing, deletePricing } from "@tracker/db";
import { recalcCostForAll } from "@tracker/daemon/recalc/recalc";
import { getDb } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ pricing: listAllPricing(getDb()) });
}
export async function POST(req: Request) {
  const db = getDb();
  const r = insertPricing(db, await req.json());
  recalcCostForAll(db);
  return NextResponse.json({ pricing: r }, { status: 201 });
}
export async function PATCH(req: Request) {
  const { id, ...patch } = await req.json();
  const db = getDb();
  updatePricing(db, id, patch);
  recalcCostForAll(db);
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request) {
  const { id } = await req.json();
  return NextResponse.json({ ok: deletePricing(getDb(), id) });
}
```

- [ ] **Step 3: /api/currency**

```typescript
// /api/currency/route.ts
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { schema } from "@tracker/db";
import { updateCurrencyToday } from "@tracker/daemon/currency/updater";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db.select().from(schema.currencyRates).orderBy(desc(schema.currencyRates.date)).limit(365).all();
  return NextResponse.json({ rates: rows });
}
export async function POST() {
  await updateCurrencyToday(getDb());
  return NextResponse.json({ ok: true });
}

// /api/currency/manual/route.ts
import { NextResponse } from "next/server";
import { upsertCurrencyRate } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  const { date, usdBrl } = await req.json();
  upsertCurrencyRate(getDb(), date, usdBrl, "manual");
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: /api/stats/overview**

```typescript
import { NextResponse } from "next/server";
import { listTasks } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "month";
  const now = Date.now();
  const cutoffMs =
    period === "today" ? new Date(new Date().setHours(0, 0, 0, 0)).getTime() :
    period === "week" ? now - 7 * 86400000 :
    period === "month" ? now - 30 * 86400000 :
    0;

  const tasks = listTasks(getDb(), {}).filter((t) => t.startedAt >= cutoffMs);
  const totalTokens = tasks.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0);
  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalBillableHours = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0);
  const openCount = tasks.filter((t) => t.status === "open").length;
  const pausedCount = tasks.filter((t) => t.status === "paused").length;

  return NextResponse.json({
    totalTasks: tasks.length,
    totalTokens, totalCost, totalBillableHours,
    openCount, pausedCount,
  });
}
```

- [ ] **Step 5: /api/stats/by-project**

```typescript
import { NextResponse } from "next/server";
import { listTasks, listProjects } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "week";
  const now = Date.now();
  const cutoff = period === "today" ? now - 86400000 : period === "week" ? now - 7*86400000 : now - 30*86400000;
  const db = getDb();
  const projects = listProjects(db);
  const out = projects.map((p) => {
    const ts = listTasks(db, { projectId: p.id }).filter((t) => t.startedAt >= cutoff);
    return {
      projectId: p.id,
      projectName: p.name,
      tokens: ts.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
      cost: ts.reduce((s, t) => s + t.costUsd, 0),
      tasks: ts.length,
    };
  });
  return NextResponse.json({ byProject: out });
}
```

- [ ] **Step 6: /api/stats/by-client**

Análogo a by-project. Inclui também eventos manuais nas horas billable.

```typescript
import { NextResponse } from "next/server";
import { listTasks, listClients, listEvents } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "month";
  const now = Date.now();
  const cutoff = period === "today" ? now - 86400000 : period === "week" ? now - 7*86400000 : now - 30*86400000;
  const db = getDb();
  const clients = listClients(db);
  const out = clients.map((c) => {
    const ts = listTasks(db, { clientId: c.id }).filter((t) => t.startedAt >= cutoff);
    const evs = listEvents(db, { clientId: c.id }).filter((e) => e.startAt >= cutoff);
    const claudeHours = ts.reduce((s, t) => s + (t.billableHours ?? 0), 0);
    const eventHours = evs.reduce((s, e) => s + e.durationMinutes / 60, 0);
    return {
      clientId: c.id,
      clientName: c.name,
      hourLimit: c.hourLimitValue,
      hourLimitPeriod: c.hourLimitPeriod,
      billableHours: claudeHours + eventHours,
      tasks: ts.length,
      events: evs.length,
    };
  });
  return NextResponse.json({ byClient: out });
}
```

- [ ] **Step 7: /api/stats/heatmap**

```typescript
import { NextResponse } from "next/server";
import { listTasks } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET() {
  const tasks = listTasks(getDb(), {});
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const t of tasks) {
    const d = new Date(t.startedAt - 3 * 3600000);
    const day = d.getUTCDay(); // 0..6
    const hour = d.getUTCHours();
    matrix[day]![hour]! += t.timeTotalSeconds / 3600;
  }
  return NextResponse.json({ heatmap: matrix });
}
```

- [ ] **Step 8: /api/diagnostics**

```typescript
import { NextResponse } from "next/server";
import { listDaemonRuns } from "@tracker/db";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const kind = url.searchParams.get("kind") ?? undefined;
  return NextResponse.json({ runs: listDaemonRuns(getDb(), { kind, limit }) });
}
```

- [ ] **Step 9: Build, commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/dashboard/src/app/api
git commit -m "feat(dashboard): API routes settings, pricing, currency, stats e diagnostics"
```

---

## Milestone M17 — Pages

### Task 65: Página `/` (Overview) com KPIs

**Files:**
- Create: `apps/dashboard/src/app/page.tsx`
- Create: `apps/dashboard/src/components/kpi-card.tsx`

- [ ] **Step 1: kpi-card.tsx**

```tsx
export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-mono mt-1 text-text-primary">{value}</p>
      {hint && <p className="text-xs text-text-secondary mt-1">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 2: page.tsx (server component)**

```tsx
import { KpiCard } from "@/components/kpi-card";
import { formatUsd, formatTokens } from "@/lib/format";

async function fetchOverview(period: string) {
  const res = await fetch(`http://127.0.0.1:4833/api/stats/overview?period=${period}`, { cache: "no-store" });
  return res.json();
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period = "week" } = await searchParams;
  const data = await fetchOverview(period);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Overview ({period})</h2>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Tasks" value={String(data.totalTasks)} />
        <KpiCard label="Tokens" value={formatTokens(data.totalTokens)} />
        <KpiCard label="Custo" value={formatUsd(data.totalCost)} />
        <KpiCard label="Horas faturáveis" value={`${data.totalBillableHours.toFixed(1)}h`} />
        <KpiCard label="Open" value={String(data.openCount)} />
        <KpiCard label="Paused" value={String(data.pausedCount)} />
      </div>
      <p className="text-sm text-text-muted">Gráficos: ver Task 67 (charts).</p>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/dashboard/src/app/page.tsx apps/dashboard/src/components/kpi-card.tsx
git commit -m "feat(dashboard): página Overview com KPIs (sem gráficos ainda)"
```

---

### Task 66: Páginas /tasks e /tasks/[id]

**Files:**
- Create: `apps/dashboard/src/app/tasks/page.tsx`
- Create: `apps/dashboard/src/app/tasks/[id]/page.tsx`
- Create: `apps/dashboard/src/components/task-table.tsx`

- [ ] **Step 1: components/task-table.tsx (client component)**

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUsd, formatDuration, formatRelativeTime, formatTokens } from "@/lib/format";

interface Task {
  id: string;
  title: string;
  status: string;
  projectId: string;
  clientId: string | null;
  startedAt: number;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  timeTotalSeconds: number;
  humanHoursEstimate: number | null;
  humanHoursSource: string;
  billableHours: number | null;
  billableHoursLocked: boolean;
  isBackfilled: boolean;
  confidence: number;
}

export function TaskTable() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!cancelled) { setTasks(data.tasks); setLoading(false); }
    }
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (loading) return <p className="text-text-muted">Carregando...</p>;
  if (tasks.length === 0) return <p className="text-text-muted">Nenhuma task</p>;

  return (
    <table className="w-full text-sm font-mono">
      <thead className="text-text-muted text-xs uppercase border-b border-border">
        <tr>
          <th className="text-left py-2 px-2">Status</th>
          <th className="text-left py-2 px-2">Title</th>
          <th className="text-left py-2 px-2">Tokens</th>
          <th className="text-left py-2 px-2">Cost</th>
          <th className="text-left py-2 px-2">Time</th>
          <th className="text-left py-2 px-2">Billable</th>
          <th className="text-left py-2 px-2">Started</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id} className={`border-b border-border hover:bg-bg-card-hover ${t.isBackfilled ? "opacity-60" : ""}`}>
            <td className="py-2 px-2">
              <span className={`w-2 h-2 inline-block rounded-full ${
                t.status === "open" ? "bg-accent" : t.status === "paused" ? "bg-warning" : "bg-text-muted"
              }`}></span>
            </td>
            <td className="py-2 px-2"><Link href={`/tasks/${t.id}`} className="hover:text-accent">{t.title}</Link></td>
            <td className="py-2 px-2">{formatTokens(t.tokensInput + t.tokensOutput)}</td>
            <td className="py-2 px-2">{formatUsd(t.costUsd)}</td>
            <td className="py-2 px-2">{formatDuration(t.timeTotalSeconds)}</td>
            <td className="py-2 px-2">
              {t.billableHours !== null ? `${t.billableHours.toFixed(1)}h${t.billableHoursLocked ? " 🔒" : ""}` : "-"}
            </td>
            <td className="py-2 px-2 text-text-muted">{formatRelativeTime(t.startedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: /tasks/page.tsx**

```tsx
import { TaskTable } from "@/components/task-table";

export default function TasksPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Tasks</h2>
      <TaskTable />
    </div>
  );
}
```

- [ ] **Step 3: /tasks/[id]/page.tsx**

```tsx
import { getTaskById } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatUsd, formatDuration, formatTokens } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = getTaskById(getDb(), id);
  if (!task) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">{task.title}</h2>
      <div className="card p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-text-muted text-xs">Status</p>
          <p className="font-mono">{task.status}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Modelo principal</p>
          <p className="font-mono">{task.primaryModel ?? "-"}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Tokens (in/out/cache)</p>
          <p className="font-mono">
            {formatTokens(task.tokensInput)}/{formatTokens(task.tokensOutput)}/{formatTokens(task.tokensCacheRead)}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Custo</p>
          <p className="font-mono">{formatUsd(task.costUsd)}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Tempo total</p>
          <p className="font-mono">{formatDuration(task.timeTotalSeconds)}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Horas humanas</p>
          <p className="font-mono">
            {task.humanHoursEstimate?.toFixed(2) ?? "-"} ({task.humanHoursSource})
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Faturáveis</p>
          <p className="font-mono">
            {task.billableHours?.toFixed(2) ?? "-"} {task.billableHoursLocked && "🔒"}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Confidence</p>
          <p className="font-mono">{task.confidence.toFixed(2)}</p>
        </div>
      </div>
      {task.humanHoursReasoning && (
        <div className="card p-4 text-sm">
          <p className="text-text-muted text-xs mb-2">Reasoning Haiku:</p>
          <p>{task.humanHoursReasoning}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/dashboard/src/app/tasks apps/dashboard/src/components/task-table.tsx
git commit -m "feat(dashboard): páginas /tasks e /tasks/[id] com TaskTable client e detalhe server"
```

---

### Task 67: Páginas /clients, /projects, /events

**Files:**
- Create: `apps/dashboard/src/app/clients/page.tsx` + `[id]/page.tsx`
- Create: `apps/dashboard/src/app/projects/page.tsx` + `[id]/page.tsx`
- Create: `apps/dashboard/src/app/events/page.tsx`
- Create: `apps/dashboard/src/components/client-card.tsx`
- Create: `apps/dashboard/src/components/event-form.tsx`

- [ ] **Step 1: client-card.tsx**

```tsx
import Link from "next/link";

export function ClientCard({ data }: {
  data: { clientId: string; clientName: string; billableHours: number; hourLimit: number | null; hourLimitPeriod: string | null };
}) {
  const pct = data.hourLimit ? Math.min(100, (data.billableHours / data.hourLimit) * 100) : 0;
  const overLimit = data.hourLimit !== null && data.billableHours > data.hourLimit;

  return (
    <Link href={`/clients/${data.clientId}`} className="card p-4 block hover:border-hover transition">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold">{data.clientName}</h3>
        {data.hourLimit === null && <span className="chip bg-bg-tertiary text-text-muted">Ilimitado</span>}
      </div>
      <p className="text-2xl font-mono mt-2">
        {data.billableHours.toFixed(1)}h
        {data.hourLimit !== null && <span className="text-sm text-text-muted"> / {data.hourLimit}h</span>}
      </p>
      {data.hourLimit !== null && (
        <div className="mt-2 h-2 bg-bg-tertiary rounded overflow-hidden">
          <div className={`h-full ${overLimit ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }}></div>
        </div>
      )}
      {data.hourLimitPeriod && <p className="text-xs text-text-muted mt-1">por {data.hourLimitPeriod}</p>}
    </Link>
  );
}
```

- [ ] **Step 2: /clients/page.tsx**

```tsx
import { ClientCard } from "@/components/client-card";

async function fetchClients() {
  const res = await fetch("http://127.0.0.1:4833/api/stats/by-client?period=month", { cache: "no-store" });
  return res.json();
}

export default async function ClientsPage() {
  const data = await fetchClients();
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Clientes (mês)</h2>
      <div className="grid grid-cols-3 gap-4">
        {data.byClient.map((c: any) => <ClientCard key={c.clientId} data={c} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: /clients/[id]/page.tsx (detalhe — versão minimalista)**

```tsx
import { getClientById, listTasks, listEvents } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatDuration, formatUsd } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const client = getClientById(db, id);
  if (!client) notFound();
  const tasks = listTasks(db, { clientId: id });
  const events = listEvents(db, { clientId: id });

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalBillable = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0)
    + events.reduce((s, e) => s + e.durationMinutes / 60, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{client.name}</h2>
      <div className="card p-4 grid grid-cols-3 gap-4">
        <div><p className="text-text-muted text-xs">Custo total</p><p className="font-mono text-xl">{formatUsd(totalCost)}</p></div>
        <div><p className="text-text-muted text-xs">Horas faturáveis</p><p className="font-mono text-xl">{totalBillable.toFixed(1)}h</p></div>
        <div><p className="text-text-muted text-xs">Limite</p><p className="font-mono text-xl">{client.hourLimitValue ?? "∞"}h/{client.hourLimitPeriod ?? "-"}</p></div>
      </div>
      <h3 className="font-semibold">Tasks ({tasks.length})</h3>
      <h3 className="font-semibold">Eventos manuais ({events.length})</h3>
    </div>
  );
}
```

- [ ] **Step 4: /projects/page.tsx + [id]/page.tsx**

Análogos a clients. Use `/api/stats/by-project` e `getProjectById`. Skip detalhe complexo na Fase 1.

- [ ] **Step 5: /events/page.tsx + event-form.tsx**

```tsx
// components/event-form.tsx
"use client";
import { useState } from "react";

export function EventForm({ clients, projects, onCreated }: any) {
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    projectId: "",
    title: "",
    description: "",
    kind: "other",
    startAt: new Date().toISOString().slice(0, 16),
    durationMinutes: 30,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      startAt: new Date(form.startAt).getTime(),
      projectId: form.projectId || null,
    };
    await fetch("/api/events", { method: "POST", body: JSON.stringify(payload), headers: { "content-type": "application/json" } });
    onCreated?.();
    setForm({ ...form, title: "", description: "", durationMinutes: 30 });
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1 w-full">
        {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1 w-full">
        <option value="">(sem projeto)</option>
        {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="bg-bg-card border border-border rounded px-3 py-2 w-full" required />
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" className="bg-bg-card border border-border rounded px-3 py-2 w-full" rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1">
          <option value="meeting">Reunião</option>
          <option value="call">Call</option>
          <option value="review">Review</option>
          <option value="other">Outro</option>
        </select>
        <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="bg-bg-card border border-border rounded px-2 py-1" />
      </div>
      <div className="flex gap-3 items-center">
        <label className="text-sm text-text-muted">Duração (min):</label>
        <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} className="bg-bg-card border border-border rounded px-2 py-1 w-24" />
        <button type="submit" className="btn-primary ml-auto">Salvar</button>
      </div>
    </form>
  );
}

// /events/page.tsx
import { listClients, listProjects, listEvents } from "@tracker/db";
import { getDb } from "@/lib/db";
import { EventForm } from "@/components/event-form";

export default async function EventsPage() {
  const db = getDb();
  const clients = listClients(db);
  const projects = listProjects(db);
  const events = listEvents(db, {});
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Eventos manuais</h2>
      <EventForm clients={clients} projects={projects} />
      <ul className="space-y-2">
        {events.slice(0, 50).map((e) => (
          <li key={e.id} className="card p-3 text-sm flex justify-between">
            <div>
              <p className="font-semibold">{e.title}</p>
              <p className="text-text-muted text-xs">{e.kind} • {new Date(e.startAt).toLocaleString()} • {e.durationMinutes}min</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/dashboard/src/app apps/dashboard/src/components
git commit -m "feat(dashboard): páginas /clients, /projects, /events com cards e form"
```

---

### Task 68: Páginas /settings, /diagnostics

**Files:**
- Create: `apps/dashboard/src/app/settings/page.tsx`
- Create: `apps/dashboard/src/app/settings/pricing/page.tsx`
- Create: `apps/dashboard/src/app/settings/currency/page.tsx`
- Create: `apps/dashboard/src/app/diagnostics/page.tsx`
- Create: `apps/dashboard/src/components/settings-form.tsx`

- [ ] **Step 1: settings-form.tsx**

```tsx
"use client";
import { useState, useEffect } from "react";

export function SettingsForm() {
  const [s, setS] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => { setS(d.settings); setLoading(false); });
  }, []);

  async function save(key: string, value: any) {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="card p-4 space-y-3">
        <h3 className="font-semibold">Cálculo de Tempo</h3>
        {[
          { key: "timePerInputTokenSeconds", label: "Tempo por token de input (s)" },
          { key: "timePerProcessingOutputTokenSeconds", label: "Tempo por token output proc (s)" },
          { key: "timePerReadingTokenSeconds", label: "Tempo por token leitura (s)" },
          { key: "cacheReadFactor", label: "Fator cache read" },
          { key: "billableFactorDefault", label: "Billable factor default" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3">
            <span className="text-sm text-text-secondary w-64">{label}</span>
            <input type="number" step="0.01" defaultValue={s[key]}
                   onBlur={(e) => save(key, Number(e.target.value))}
                   className="bg-bg-card border border-border rounded px-2 py-1 w-32 font-mono" />
          </label>
        ))}
      </section>
      <section className="card p-4 space-y-3">
        <h3 className="font-semibold">Detecção</h3>
        {[
          { key: "detection.gapMinutesBase", label: "Gap base (min)" },
          { key: "detection.nightHoursStart", label: "Início janela noturna" },
          { key: "detection.nightHoursEnd", label: "Fim janela noturna" },
          { key: "detection.semanticThreshold", label: "Jaccard threshold (0-1)" },
          { key: "detection.idleCloseHours", label: "Idle close (h)" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3">
            <span className="text-sm text-text-secondary w-64">{label}</span>
            <input type="number" step="0.01" defaultValue={s[key]}
                   onBlur={(e) => save(key, Number(e.target.value))}
                   className="bg-bg-card border border-border rounded px-2 py-1 w-32 font-mono" />
          </label>
        ))}
      </section>
      <section className="card p-4 space-y-3">
        <h3 className="font-semibold">Haiku</h3>
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked={s["haiku.autoEstimateHours"]}
                 onChange={(e) => save("haiku.autoEstimateHours", e.target.checked)} />
          <span className="text-sm">Estimar horas humanas automaticamente</span>
        </label>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: /settings/page.tsx**

```tsx
import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      <SettingsForm />
    </div>
  );
}
```

- [ ] **Step 3: /settings/pricing/page.tsx (lista + add inline)**

```tsx
import { listAllPricing } from "@tracker/db";
import { getDb } from "@/lib/db";

export default async function PricingPage() {
  const rows = listAllPricing(getDb());
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Pricing</h2>
      <table className="w-full text-sm font-mono card">
        <thead className="text-text-muted text-xs">
          <tr><th className="p-2 text-left">Modelo</th><th className="p-2 text-right">Input/M</th><th className="p-2 text-right">Output/M</th><th className="p-2 text-right">Cache R/M</th><th className="p-2 text-left">Valid from</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-2">{r.model}</td>
              <td className="p-2 text-right">${r.inputPerMtok.toFixed(2)}</td>
              <td className="p-2 text-right">${r.outputPerMtok.toFixed(2)}</td>
              <td className="p-2 text-right">${r.cacheReadPerMtok.toFixed(2)}</td>
              <td className="p-2">{new Date(r.validFrom).toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: /settings/currency/page.tsx**

```tsx
import { schema } from "@tracker/db";
import { getDb } from "@/lib/db";
import { desc } from "drizzle-orm";

export default function CurrencyPage() {
  const db = getDb();
  const rows = db.select().from(schema.currencyRates).orderBy(desc(schema.currencyRates.date)).limit(60).all();
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Cotação USD-BRL</h2>
      <table className="w-full text-sm font-mono card">
        <thead className="text-text-muted text-xs">
          <tr><th className="p-2 text-left">Data</th><th className="p-2 text-right">USD-BRL</th><th className="p-2 text-left">Source</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-t border-border">
              <td className="p-2">{r.date}</td>
              <td className="p-2 text-right">{r.usdBrl.toFixed(4)}</td>
              <td className="p-2">{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: /diagnostics/page.tsx**

```tsx
import { listDaemonRuns } from "@tracker/db";
import { getDb } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format";

export default function DiagnosticsPage() {
  const runs = listDaemonRuns(getDb(), { limit: 100 });
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Diagnostics</h2>
      <table className="w-full text-sm font-mono card">
        <thead className="text-text-muted text-xs">
          <tr><th className="p-2">Started</th><th className="p-2">Kind</th><th className="p-2">OK</th><th className="p-2">Files</th><th className="p-2">Tasks</th><th className="p-2">Duration</th><th className="p-2">Errors</th></tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-2">{formatRelativeTime(r.startedAt)}</td>
              <td className="p-2">{r.kind}</td>
              <td className="p-2">{r.ok ? <span className="text-accent">✓</span> : <span className="text-danger">✗</span>}</td>
              <td className="p-2">{r.filesProcessed}/{r.filesScanned}</td>
              <td className="p-2">{r.tasksCreated}+{r.tasksUpdated}</td>
              <td className="p-2">{r.endedAt ? `${((r.endedAt - r.startedAt) / 1000).toFixed(2)}s` : "running"}</td>
              <td className="p-2 text-danger truncate max-w-xs">{r.errors ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/dashboard/src/app
git commit -m "feat(dashboard): páginas Settings/Pricing/Currency/Diagnostics"
```

---

### Task 69: Charts (Recharts) na overview

**Files:**
- Create: `apps/dashboard/src/components/charts/cost-line.tsx`
- Create: `apps/dashboard/src/components/charts/tokens-by-project-bar.tsx`
- Modify: `apps/dashboard/src/app/page.tsx`

- [ ] **Step 1: cost-line.tsx**

```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function CostLine({ data }: { data: Array<{ date: string; cost: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="cost" stroke="#1fe879" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: tokens-by-project-bar.tsx**

```tsx
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function TokensByProjectBar({ data }: { data: Array<{ projectName: string; tokens: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <XAxis dataKey="projectName" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="tokens" fill="#1fe879" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Modificar page.tsx para incluir charts**

```tsx
import { KpiCard } from "@/components/kpi-card";
import { CostLine } from "@/components/charts/cost-line";
import { TokensByProjectBar } from "@/components/charts/tokens-by-project-bar";
import { formatUsd, formatTokens } from "@/lib/format";
import { listTasks, listProjects } from "@tracker/db";
import { getDb } from "@/lib/db";

export default async function OverviewPage() {
  const db = getDb();
  const tasks = listTasks(db, {});
  const projects = listProjects(db);

  const totalCost = tasks.reduce((s, t) => s + t.costUsd, 0);
  const totalTokens = tasks.reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0);
  const totalBillable = tasks.reduce((s, t) => s + (t.billableHours ?? 0), 0);

  // Custo por dia últimos 30d
  const days: Record<string, number> = {};
  const cutoff = Date.now() - 30 * 86400000;
  for (const t of tasks) {
    if (t.startedAt < cutoff) continue;
    const d = new Date(t.startedAt).toISOString().slice(0, 10);
    days[d] = (days[d] ?? 0) + t.costUsd;
  }
  const costByDay = Object.entries(days).sort(([a], [b]) => a.localeCompare(b)).map(([date, cost]) => ({ date, cost }));

  // Tokens por projeto últimos 7d
  const cutoff7 = Date.now() - 7 * 86400000;
  const byProject = projects.map((p) => ({
    projectName: p.name,
    tokens: tasks.filter((t) => t.projectId === p.id && t.startedAt >= cutoff7).reduce((s, t) => s + t.tokensInput + t.tokensOutput, 0),
  })).filter((p) => p.tokens > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Tasks" value={String(tasks.length)} />
        <KpiCard label="Tokens" value={formatTokens(totalTokens)} />
        <KpiCard label="Custo" value={formatUsd(totalCost)} />
        <KpiCard label="Faturáveis" value={`${totalBillable.toFixed(1)}h`} />
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2 text-text-muted">Custo USD por dia (30d)</h3>
        <CostLine data={costByDay} />
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2 text-text-muted">Tokens por projeto (7d)</h3>
        <TokensByProjectBar data={byProject} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build + commit**

```bash
cd /Users/luiz/dev/tracker && pnpm build
git add apps/dashboard/src/components/charts apps/dashboard/src/app/page.tsx
git commit -m "feat(dashboard): gráficos Recharts (cost line + tokens by project)"
```

---

## Self-Review

**Spec coverage:**
- §7.1 Mapa de rotas: ✅ /, /tasks, /tasks/[id], /clients, /clients/[id], /projects, /projects/[id], /events, /settings, /settings/pricing, /settings/currency, /diagnostics.
- §7.2 KpiCard, ClientCard, EventForm, SettingsForm, TaskTable: ✅ tasks 65-69.
- §7.3 Estilo (sidebar, header, paleta claude-mem + accent verde, Monaspace): ✅ tasks 59, 61.
- §7.4 API routes: ✅ tasks 62-64. Polling 30s no TaskTable: ✅.
- TaskDetail completo (task 66 fez subset): básico cobre. Botões refine/estimate/recalc/lock acessíveis via API mas UI inline mais rica é Fase 1.5.

**Limitações conhecidas (intencionais):**
- Heatmap dia×hora (§7.2 OverviewKPIs) não implementado — pode adicionar via task extra ou Fase 1.5.
- Merge/split via UI não tem botão (API existe). Fase 1.5.
- Dark mode toggle manual ausente — segue prefers-color-scheme. Fase 1.5.
- Sem Recharts heatmap (precisa lib auxiliar).

**Type consistency:** componentes usam `any` em alguns props (clients/projects para EventForm) — pode tipar melhor após. Suficiente para Fase 1.

---

## Execution Handoff

**Plan complete e salvo em** `docs/superpowers/plans/2026-05-02-lv-dev-tracker-fase1-plan4-dashboard.md`.

Após executar este plano: dashboard navegável em `localhost:4833` com todas as rotas-chave, KPIs, gráficos básicos e API completa. Falta apenas Plan 5 (infra: install + LaunchAgents + smoke test).
