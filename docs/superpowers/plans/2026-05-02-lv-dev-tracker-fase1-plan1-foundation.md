# LV Dev Tracker Fase 1 — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inicializar o monorepo `/Users/luiz/dev/tracker` e construir os pacotes-base (`@tracker/config`, `@tracker/shared`, `@tracker/db`) que sustentam todos os apps subsequentes.

**Architecture:** pnpm workspaces + Turbo. `@tracker/shared` contém utilitários puros (ULID, calculadora de tempos por tokens, jaccard, redact, schemas Zod, seed de pricing, interface de fonte de transcripts). `@tracker/db` contém o schema Drizzle SQLite, queries tipadas, migrations e seeds. Tudo testado com Vitest. Após este plano, qualquer outro pacote/app importa `@tracker/db` e `@tracker/shared` com tipos completos.

**Tech Stack:** Node ≥20, TypeScript estrito, pnpm 9+, Turbo 2, Vitest 1, Drizzle ORM 0.30+, better-sqlite3 11+, Zod 3+.

**Source spec:** `docs/superpowers/specs/2026-05-02-lv-dev-tracker-design.md`

**Chain:** Após Plan 1, segue Plan 2 (Daemon Core) → Plan 3 (Daemon AI + CLI) → Plan 4 (Dashboard) → Plan 5 (Infra + Smoke).

---

## File Structure (criada/modificada por este plano)

```
/Users/luiz/dev/tracker/
├── package.json                              # M1
├── pnpm-workspace.yaml                       # M1
├── turbo.json                                # M1
├── tsconfig.base.json                        # M1
├── .nvmrc                                    # M1
├── .env.example                              # M1
├── README.md                                 # M1 (skeleton, cresce nos planos seguintes)
├── LICENSE                                   # M1
├── packages/
│   ├── config/
│   │   ├── package.json                      # M1
│   │   ├── eslint.config.cjs                 # M1
│   │   └── prettier.config.cjs               # M1
│   ├── shared/
│   │   ├── package.json                      # M2
│   │   ├── tsconfig.json                     # M2
│   │   ├── vitest.config.ts                  # M2
│   │   └── src/
│   │       ├── index.ts                      # M2 (barrel export)
│   │       ├── ulid.ts                       # M2
│   │       ├── ulid.test.ts                  # M2
│   │       ├── time-calc.ts                  # M2 (3 blocos)
│   │       ├── time-calc.test.ts             # M2
│   │       ├── jaccard.ts                    # M2
│   │       ├── jaccard.test.ts               # M2
│   │       ├── stopwords.ts                  # M2
│   │       ├── redact-patterns.ts            # M2
│   │       ├── redact.ts                     # M2
│   │       ├── redact.test.ts                # M2
│   │       ├── settings-schema.ts            # M2 (Zod)
│   │       ├── settings-schema.test.ts       # M2
│   │       ├── transcript-source.ts          # M2 (interface)
│   │       └── pricing/
│   │           └── anthropic.json            # M2 (seed)
│   └── db/
│       ├── package.json                      # M3
│       ├── tsconfig.json                     # M3
│       ├── vitest.config.ts                  # M3
│       ├── drizzle.config.ts                 # M3
│       └── src/
│           ├── index.ts                      # M3 (barrel)
│           ├── client.ts                     # M3 (better-sqlite3 + WAL)
│           ├── schema.ts                     # M3 (todas as tabelas)
│           ├── seed.ts                       # M3
│           ├── seed.test.ts                  # M3
│           ├── migrate.ts                    # M3 (runner programático)
│           ├── migrations.test.ts            # M3 (integração)
│           ├── migrations/                   # M3 (gerada por drizzle-kit)
│           │   └── 0000_initial.sql
│           └── queries/
│               ├── clients.ts                # M3
│               ├── clients.test.ts           # M3
│               ├── projects.ts               # M3
│               ├── projects.test.ts          # M3
│               ├── sessions.ts               # M3
│               ├── sessions.test.ts          # M3
│               ├── tasks.ts                  # M3
│               ├── tasks.test.ts             # M3
│               ├── events.ts                 # M3
│               ├── events.test.ts            # M3
│               ├── settings.ts               # M3
│               ├── settings.test.ts          # M3
│               ├── pricing.ts                # M3 (com lookup valid_from/until)
│               ├── pricing.test.ts           # M3
│               ├── currency.ts               # M3
│               ├── currency.test.ts          # M3
│               ├── tags.ts                   # M3
│               ├── tags.test.ts              # M3
│               └── diagnostics.ts            # M3 (daemon_runs writer)
```

**Convenções:**
- Test runner: Vitest com `pnpm test`.
- Tests usam SQLite **em memória** (`:memory:`) por arquivo, isolado.
- Cada arquivo de teste cria fresh DB no `beforeEach`.
- Imports: paths explícitos `@tracker/shared/...` resolvidos via `tsconfig.paths`.

---

## Milestone M1 — Bootstrap do Monorepo

### Task 1: Criar root `package.json` e `pnpm-workspace.yaml`

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1: Criar `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Criar `package.json` root**

```json
{
  "name": "tracker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.12.3",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules .turbo"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Verificar pnpm reconhece workspace**

Run: `cd /Users/luiz/dev/tracker && pnpm install`
Expected: cria `node_modules/`, gera `pnpm-lock.yaml`, sem erros.

- [ ] **Step 4: Commit**

```bash
cd /Users/luiz/dev/tracker
git add package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(monorepo): inicializa pnpm workspace"
```

---

### Task 2: Adicionar Turbo + `turbo.json`

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Criar `turbo.json`**

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "globalDependencies": ["tsconfig.base.json", ".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 2: Verificar Turbo executa**

Run: `cd /Users/luiz/dev/tracker && pnpm exec turbo run build --dry-run=json | head -40`
Expected: JSON output com `"tasks": []` (nenhum task ainda, mas Turbo carrega config sem erro).

- [ ] **Step 3: Commit**

```bash
cd /Users/luiz/dev/tracker
git add turbo.json
git commit -m "chore(monorepo): adiciona turbo com tasks build/test/lint/typecheck"
```

---

### Task 3: Configurar TypeScript base e Node version

**Files:**
- Create: `tsconfig.base.json`
- Create: `.nvmrc`

- [ ] **Step 1: Criar `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 2: Criar `.nvmrc`**

```
20
```

- [ ] **Step 3: Verificar Node version**

Run: `cd /Users/luiz/dev/tracker && node --version`
Expected: `v20.x.x` (qualquer 20.x).

- [ ] **Step 4: Commit**

```bash
cd /Users/luiz/dev/tracker
git add tsconfig.base.json .nvmrc
git commit -m "chore(monorepo): configura TypeScript estrito e fixa Node 20"
```

---

### Task 4: Criar `packages/config` com ESLint + Prettier compartilhados

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/eslint.config.cjs`
- Create: `packages/config/prettier.config.cjs`

- [ ] **Step 1: Criar `packages/config/package.json`**

```json
{
  "name": "@tracker/config",
  "version": "0.1.0",
  "private": true,
  "main": "./eslint.config.cjs",
  "files": ["eslint.config.cjs", "prettier.config.cjs"],
  "dependencies": {
    "eslint": "^9.16.0",
    "@typescript-eslint/parser": "^8.18.0",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.4.0"
  }
}
```

- [ ] **Step 2: Criar `packages/config/eslint.config.cjs`**

```javascript
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  prettier,
];
```

- [ ] **Step 3: Criar `packages/config/prettier.config.cjs`**

```javascript
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  arrowParens: "always",
};
```

- [ ] **Step 4: Instalar dependências**

Run: `cd /Users/luiz/dev/tracker && pnpm install`
Expected: instala eslint/prettier no workspace.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/config pnpm-lock.yaml
git commit -m "chore(config): adiciona ESLint v9 flat + Prettier compartilhados"
```

---

### Task 5: Configurar Vitest workspace-wide

**Files:**
- Create: `vitest.workspace.ts`
- Modify: `package.json` (adicionar vitest dev dep)

- [ ] **Step 1: Adicionar Vitest ao root**

Edite `/Users/luiz/dev/tracker/package.json`, seção `devDependencies`, adicionar:

```json
"vitest": "^2.1.8",
"@vitest/ui": "^2.1.8"
```

- [ ] **Step 2: Criar `vitest.workspace.ts`**

```typescript
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/*",
  "apps/*",
]);
```

- [ ] **Step 3: Instalar**

Run: `cd /Users/luiz/dev/tracker && pnpm install`
Expected: vitest instalado.

- [ ] **Step 4: Verificar Vitest carrega**

Run: `cd /Users/luiz/dev/tracker && pnpm exec vitest --version`
Expected: imprime versão (2.1.x).

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add package.json vitest.workspace.ts pnpm-lock.yaml
git commit -m "chore(test): configura Vitest workspace"
```

---

### Task 6: Criar `.env.example`, `LICENSE` e `README.md` skeleton

**Files:**
- Create: `.env.example`
- Create: `LICENSE`
- Create: `README.md`

- [ ] **Step 1: Criar `.env.example`**

```bash
# LV Dev Tracker — variáveis de ambiente
# Copie este arquivo para `.env` e preencha os valores reais.

# Anthropic API key (usada pelo daemon para refinement e estimate via Haiku)
ANTHROPIC_API_KEY=

# Porta do dashboard (default: 4833)
PORT=4833

# Hostname do dashboard (sempre loopback)
HOSTNAME=127.0.0.1

# Ambiente Node
NODE_ENV=development

# Path raiz do tracker (resolvido automaticamente em scripts; override apenas se necessário)
# TRACKER_ROOT=/Users/luiz/dev/tracker

# Diretório dos transcripts do Claude Code (default: ~/.claude/projects)
# CLAUDE_PROJECTS_DIR=/Users/luiz/.claude/projects
```

- [ ] **Step 2: Criar `LICENSE`**

```
UNLICENSED

Copyright (c) 2026 Luiz Vinicius

This software is proprietary and not licensed for any use, modification,
or distribution. All rights reserved.

When the project is published publicly, this file will be replaced
with an OSI-approved license (e.g., MIT or Apache-2.0).
```

- [ ] **Step 3: Criar `README.md` skeleton**

```markdown
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

Requires Node ≥20 and pnpm ≥9.

## License

UNLICENSED — proprietary. See `LICENSE`.
```

- [ ] **Step 4: Commit**

```bash
cd /Users/luiz/dev/tracker
git add .env.example LICENSE README.md
git commit -m "chore(docs): adiciona .env.example, LICENSE e README skeleton"
```

---

## Milestone M2 — `@tracker/shared`

### Task 7: Inicializar `packages/shared`

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts` (placeholder)

- [ ] **Step 1: Criar `packages/shared/package.json`**

```json
{
  "name": "@tracker/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./pricing/anthropic.json": "./src/pricing/anthropic.json"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "ulid": "^2.3.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@tracker/config": "workspace:*",
    "typescript": "^5.6.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Criar `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Criar `packages/shared/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@tracker/shared",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Criar `packages/shared/src/index.ts` placeholder**

```typescript
export const PACKAGE_NAME = "@tracker/shared";
```

- [ ] **Step 5: Instalar dependências**

Run: `cd /Users/luiz/dev/tracker && pnpm install`
Expected: ulid + zod instalados em `packages/shared/node_modules`.

- [ ] **Step 6: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared pnpm-lock.yaml
git commit -m "feat(shared): inicializa pacote @tracker/shared"
```

---

### Task 8: Implementar `ulid.ts` (gerador de IDs)

**Files:**
- Create: `packages/shared/src/ulid.ts`
- Create: `packages/shared/src/ulid.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/shared/src/ulid.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { newId, isValidId } from "./ulid.js";

describe("ulid", () => {
  it("gera ID de 26 chars Crockford base32", () => {
    const id = newId();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("IDs gerados em sequência são monotonicamente crescentes", () => {
    const ids = Array.from({ length: 100 }, () => newId());
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("isValidId aceita ULID válido", () => {
    expect(isValidId(newId())).toBe(true);
  });

  it("isValidId rejeita strings inválidas", () => {
    expect(isValidId("")).toBe(false);
    expect(isValidId("not-a-ulid")).toBe(false);
    expect(isValidId("01ARZ3NDEKTSV4RRFFQ69G5FA")).toBe(false); // 25 chars
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test`
Expected: FAIL — `Cannot find module './ulid.js'`.

- [ ] **Step 3: Implementar**

`packages/shared/src/ulid.ts`:

```typescript
import { ulid, monotonicFactory } from "ulid";

const monotonic = monotonicFactory();

export function newId(): string {
  return monotonic();
}

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function isValidId(value: string): boolean {
  return ULID_REGEX.test(value);
}

export { ulid as ulidFromTime };
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared/src/ulid.ts packages/shared/src/ulid.test.ts
git commit -m "feat(shared): implementa gerador ULID monotônico com validação"
```

---

### Task 9: Implementar `time-calc.ts` (3 blocos de tempo)

**Files:**
- Create: `packages/shared/src/time-calc.ts`
- Create: `packages/shared/src/time-calc.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/shared/src/time-calc.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { calculateTimeBlocks, type TimeCalcConfig, type TokenUsage } from "./time-calc.js";

const defaultConfig: TimeCalcConfig = {
  timePerInputTokenSeconds: 0.5,
  timePerProcessingOutputTokenSeconds: 0.05,
  timePerReadingTokenSeconds: 0.15,
  cacheReadFactor: 0.1,
};

describe("calculateTimeBlocks", () => {
  it("zera todos os blocos quando todos os tokens são zero", () => {
    const tokens: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    const result = calculateTimeBlocks(tokens, defaultConfig);
    expect(result).toEqual({
      inputSeconds: 0,
      processingOutputSeconds: 0,
      readingSeconds: 0,
      totalSeconds: 0,
    });
  });

  it("calcula bloco input incluindo cache_creation full e cache_read com fator", () => {
    const tokens: TokenUsage = { input: 100, output: 0, cacheRead: 200, cacheCreation: 50 };
    const result = calculateTimeBlocks(tokens, defaultConfig);
    // (100 + 50) * 0.5 + 200 * 0.5 * 0.1 = 75 + 10 = 85
    expect(result.inputSeconds).toBeCloseTo(85, 5);
    expect(result.processingOutputSeconds).toBe(0);
    expect(result.readingSeconds).toBe(0);
    expect(result.totalSeconds).toBeCloseTo(85, 5);
  });

  it("calcula bloco processing+output e reading sobre output_tokens", () => {
    const tokens: TokenUsage = { input: 0, output: 1000, cacheRead: 0, cacheCreation: 0 };
    const result = calculateTimeBlocks(tokens, defaultConfig);
    expect(result.processingOutputSeconds).toBeCloseTo(50, 5); // 1000 * 0.05
    expect(result.readingSeconds).toBeCloseTo(150, 5); // 1000 * 0.15
    expect(result.totalSeconds).toBeCloseTo(200, 5);
  });

  it("respeita config customizada (override de constantes)", () => {
    const tokens: TokenUsage = { input: 100, output: 100, cacheRead: 0, cacheCreation: 0 };
    const custom: TimeCalcConfig = {
      timePerInputTokenSeconds: 1,
      timePerProcessingOutputTokenSeconds: 1,
      timePerReadingTokenSeconds: 1,
      cacheReadFactor: 0,
    };
    const result = calculateTimeBlocks(tokens, custom);
    expect(result.inputSeconds).toBe(100);
    expect(result.processingOutputSeconds).toBe(100);
    expect(result.readingSeconds).toBe(100);
    expect(result.totalSeconds).toBe(300);
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test time-calc`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar**

`packages/shared/src/time-calc.ts`:

```typescript
export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export interface TimeCalcConfig {
  timePerInputTokenSeconds: number;
  timePerProcessingOutputTokenSeconds: number;
  timePerReadingTokenSeconds: number;
  cacheReadFactor: number;
}

export interface TimeBlocks {
  inputSeconds: number;
  processingOutputSeconds: number;
  readingSeconds: number;
  totalSeconds: number;
}

export function calculateTimeBlocks(
  tokens: TokenUsage,
  config: TimeCalcConfig,
): TimeBlocks {
  const inputBillableTokens = tokens.input + tokens.cacheCreation;
  const cacheReadEffectiveTokens = tokens.cacheRead * config.cacheReadFactor;

  const inputSeconds =
    (inputBillableTokens + cacheReadEffectiveTokens) *
    config.timePerInputTokenSeconds;

  const processingOutputSeconds =
    tokens.output * config.timePerProcessingOutputTokenSeconds;

  const readingSeconds = tokens.output * config.timePerReadingTokenSeconds;

  const totalSeconds = inputSeconds + processingOutputSeconds + readingSeconds;

  return { inputSeconds, processingOutputSeconds, readingSeconds, totalSeconds };
}
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test time-calc`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared/src/time-calc.ts packages/shared/src/time-calc.test.ts
git commit -m "feat(shared): implementa calculadora de 3 blocos de tempo por tokens"
```

---

### Task 10: Implementar `stopwords.ts` + `jaccard.ts`

**Files:**
- Create: `packages/shared/src/stopwords.ts`
- Create: `packages/shared/src/jaccard.ts`
- Create: `packages/shared/src/jaccard.test.ts`

- [ ] **Step 1: Criar lista de stopwords PT/EN**

`packages/shared/src/stopwords.ts`:

```typescript
export const STOPWORDS_PT = new Set([
  "a", "o", "e", "de", "da", "do", "das", "dos", "para", "por", "com",
  "sem", "que", "qual", "quais", "como", "quando", "onde", "porque",
  "ja", "ainda", "nao", "sim", "mais", "menos", "muito", "pouco",
  "esse", "essa", "isso", "aquele", "aquela", "aquilo", "este", "esta",
  "isto", "ele", "ela", "eles", "elas", "eu", "tu", "voce", "voces",
  "nos", "lhe", "me", "te", "se", "um", "uma", "uns", "umas", "ou",
  "tambem", "entao", "agora", "ainda", "ate", "mas", "porem", "no",
  "na", "nos", "nas", "ao", "aos", "tem", "ter", "vai", "vao", "fazer",
]);

export const STOPWORDS_EN = new Set([
  "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to",
  "for", "with", "by", "from", "up", "about", "into", "over", "after",
  "is", "are", "was", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "need", "i", "you", "he",
  "she", "it", "we", "they", "this", "that", "these", "those", "what",
  "which", "who", "whom", "where", "when", "why", "how",
]);

export function isStopword(token: string): boolean {
  return STOPWORDS_PT.has(token) || STOPWORDS_EN.has(token);
}
```

- [ ] **Step 2: Escrever teste falhando para jaccard**

`packages/shared/src/jaccard.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { jaccardSimilarity, tokenize } from "./jaccard.js";

describe("tokenize", () => {
  it("normaliza para lowercase, remove pontuação, ignora tokens curtos e stopwords", () => {
    const tokens = tokenize("O Sinusal está com bug no checkout. Vamos corrigir!");
    expect(tokens).toContain("sinusal");
    expect(tokens).toContain("checkout");
    expect(tokens).toContain("corrigir");
    expect(tokens).not.toContain("o");
    expect(tokens).not.toContain("com");
    expect(tokens).not.toContain("no");
  });

  it("ignora tokens com menos de 4 chars", () => {
    const tokens = tokenize("um dois tres bug");
    expect(tokens).not.toContain("um");
    expect(tokens).not.toContain("bug"); // 3 chars
  });
});

describe("jaccardSimilarity", () => {
  it("retorna 1 para textos idênticos", () => {
    expect(jaccardSimilarity("hotfix sinusal pagamento", "hotfix sinusal pagamento")).toBe(1);
  });

  it("retorna 0 para textos sem palavras em comum", () => {
    expect(jaccardSimilarity("hotfix sinusal", "componente dashboard")).toBe(0);
  });

  it("retorna valor entre 0 e 1 para overlap parcial", () => {
    const sim = jaccardSimilarity(
      "hotfix sinusal pagamento clinica",
      "hotfix sinusal exame paciente",
    );
    // intersect = {hotfix, sinusal} = 2; union = {hotfix, sinusal, pagamento, clinica, exame, paciente} = 6
    expect(sim).toBeCloseTo(2 / 6, 5);
  });

  it("retorna 0 quando ambos os textos só têm stopwords", () => {
    expect(jaccardSimilarity("o que e", "a o e")).toBe(0);
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test jaccard`
Expected: FAIL — module not found.

- [ ] **Step 4: Implementar**

`packages/shared/src/jaccard.ts`:

```typescript
import { isStopword } from "./stopwords.js";

const MIN_TOKEN_LENGTH = 4;

export function tokenize(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " "); // pontuação vira espaço

  const tokens = new Set<string>();
  for (const word of normalized.split(/\s+/)) {
    if (word.length >= MIN_TOKEN_LENGTH && !isStopword(word)) {
      tokens.add(word);
    }
  }
  return tokens;
}

export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 0;

  let intersectSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectSize++;
  }

  const unionSize = tokensA.size + tokensB.size - intersectSize;
  return unionSize === 0 ? 0 : intersectSize / unionSize;
}
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test jaccard`
Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared/src/stopwords.ts packages/shared/src/jaccard.ts packages/shared/src/jaccard.test.ts
git commit -m "feat(shared): implementa tokenizador e similaridade de Jaccard com stopwords PT/EN"
```

---

### Task 11: Implementar redator (`redact.ts` + patterns)

**Files:**
- Create: `packages/shared/src/redact-patterns.ts`
- Create: `packages/shared/src/redact.ts`
- Create: `packages/shared/src/redact.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/shared/src/redact.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { redact } from "./redact.js";

describe("redact", () => {
  it("redige AKIA AWS access key id", () => {
    const out = redact("Use AKIAIOSFODNN7EXAMPLE para acessar S3");
    expect(out).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(out).toContain("[REDACTED:AWS_ACCESS_KEY]");
  });

  it("redige Anthropic API key", () => {
    const out = redact("ANTHROPIC_API_KEY=sk-ant-api03-abcdef1234567890abcdef1234567890");
    expect(out).not.toContain("sk-ant-api03-abcdef1234567890abcdef1234567890");
    expect(out).toContain("[REDACTED:ANTHROPIC_API_KEY]");
  });

  it("redige GitHub PAT", () => {
    const out = redact("token: ghp_abcdef1234567890ABCDEF1234567890abcd");
    expect(out).not.toContain("ghp_abcdef1234567890ABCDEF1234567890abcd");
    expect(out).toContain("[REDACTED:GITHUB_PAT]");
  });

  it("redige Bearer tokens longos", () => {
    const out = redact("Authorization: Bearer abc123XYZ456def789ghi012jkl345mno678pqr901");
    expect(out).not.toContain("abc123XYZ456def789ghi012jkl345mno678pqr901");
    expect(out).toContain("[REDACTED:BEARER]");
  });

  it("redige linhas estilo .env com password", () => {
    const out = redact("DB_PASSWORD=super-secret-123\nDB_HOST=localhost");
    expect(out).not.toContain("super-secret-123");
    expect(out).toContain("[REDACTED:ENV_PASSWORD]");
    expect(out).toContain("DB_HOST=localhost");
  });

  it("redige Stripe live keys", () => {
    const out = redact("stripe key sk_live_abcdef1234567890ABCDEFGHIJK");
    expect(out).not.toContain("sk_live_abcdef1234567890ABCDEFGHIJK");
    expect(out).toContain("[REDACTED:STRIPE_KEY]");
  });

  it("preserva texto sem segredos", () => {
    const safe = "Esta é uma mensagem sem nada sensível, só código normal.";
    expect(redact(safe)).toBe(safe);
  });

  it("aplica múltiplos padrões no mesmo texto", () => {
    const out = redact("AKIAIOSFODNN7EXAMPLE e sk-ant-api03-abcdef1234567890abcdef1234567890");
    expect(out).toContain("[REDACTED:AWS_ACCESS_KEY]");
    expect(out).toContain("[REDACTED:ANTHROPIC_API_KEY]");
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test redact`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `redact-patterns.ts`**

`packages/shared/src/redact-patterns.ts`:

```typescript
export interface RedactPattern {
  kind: string;
  regex: RegExp;
}

export const REDACT_PATTERNS: RedactPattern[] = [
  { kind: "ANTHROPIC_API_KEY", regex: /sk-ant-api\d{2}-[A-Za-z0-9_-]{20,}/g },
  { kind: "AWS_ACCESS_KEY", regex: /AKIA[0-9A-Z]{16}/g },
  { kind: "GITHUB_PAT", regex: /gh[ousp]_[A-Za-z0-9]{36,}/g },
  { kind: "STRIPE_KEY", regex: /(?:sk|pk|rk)_live_[A-Za-z0-9]{20,}/g },
  { kind: "BEARER", regex: /Bearer\s+[A-Za-z0-9_\-.]{30,}/gi },
  {
    kind: "ENV_PASSWORD",
    regex: /^([A-Z_][A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|KEY))=.+$/gm,
  },
];
```

- [ ] **Step 4: Implementar `redact.ts`**

`packages/shared/src/redact.ts`:

```typescript
import { REDACT_PATTERNS } from "./redact-patterns.js";

export function redact(text: string): string {
  let result = text;
  for (const { kind, regex } of REDACT_PATTERNS) {
    result = result.replace(regex, (match) => {
      // Para padrões em formato KEY=value, preserva a chave
      if (kind === "ENV_PASSWORD") {
        const eqIdx = match.indexOf("=");
        return `${match.slice(0, eqIdx)}=[REDACTED:${kind}]`;
      }
      return `[REDACTED:${kind}]`;
    });
  }
  return result;
}
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test redact`
Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared/src/redact.ts packages/shared/src/redact-patterns.ts packages/shared/src/redact.test.ts
git commit -m "feat(shared): implementa redação de segredos antes de chamadas Haiku"
```

---

### Task 12: Implementar schema Zod de settings

**Files:**
- Create: `packages/shared/src/settings-schema.ts`
- Create: `packages/shared/src/settings-schema.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/shared/src/settings-schema.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  parseSettingValue,
  SETTINGS_SCHEMAS,
} from "./settings-schema.js";

describe("DEFAULT_SETTINGS", () => {
  it("contém todas as chaves esperadas com defaults documentados", () => {
    expect(DEFAULT_SETTINGS.timePerInputTokenSeconds).toBe(0.5);
    expect(DEFAULT_SETTINGS.timePerProcessingOutputTokenSeconds).toBe(0.05);
    expect(DEFAULT_SETTINGS.timePerReadingTokenSeconds).toBe(0.15);
    expect(DEFAULT_SETTINGS.cacheReadFactor).toBe(0.1);
    expect(DEFAULT_SETTINGS.billableFactorDefault).toBe(0.4);
    expect(DEFAULT_SETTINGS.detection.gapMinutesBase).toBe(30);
    expect(DEFAULT_SETTINGS.detection.nightHoursStart).toBe(23);
    expect(DEFAULT_SETTINGS.detection.nightHoursEnd).toBe(9);
    expect(DEFAULT_SETTINGS.detection.semanticThreshold).toBe(0.65);
    expect(DEFAULT_SETTINGS.detection.idleCloseHours).toBe(6);
    expect(DEFAULT_SETTINGS.haiku.autoRefineAboveTokens).toBe(5000);
    expect(DEFAULT_SETTINGS.haiku.autoEstimateHours).toBe(true);
    expect(DEFAULT_SETTINGS.currency.preferredDisplay).toBe("USD");
  });
});

describe("parseSettingValue", () => {
  it("aceita valor válido conforme schema da chave", () => {
    expect(parseSettingValue("billableFactorDefault", 0.5)).toBe(0.5);
  });

  it("rejeita valor fora do range", () => {
    expect(() => parseSettingValue("billableFactorDefault", -1)).toThrow();
    expect(() => parseSettingValue("billableFactorDefault", 2)).toThrow();
  });

  it("aceita enum válido", () => {
    expect(parseSettingValue("currency.preferredDisplay", "BRL")).toBe("BRL");
  });

  it("rejeita enum inválido", () => {
    expect(() => parseSettingValue("currency.preferredDisplay", "EUR")).toThrow();
  });

  it("rejeita chave desconhecida", () => {
    expect(() => parseSettingValue("foo.bar" as never, 1)).toThrow();
  });
});

describe("SETTINGS_SCHEMAS", () => {
  it("tem schema para todas as chaves de DEFAULT_SETTINGS (recursivo)", () => {
    function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
      return Object.entries(obj).flatMap(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        return typeof v === "object" && v !== null && !Array.isArray(v)
          ? flatten(v as Record<string, unknown>, key)
          : [key];
      });
    }
    const flatKeys = flatten(DEFAULT_SETTINGS);
    for (const key of flatKeys) {
      expect(SETTINGS_SCHEMAS).toHaveProperty(key);
    }
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test settings-schema`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar**

`packages/shared/src/settings-schema.ts`:

```typescript
import { z } from "zod";

export const DEFAULT_SETTINGS = {
  timePerInputTokenSeconds: 0.5,
  timePerProcessingOutputTokenSeconds: 0.05,
  timePerReadingTokenSeconds: 0.15,
  cacheReadFactor: 0.1,
  billableFactorDefault: 0.4,
  detection: {
    gapMinutesBase: 30,
    nightHoursStart: 23,
    nightHoursEnd: 9,
    semanticThreshold: 0.65,
    resumeKeywords: ["voltando", "retomando", "continua", "vamos seguir", "volta"],
    newTopicKeywords: ["agora", "outra coisa", "muda de assunto", "novo "],
    idleCloseHours: 6,
  },
  haiku: {
    autoRefineAboveTokens: 5000,
    autoEstimateHours: true,
    maxConcurrent: 3,
    requestsPerSecond: 1,
  },
  currency: {
    preferredDisplay: "USD" as "USD" | "BRL",
    fetchAtHourBrt: 6,
  },
} as const;

export type Settings = typeof DEFAULT_SETTINGS;

const positiveFiniteFactor = z.number().nonnegative().lte(1000);
const factor01 = z.number().nonnegative().lte(1);
const hour = z.number().int().min(0).max(23);
const positiveInt = z.number().int().positive();
const stringArray = z.array(z.string().min(1));

export const SETTINGS_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "timePerInputTokenSeconds": positiveFiniteFactor,
  "timePerProcessingOutputTokenSeconds": positiveFiniteFactor,
  "timePerReadingTokenSeconds": positiveFiniteFactor,
  "cacheReadFactor": factor01,
  "billableFactorDefault": factor01,
  "detection.gapMinutesBase": positiveInt,
  "detection.nightHoursStart": hour,
  "detection.nightHoursEnd": hour,
  "detection.semanticThreshold": factor01,
  "detection.resumeKeywords": stringArray,
  "detection.newTopicKeywords": stringArray,
  "detection.idleCloseHours": positiveInt,
  "haiku.autoRefineAboveTokens": positiveInt,
  "haiku.autoEstimateHours": z.boolean(),
  "haiku.maxConcurrent": positiveInt,
  "haiku.requestsPerSecond": positiveInt,
  "currency.preferredDisplay": z.enum(["USD", "BRL"]),
  "currency.fetchAtHourBrt": hour,
};

export type SettingKey = keyof typeof SETTINGS_SCHEMAS;

export function parseSettingValue(key: SettingKey, value: unknown): unknown {
  const schema = SETTINGS_SCHEMAS[key];
  if (!schema) throw new Error(`Unknown settings key: ${String(key)}`);
  return schema.parse(value);
}
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test settings-schema`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared/src/settings-schema.ts packages/shared/src/settings-schema.test.ts
git commit -m "feat(shared): defines defaults e schema Zod das settings tipadas"
```

---

### Task 13: Adicionar seed de pricing Anthropic e tipos

**Files:**
- Create: `packages/shared/src/pricing/anthropic.json`
- Create: `packages/shared/src/pricing.ts`
- Create: `packages/shared/src/pricing.test.ts`

- [ ] **Step 1: Criar `packages/shared/src/pricing/anthropic.json`**

```json
{
  "pricings": [
    {
      "model": "claude-opus-4-7",
      "input_per_mtok": 15,
      "output_per_mtok": 75,
      "cache_read_per_mtok": 1.5,
      "cache_creation_per_mtok": 18.75,
      "valid_from": "2026-01-01T00:00:00Z",
      "valid_until": null,
      "source": "anthropic-pricing-page"
    },
    {
      "model": "claude-sonnet-4-6",
      "input_per_mtok": 3,
      "output_per_mtok": 15,
      "cache_read_per_mtok": 0.3,
      "cache_creation_per_mtok": 3.75,
      "valid_from": "2026-01-01T00:00:00Z",
      "valid_until": null,
      "source": "anthropic-pricing-page"
    },
    {
      "model": "claude-haiku-4-5-20251001",
      "input_per_mtok": 0.8,
      "output_per_mtok": 4,
      "cache_read_per_mtok": 0.08,
      "cache_creation_per_mtok": 1,
      "valid_from": "2025-10-01T00:00:00Z",
      "valid_until": null,
      "source": "anthropic-pricing-page"
    }
  ]
}
```

> **Nota:** valores acima são placeholders sensatos baseados em padrões públicos. O usuário deve revisar e ajustar via UI ou tabela antes do uso real. Atualizações futuras chegam via PR neste arquivo.

- [ ] **Step 2: Escrever teste falhando**

`packages/shared/src/pricing.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  calculateCost,
  type PricingRow,
  type TokensForCost,
  loadAnthropicPricingSeed,
} from "./pricing.js";

const sonnetPricing: PricingRow = {
  model: "claude-sonnet-4-6",
  inputPerMtok: 3,
  outputPerMtok: 15,
  cacheReadPerMtok: 0.3,
  cacheCreationPerMtok: 3.75,
  validFromMs: 0,
  validUntilMs: null,
};

describe("calculateCost", () => {
  it("calcula custo zero para zero tokens", () => {
    const tokens: TokensForCost = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    expect(calculateCost(tokens, sonnetPricing)).toBe(0);
  });

  it("calcula custo do Sonnet com 1M tokens input + 1M output", () => {
    const tokens: TokensForCost = {
      input: 1_000_000,
      output: 1_000_000,
      cacheRead: 0,
      cacheCreation: 0,
    };
    expect(calculateCost(tokens, sonnetPricing)).toBeCloseTo(18, 5); // 3 + 15
  });

  it("calcula custo proporcional incluindo caches", () => {
    const tokens: TokensForCost = {
      input: 100_000,
      output: 50_000,
      cacheRead: 200_000,
      cacheCreation: 10_000,
    };
    // 0.3 (input) + 0.75 (output) + 0.06 (cache_read) + 0.0375 (cache_creation) = 1.1475
    expect(calculateCost(tokens, sonnetPricing)).toBeCloseTo(1.1475, 5);
  });
});

describe("loadAnthropicPricingSeed", () => {
  it("carrega seed JSON com pelo menos os 3 modelos atuais", () => {
    const seed = loadAnthropicPricingSeed();
    const models = seed.map((p) => p.model);
    expect(models).toContain("claude-opus-4-7");
    expect(models).toContain("claude-sonnet-4-6");
    expect(models).toContain("claude-haiku-4-5-20251001");
  });

  it("converte valid_from string para epoch ms", () => {
    const seed = loadAnthropicPricingSeed();
    for (const row of seed) {
      expect(typeof row.validFromMs).toBe("number");
      expect(row.validFromMs).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test pricing`
Expected: FAIL — module not found.

- [ ] **Step 4: Implementar `pricing.ts`**

`packages/shared/src/pricing.ts`:

```typescript
import seedJson from "./pricing/anthropic.json" with { type: "json" };

export interface TokensForCost {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export interface PricingRow {
  model: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheReadPerMtok: number;
  cacheCreationPerMtok: number;
  validFromMs: number;
  validUntilMs: number | null;
  source?: string;
}

const PER_MTOK = 1_000_000;

export function calculateCost(tokens: TokensForCost, p: PricingRow): number {
  return (
    (tokens.input * p.inputPerMtok +
      tokens.output * p.outputPerMtok +
      tokens.cacheRead * p.cacheReadPerMtok +
      tokens.cacheCreation * p.cacheCreationPerMtok) /
    PER_MTOK
  );
}

export function loadAnthropicPricingSeed(): PricingRow[] {
  return seedJson.pricings.map((p) => ({
    model: p.model,
    inputPerMtok: p.input_per_mtok,
    outputPerMtok: p.output_per_mtok,
    cacheReadPerMtok: p.cache_read_per_mtok,
    cacheCreationPerMtok: p.cache_creation_per_mtok,
    validFromMs: Date.parse(p.valid_from),
    validUntilMs: p.valid_until ? Date.parse(p.valid_until) : null,
    source: p.source,
  }));
}
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm test pricing`
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared/src/pricing.ts packages/shared/src/pricing.test.ts packages/shared/src/pricing/anthropic.json
git commit -m "feat(shared): adiciona seed de pricing Anthropic e calculadora de custo"
```

---

### Task 14: Definir `TranscriptSource` interface

**Files:**
- Create: `packages/shared/src/transcript-source.ts`

- [ ] **Step 1: Implementar interface**

`packages/shared/src/transcript-source.ts`:

```typescript
/**
 * Abstração de fonte de transcripts. Permite plugar diferentes origens
 * (Claude Code JSONL, Codex, Cursor) sem alterar o daemon.
 */
export interface TranscriptMessage {
  uuid: string;
  role: "user" | "assistant" | "system";
  timestampMs: number;
  text: string;
  model?: string;
  tokens?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  };
  toolUses?: Array<{ name: string; input: unknown }>;
}

export interface TranscriptFileInfo {
  path: string;
  sessionId: string;
  projectDir: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface TranscriptDelta {
  file: TranscriptFileInfo;
  fromOffset: number;
  toOffset: number;
  messages: TranscriptMessage[];
}

export interface TranscriptSource {
  readonly name: string;
  listFiles(): Promise<TranscriptFileInfo[]>;
  readDelta(file: TranscriptFileInfo, fromOffset: number): Promise<TranscriptDelta>;
}
```

> Sem teste unitário próprio — é interface pura. Implementações concretas (`ClaudeCodeJsonlSource`) virão no Plan 2 com testes.

- [ ] **Step 2: Verificar typecheck do pacote**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm typecheck`
Expected: PASS — sem erros TS.

- [ ] **Step 3: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared/src/transcript-source.ts
git commit -m "feat(shared): define interface TranscriptSource para fontes plugáveis"
```

---

### Task 15: Atualizar barrel export `index.ts`

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Substituir `index.ts`**

`packages/shared/src/index.ts`:

```typescript
export * from "./ulid.js";
export * from "./time-calc.js";
export * from "./jaccard.js";
export { isStopword, STOPWORDS_PT, STOPWORDS_EN } from "./stopwords.js";
export * from "./redact.js";
export { REDACT_PATTERNS, type RedactPattern } from "./redact-patterns.js";
export {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMAS,
  parseSettingValue,
  type Settings,
  type SettingKey,
} from "./settings-schema.js";
export {
  calculateCost,
  loadAnthropicPricingSeed,
  type PricingRow,
  type TokensForCost,
} from "./pricing.js";
export type {
  TranscriptSource,
  TranscriptMessage,
  TranscriptFileInfo,
  TranscriptDelta,
} from "./transcript-source.js";
```

- [ ] **Step 2: Verificar typecheck e tests do pacote inteiro**

Run: `cd /Users/luiz/dev/tracker/packages/shared && pnpm typecheck && pnpm test`
Expected: PASS — typecheck sem erros, todos os tests verdes (~30 testes acumulados).

- [ ] **Step 3: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/shared/src/index.ts
git commit -m "feat(shared): exporta API pública do pacote via barrel index"
```

---

## Milestone M3 — `@tracker/db`

### Task 16: Inicializar `packages/db`

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/vitest.config.ts`
- Create: `packages/db/drizzle.config.ts`

- [ ] **Step 1: Criar `packages/db/package.json`**

```json
{
  "name": "@tracker/db",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts",
    "./client": "./src/client.ts",
    "./migrate": "./src/migrate.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/migrate.ts"
  },
  "dependencies": {
    "@tracker/shared": "workspace:*",
    "better-sqlite3": "^11.5.0",
    "drizzle-orm": "^0.36.4"
  },
  "devDependencies": {
    "@tracker/config": "workspace:*",
    "@types/better-sqlite3": "^7.6.12",
    "drizzle-kit": "^0.28.1",
    "tsx": "^4.19.2",
    "typescript": "^5.6.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Criar `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Criar `packages/db/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@tracker/db",
    include: ["src/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    poolOptions: { forks: { singleFork: false } },
  },
});
```

- [ ] **Step 4: Criar `packages/db/drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./src/migrations",
  dialect: "sqlite",
  strict: true,
  verbose: true,
});
```

- [ ] **Step 5: Instalar dependências**

Run: `cd /Users/luiz/dev/tracker && pnpm install`
Expected: drizzle, better-sqlite3, drizzle-kit instalados.

- [ ] **Step 6: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db pnpm-lock.yaml
git commit -m "feat(db): inicializa pacote @tracker/db com Drizzle + better-sqlite3"
```

---

### Task 17: Implementar cliente SQLite com WAL (`client.ts`)

**Files:**
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/client.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/db/src/client.test.ts`:

```typescript
import { describe, expect, it, afterEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "./client.js";

const tempDbPath = join(tmpdir(), `tracker-test-${Date.now()}.db`);

afterEach(() => {
  if (existsSync(tempDbPath)) rmSync(tempDbPath, { force: true });
  if (existsSync(`${tempDbPath}-shm`)) rmSync(`${tempDbPath}-shm`, { force: true });
  if (existsSync(`${tempDbPath}-wal`)) rmSync(`${tempDbPath}-wal`, { force: true });
});

describe("createClient", () => {
  it("cria DB SQLite no path especificado", () => {
    const { sqlite, db } = createClient(tempDbPath);
    expect(existsSync(tempDbPath)).toBe(true);
    sqlite.close();
    expect(db).toBeDefined();
  });

  it("habilita WAL mode", () => {
    const { sqlite } = createClient(tempDbPath);
    const journalMode = sqlite.pragma("journal_mode", { simple: true });
    expect(journalMode).toBe("wal");
    sqlite.close();
  });

  it("habilita foreign_keys", () => {
    const { sqlite } = createClient(tempDbPath);
    const fk = sqlite.pragma("foreign_keys", { simple: true });
    expect(fk).toBe(1);
    sqlite.close();
  });

  it("aceita ':memory:' para testes", () => {
    const { sqlite, db } = createClient(":memory:");
    expect(db).toBeDefined();
    sqlite.close();
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test client`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `client.ts`**

`packages/db/src/client.ts`:

```typescript
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type DbClient = BetterSQLite3Database<typeof schema>;

export interface ClientHandles {
  sqlite: Database.Database;
  db: DbClient;
}

export function createClient(path: string): ClientHandles {
  const sqlite = new Database(path);
  if (path !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("temp_store = MEMORY");
  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}
```

> **Nota:** o teste irá falhar enquanto `schema.ts` não existir. Vamos criar schema vazio primeiro para destravar.

- [ ] **Step 4: Criar `schema.ts` vazio temporário**

`packages/db/src/schema.ts`:

```typescript
// Tabelas serão adicionadas na próxima task.
export const __placeholder = true;
```

- [ ] **Step 5: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test client`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/client.ts packages/db/src/client.test.ts packages/db/src/schema.ts
git commit -m "feat(db): implementa cliente SQLite com WAL, FK e schema placeholder"
```

---

### Task 18: Definir schema Drizzle completo (todas as tabelas Fase 1 + placeholders)

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/src/schema.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/db/src/schema.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  clients,
  projects,
  sessions,
  tasks,
  tags,
  taskTags,
  manualEvents,
  modelPricing,
  currencyRates,
  settings,
  daemonRuns,
  devs,
  goals,
  notes,
} from "./schema.js";

describe("schema exports", () => {
  it("exporta tabelas Fase 1", () => {
    for (const t of [clients, projects, sessions, tasks, tags, taskTags, manualEvents, modelPricing, currencyRates, settings, daemonRuns]) {
      expect(t).toBeDefined();
    }
  });

  it("exporta tabelas placeholder Fase 2", () => {
    expect(devs).toBeDefined();
    expect(goals).toBeDefined();
    expect(notes).toBeDefined();
  });

  it("tasks tem todas colunas chave do spec", () => {
    const cols = Object.keys(tasks);
    for (const expected of [
      "id", "sessionId", "projectId", "clientId", "title", "status",
      "tokensInput", "tokensOutput", "tokensCacheRead", "tokensCacheCreation",
      "primaryModel", "modelsUsed",
      "timeInputSeconds", "timeProcessingOutputSeconds", "timeReadingSeconds", "timeTotalSeconds",
      "humanHoursEstimate", "humanHoursSource", "billableHours", "billableHoursLocked",
      "costUsd", "isBackfilled", "refinedByHaiku", "confidence",
    ]) {
      expect(cols).toContain(expected);
    }
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test schema`
Expected: FAIL — exports não existem.

- [ ] **Step 3: Substituir `schema.ts` com schema completo**

`packages/db/src/schema.ts`:

```typescript
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const ts = (name: string) =>
  integer(name, { mode: "number" }).notNull();
const optTs = (name: string) => integer(name, { mode: "number" });
const bool = (name: string, def = false) =>
  integer(name, { mode: "boolean" }).notNull().default(def);

// ─── CLIENTS ────────────────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  hourLimitValue: real("hour_limit_value"),
  hourLimitPeriod: text("hour_limit_period", { enum: ["week", "month"] }),
  billableFactor: real("billable_factor").notNull().default(0.4),
  color: text("color"),
  notes: text("notes"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

// ─── PROJECTS ───────────────────────────────────────────────────────
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    cwdPath: text("cwd_path").notNull().unique(),
    claudeProjectDir: text("claude_project_dir").unique(),
    clientId: text("client_id").references(() => clients.id),
    color: text("color"),
    active: bool("active", true),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => ({ idxClient: index("idx_projects_client").on(t.clientId) }),
);

// ─── SESSIONS ───────────────────────────────────────────────────────
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id),
    jsonlPath: text("jsonl_path").notNull().unique(),
    startedAt: optTs("started_at"),
    endedAt: optTs("ended_at"),
    messageCount: integer("message_count").notNull().default(0),
    totalTokensInput: integer("total_tokens_input").notNull().default(0),
    totalTokensOutput: integer("total_tokens_output").notNull().default(0),
    totalTokensCacheRead: integer("total_tokens_cache_read").notNull().default(0),
    totalTokensCacheCreation: integer("total_tokens_cache_creation").notNull().default(0),
    totalCostUsd: real("total_cost_usd").notNull().default(0),
    lastProcessedOffset: integer("last_processed_offset").notNull().default(0),
    lastProcessedAt: optTs("last_processed_at"),
  },
  (t) => ({ idxProject: index("idx_sessions_project").on(t.projectId) }),
);

// ─── TASKS ──────────────────────────────────────────────────────────
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => sessions.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    status: text("status", { enum: ["open", "paused", "closed"] }).notNull().default("open"),
    startedAt: ts("started_at"),
    endedAt: optTs("ended_at"),
    firstMessageUuid: text("first_message_uuid"),
    lastMessageUuid: text("last_message_uuid"),
    tokensInput: integer("tokens_input").notNull().default(0),
    tokensOutput: integer("tokens_output").notNull().default(0),
    tokensCacheRead: integer("tokens_cache_read").notNull().default(0),
    tokensCacheCreation: integer("tokens_cache_creation").notNull().default(0),
    primaryModel: text("primary_model"),
    modelsUsed: text("models_used"),
    timeInputSeconds: real("time_input_seconds").notNull().default(0),
    timeProcessingOutputSeconds: real("time_processing_output_seconds").notNull().default(0),
    timeReadingSeconds: real("time_reading_seconds").notNull().default(0),
    timeTotalSeconds: real("time_total_seconds").notNull().default(0),
    humanHoursEstimate: real("human_hours_estimate"),
    humanHoursSource: text("human_hours_source", { enum: ["haiku", "manual", "none"] })
      .notNull()
      .default("none"),
    humanHoursReasoning: text("human_hours_reasoning"),
    billableHours: real("billable_hours"),
    billableHoursLocked: bool("billable_hours_locked"),
    costUsd: real("cost_usd").notNull().default(0),
    isBackfilled: bool("is_backfilled"),
    refinedByHaiku: bool("refined_by_haiku"),
    confidence: real("confidence").notNull().default(1),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => ({
    idxProjectStarted: index("idx_tasks_project_started").on(t.projectId, t.startedAt),
    idxClientStarted: index("idx_tasks_client_started").on(t.clientId, t.startedAt),
    idxStatus: index("idx_tasks_status").on(t.status),
    idxStarted: index("idx_tasks_started").on(t.startedAt),
    idxSession: index("idx_tasks_session").on(t.sessionId),
  }),
);

// ─── TAGS / TASK_TAGS ───────────────────────────────────────────────
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
  createdAt: ts("created_at"),
});

export const taskTags = sqliteTable(
  "task_tags",
  {
    taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.tagId] }),
    idxTag: index("idx_task_tags_tag").on(t.tagId),
  }),
);

// ─── MANUAL_EVENTS ──────────────────────────────────────────────────
export const manualEvents = sqliteTable(
  "manual_events",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull().references(() => clients.id),
    projectId: text("project_id").references(() => projects.id),
    title: text("title").notNull(),
    description: text("description"),
    kind: text("kind", { enum: ["meeting", "call", "review", "other"] })
      .notNull()
      .default("other"),
    startAt: ts("start_at"),
    durationMinutes: integer("duration_minutes").notNull(),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => ({
    idxClientStart: index("idx_events_client_start").on(t.clientId, t.startAt),
    idxProjectStart: index("idx_events_project_start").on(t.projectId, t.startAt),
  }),
);

// ─── MODEL_PRICING ──────────────────────────────────────────────────
export const modelPricing = sqliteTable(
  "model_pricing",
  {
    id: text("id").primaryKey(),
    model: text("model").notNull(),
    inputPerMtok: real("input_per_mtok").notNull(),
    outputPerMtok: real("output_per_mtok").notNull(),
    cacheReadPerMtok: real("cache_read_per_mtok").notNull(),
    cacheCreationPerMtok: real("cache_creation_per_mtok").notNull(),
    validFrom: ts("valid_from"),
    validUntil: optTs("valid_until"),
    source: text("source").notNull().default("manual"),
  },
  (t) => ({ idxModelFrom: index("idx_pricing_model_from").on(t.model, t.validFrom) }),
);

// ─── CURRENCY_RATES ─────────────────────────────────────────────────
export const currencyRates = sqliteTable("currency_rates", {
  date: text("date").primaryKey(), // 'YYYY-MM-DD'
  usdBrl: real("usd_brl").notNull(),
  source: text("source").notNull(),
  fetchedAt: ts("fetched_at"),
});

// ─── SETTINGS ───────────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: ts("updated_at"),
});

// ─── DAEMON_RUNS ────────────────────────────────────────────────────
export const daemonRuns = sqliteTable(
  "daemon_runs",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    startedAt: ts("started_at"),
    endedAt: optTs("ended_at"),
    filesScanned: integer("files_scanned").notNull().default(0),
    filesProcessed: integer("files_processed").notNull().default(0),
    tasksCreated: integer("tasks_created").notNull().default(0),
    tasksUpdated: integer("tasks_updated").notNull().default(0),
    errors: text("errors"),
    ok: bool("ok", true),
  },
  (t) => ({ idxStarted: index("idx_daemon_runs_started").on(t.startedAt) }),
);

// ─── PLACEHOLDERS Fase 2 ────────────────────────────────────────────
export const devs = sqliteTable("devs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  githubHandle: text("github_handle"),
  active: bool("active", true),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  devId: text("dev_id").references(() => devs.id),
  title: text("title").notNull(),
  description: text("description"),
  targetAt: optTs("target_at"),
  progressPercent: integer("progress_percent").notNull().default(0),
  status: text("status").notNull().default("open"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  scope: text("scope", { enum: ["global", "project", "client", "task", "dev"] }).notNull(),
  scopeRef: text("scope_ref"),
  body: text("body").notNull(),
  pinned: bool("pinned"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});
```

- [ ] **Step 4: Rodar typecheck e teste de schema**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm typecheck && pnpm test schema`
Expected: PASS — typecheck sem erros, 3 tests verdes.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/schema.ts packages/db/src/schema.test.ts
git commit -m "feat(db): adiciona schema Drizzle completo Fase 1 + placeholders Fase 2"
```

---

### Task 19: Gerar primeira migration e implementar runner

**Files:**
- Create: `packages/db/src/migrate.ts`
- Generated: `packages/db/src/migrations/0000_*.sql`

- [ ] **Step 1: Implementar runner programático**

`packages/db/src/migrate.ts`:

```typescript
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { DbClient } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function runMigrations(db: DbClient): void {
  migrate(db, { migrationsFolder: join(__dirname, "migrations") });
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createClient } = await import("./client.js");
  const path = process.env.TRACKER_DB_PATH ?? "data/tracker.db";
  const { sqlite, db } = createClient(path);
  runMigrations(db);
  sqlite.close();
  console.log(`✓ Migrations applied to ${path}`);
}
```

- [ ] **Step 2: Gerar primeira migration via drizzle-kit**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm db:generate`
Expected: cria `src/migrations/0000_<random_name>.sql` + `src/migrations/meta/` com snapshot. Sem erros.

- [ ] **Step 3: Inspecionar a migration gerada**

Run: `cd /Users/luiz/dev/tracker/packages/db && ls src/migrations/`
Expected: lista contém `0000_*.sql`, `meta/_journal.json`, `meta/0000_snapshot.json`.

- [ ] **Step 4: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/migrate.ts packages/db/src/migrations
git commit -m "feat(db): gera migration inicial e adiciona runner programático"
```

---

### Task 20: Teste de integração — migrations aplicam e schema fica utilizável

**Files:**
- Create: `packages/db/src/migrations.test.ts`

- [ ] **Step 1: Escrever teste**

`packages/db/src/migrations.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createClient } from "./client.js";
import { runMigrations } from "./migrate.js";
import { clients, settings } from "./schema.js";
import { eq } from "drizzle-orm";

describe("migrations", () => {
  it("aplica todas as migrations num DB em memória sem erro", () => {
    const { sqlite, db } = createClient(":memory:");
    expect(() => runMigrations(db)).not.toThrow();
    sqlite.close();
  });

  it("após migração, posso INSERT em clients", () => {
    const { sqlite, db } = createClient(":memory:");
    runMigrations(db);
    const now = Date.now();
    db.insert(clients)
      .values({
        id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        name: "Test Client",
        billableFactor: 0.5,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const rows = db.select().from(clients).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Test Client");
    sqlite.close();
  });

  it("após migração, posso INSERT em settings (key/value)", () => {
    const { sqlite, db } = createClient(":memory:");
    runMigrations(db);
    db.insert(settings)
      .values({ key: "foo", valueJson: JSON.stringify({ bar: 1 }), updatedAt: Date.now() })
      .run();
    const rows = db.select().from(settings).where(eq(settings.key, "foo")).all();
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!.valueJson)).toEqual({ bar: 1 });
    sqlite.close();
  });

  it("foreign keys são respeitadas", () => {
    const { sqlite, db } = createClient(":memory:");
    runMigrations(db);
    expect(() => {
      db.insert(clients)
        .values({
          id: "client-1",
          name: "C1",
          billableFactor: 0.4,
          createdAt: 1,
          updatedAt: 1,
        })
        .run();
      // Tentar inserir project com client_id inexistente deve falhar
      sqlite.exec(
        `INSERT INTO projects (id, slug, name, cwd_path, client_id, active, created_at, updated_at)
         VALUES ('p1', 'x', 'X', '/x', 'NONEXISTENT', 1, 1, 1)`,
      );
    }).toThrow(/FOREIGN KEY/);
    sqlite.close();
  });
});
```

- [ ] **Step 2: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test migrations`
Expected: PASS — 4 tests.

- [ ] **Step 3: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/migrations.test.ts
git commit -m "test(db): valida migrations aplicáveis, INSERTs e FK enforcement"
```

---

### Task 21: Implementar queries básicas — clients

**Files:**
- Create: `packages/db/src/queries/clients.ts`
- Create: `packages/db/src/queries/clients.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/db/src/queries/clients.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import {
  createClientRow,
  listClients,
  getClientById,
  updateClient,
  deleteClient,
} from "./clients.js";

let db: DbClient;
let close: () => void;

beforeEach(() => {
  const handles = createDb(":memory:");
  db = handles.db;
  close = () => handles.sqlite.close();
  runMigrations(db);
});

describe("clients queries", () => {
  it("createClientRow insere e retorna a row", () => {
    const c = createClientRow(db, { name: "Sinusal Laudos", billableFactor: 0.5 });
    expect(c.id).toBeDefined();
    expect(c.name).toBe("Sinusal Laudos");
    expect(c.billableFactor).toBe(0.5);
    close();
  });

  it("listClients retorna em ordem alfabética", () => {
    createClientRow(db, { name: "Zebra Co" });
    createClientRow(db, { name: "Alpha Co" });
    const rows = listClients(db);
    expect(rows.map((r) => r.name)).toEqual(["Alpha Co", "Zebra Co"]);
    close();
  });

  it("getClientById retorna null quando não existe", () => {
    expect(getClientById(db, "nonexistent")).toBeNull();
    close();
  });

  it("updateClient altera campos passados, mantém o resto", () => {
    const c = createClientRow(db, { name: "Foo", billableFactor: 0.4 });
    const updated = updateClient(db, c.id, { billableFactor: 0.6 });
    expect(updated?.billableFactor).toBe(0.6);
    expect(updated?.name).toBe("Foo");
    close();
  });

  it("deleteClient remove a row e retorna true; segunda chamada retorna false", () => {
    const c = createClientRow(db, { name: "Foo" });
    expect(deleteClient(db, c.id)).toBe(true);
    expect(getClientById(db, c.id)).toBeNull();
    expect(deleteClient(db, c.id)).toBe(false);
    close();
  });

  it("createClientRow valida nome único (lança em duplicata)", () => {
    createClientRow(db, { name: "Same" });
    expect(() => createClientRow(db, { name: "Same" })).toThrow();
    close();
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test clients`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `clients.ts`**

`packages/db/src/queries/clients.ts`:

```typescript
import { newId } from "@tracker/shared";
import { eq, asc } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { clients } from "../schema.js";

export type ClientRow = typeof clients.$inferSelect;
export type NewClientInput = {
  name: string;
  hourLimitValue?: number | null;
  hourLimitPeriod?: "week" | "month" | null;
  billableFactor?: number;
  color?: string | null;
  notes?: string | null;
};

export function createClientRow(db: DbClient, input: NewClientInput): ClientRow {
  const now = Date.now();
  const row = {
    id: newId(),
    name: input.name,
    hourLimitValue: input.hourLimitValue ?? null,
    hourLimitPeriod: input.hourLimitPeriod ?? null,
    billableFactor: input.billableFactor ?? 0.4,
    color: input.color ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(clients).values(row).run();
  return row as ClientRow;
}

export function listClients(db: DbClient): ClientRow[] {
  return db.select().from(clients).orderBy(asc(clients.name)).all();
}

export function getClientById(db: DbClient, id: string): ClientRow | null {
  const rows = db.select().from(clients).where(eq(clients.id, id)).all();
  return rows[0] ?? null;
}

export function updateClient(
  db: DbClient,
  id: string,
  patch: Partial<Omit<ClientRow, "id" | "createdAt" | "updatedAt">>,
): ClientRow | null {
  const current = getClientById(db, id);
  if (!current) return null;
  const next = { ...patch, updatedAt: Date.now() };
  db.update(clients).set(next).where(eq(clients.id, id)).run();
  return getClientById(db, id);
}

export function deleteClient(db: DbClient, id: string): boolean {
  const result = db.delete(clients).where(eq(clients.id, id)).run();
  return result.changes > 0;
}
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test clients`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/queries/clients.ts packages/db/src/queries/clients.test.ts
git commit -m "feat(db): adiciona queries CRUD de clients com validação de unicidade"
```

---

### Task 22: Implementar queries — projects

**Files:**
- Create: `packages/db/src/queries/projects.ts`
- Create: `packages/db/src/queries/projects.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/db/src/queries/projects.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createClientRow } from "./clients.js";
import {
  createProject,
  listProjects,
  getProjectBySlug,
  getProjectByCwdPath,
  upsertProjectByCwdPath,
} from "./projects.js";

let db: DbClient;
let close: () => void;

beforeEach(() => {
  const handles = createDb(":memory:");
  db = handles.db;
  close = () => handles.sqlite.close();
  runMigrations(db);
});

describe("projects queries", () => {
  it("createProject insere com slug e cwd_path", () => {
    const p = createProject(db, {
      slug: "sinusal-legado",
      name: "Sinusal Legado",
      cwdPath: "/Users/luiz/dev/sinusal/sinusal-legado",
    });
    expect(p.slug).toBe("sinusal-legado");
    expect(p.cwdPath).toBe("/Users/luiz/dev/sinusal/sinusal-legado");
    close();
  });

  it("getProjectBySlug e getProjectByCwdPath retornam o mesmo project", () => {
    const p = createProject(db, {
      slug: "csp",
      name: "CSP",
      cwdPath: "/Users/luiz/dev/csp",
    });
    expect(getProjectBySlug(db, "csp")?.id).toBe(p.id);
    expect(getProjectByCwdPath(db, "/Users/luiz/dev/csp")?.id).toBe(p.id);
    close();
  });

  it("upsertProjectByCwdPath cria se não existe, retorna existente se existe", () => {
    const path = "/Users/luiz/dev/foo";
    const a = upsertProjectByCwdPath(db, { slug: "foo", name: "Foo", cwdPath: path });
    const b = upsertProjectByCwdPath(db, { slug: "foo", name: "Foo", cwdPath: path });
    expect(a.id).toBe(b.id);
    close();
  });

  it("createProject pode associar a um client", () => {
    const c = createClientRow(db, { name: "Acme" });
    const p = createProject(db, {
      slug: "acme-app",
      name: "Acme App",
      cwdPath: "/x",
      clientId: c.id,
    });
    expect(p.clientId).toBe(c.id);
    close();
  });

  it("listProjects retorna ordenado por nome ascendente", () => {
    createProject(db, { slug: "b", name: "Beta", cwdPath: "/b" });
    createProject(db, { slug: "a", name: "Alpha", cwdPath: "/a" });
    expect(listProjects(db).map((p) => p.name)).toEqual(["Alpha", "Beta"]);
    close();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test projects`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `projects.ts`**

`packages/db/src/queries/projects.ts`:

```typescript
import { newId } from "@tracker/shared";
import { asc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { projects } from "../schema.js";

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectInput = {
  slug: string;
  name: string;
  cwdPath: string;
  claudeProjectDir?: string | null;
  clientId?: string | null;
  color?: string | null;
};

export function createProject(db: DbClient, input: NewProjectInput): ProjectRow {
  const now = Date.now();
  const row = {
    id: newId(),
    slug: input.slug,
    name: input.name,
    cwdPath: input.cwdPath,
    claudeProjectDir: input.claudeProjectDir ?? null,
    clientId: input.clientId ?? null,
    color: input.color ?? null,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(projects).values(row).run();
  return row as ProjectRow;
}

export function listProjects(db: DbClient): ProjectRow[] {
  return db.select().from(projects).orderBy(asc(projects.name)).all();
}

export function getProjectBySlug(db: DbClient, slug: string): ProjectRow | null {
  return db.select().from(projects).where(eq(projects.slug, slug)).all()[0] ?? null;
}

export function getProjectByCwdPath(db: DbClient, cwdPath: string): ProjectRow | null {
  return db.select().from(projects).where(eq(projects.cwdPath, cwdPath)).all()[0] ?? null;
}

export function upsertProjectByCwdPath(
  db: DbClient,
  input: NewProjectInput,
): ProjectRow {
  const existing = getProjectByCwdPath(db, input.cwdPath);
  if (existing) return existing;
  return createProject(db, input);
}
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test projects`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/queries/projects.ts packages/db/src/queries/projects.test.ts
git commit -m "feat(db): adiciona queries CRUD de projects com upsert por cwd_path"
```

---

### Task 23: Implementar queries — sessions

**Files:**
- Create: `packages/db/src/queries/sessions.ts`
- Create: `packages/db/src/queries/sessions.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/db/src/queries/sessions.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createProject } from "./projects.js";
import {
  upsertSession,
  getSessionByJsonlPath,
  updateSessionOffset,
  addSessionTokens,
} from "./sessions.js";

let db: DbClient;
let close: () => void;
let projectId: string;

beforeEach(() => {
  const handles = createDb(":memory:");
  db = handles.db;
  close = () => handles.sqlite.close();
  runMigrations(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
});

describe("sessions queries", () => {
  it("upsertSession cria se não existe", () => {
    const s = upsertSession(db, {
      id: "session-uuid-1",
      projectId,
      jsonlPath: "/path/to/session.jsonl",
    });
    expect(s.id).toBe("session-uuid-1");
    expect(s.lastProcessedOffset).toBe(0);
    close();
  });

  it("upsertSession retorna existente se ja existe (não duplica)", () => {
    upsertSession(db, { id: "s1", projectId, jsonlPath: "/p/s1.jsonl" });
    const again = upsertSession(db, { id: "s1", projectId, jsonlPath: "/p/s1.jsonl" });
    expect(again.id).toBe("s1");
    close();
  });

  it("updateSessionOffset persiste novo offset e timestamp", () => {
    upsertSession(db, { id: "s1", projectId, jsonlPath: "/p/s1.jsonl" });
    updateSessionOffset(db, "s1", 12345);
    const s = getSessionByJsonlPath(db, "/p/s1.jsonl");
    expect(s?.lastProcessedOffset).toBe(12345);
    expect(s?.lastProcessedAt).toBeGreaterThan(0);
    close();
  });

  it("addSessionTokens incrementa contadores e custo total", () => {
    upsertSession(db, { id: "s1", projectId, jsonlPath: "/p/s1.jsonl" });
    addSessionTokens(db, "s1", {
      input: 100,
      output: 50,
      cacheRead: 200,
      cacheCreation: 10,
      costUsd: 0.123,
    });
    addSessionTokens(db, "s1", {
      input: 50,
      output: 25,
      cacheRead: 0,
      cacheCreation: 0,
      costUsd: 0.05,
    });
    const s = getSessionByJsonlPath(db, "/p/s1.jsonl")!;
    expect(s.totalTokensInput).toBe(150);
    expect(s.totalTokensOutput).toBe(75);
    expect(s.totalTokensCacheRead).toBe(200);
    expect(s.totalCostUsd).toBeCloseTo(0.173, 5);
    close();
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test sessions`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `sessions.ts`**

`packages/db/src/queries/sessions.ts`:

```typescript
import { eq, sql } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { sessions } from "../schema.js";

export type SessionRow = typeof sessions.$inferSelect;

export type UpsertSessionInput = {
  id: string;
  projectId: string;
  jsonlPath: string;
  startedAt?: number | null;
};

export function upsertSession(db: DbClient, input: UpsertSessionInput): SessionRow {
  const existing = db.select().from(sessions).where(eq(sessions.id, input.id)).all()[0];
  if (existing) return existing;
  const row = {
    id: input.id,
    projectId: input.projectId,
    jsonlPath: input.jsonlPath,
    startedAt: input.startedAt ?? null,
    endedAt: null,
    messageCount: 0,
    totalTokensInput: 0,
    totalTokensOutput: 0,
    totalTokensCacheRead: 0,
    totalTokensCacheCreation: 0,
    totalCostUsd: 0,
    lastProcessedOffset: 0,
    lastProcessedAt: null,
  };
  db.insert(sessions).values(row).run();
  return row as SessionRow;
}

export function getSessionByJsonlPath(db: DbClient, jsonlPath: string): SessionRow | null {
  return db.select().from(sessions).where(eq(sessions.jsonlPath, jsonlPath)).all()[0] ?? null;
}

export function getSessionById(db: DbClient, id: string): SessionRow | null {
  return db.select().from(sessions).where(eq(sessions.id, id)).all()[0] ?? null;
}

export function updateSessionOffset(db: DbClient, id: string, offset: number): void {
  db.update(sessions)
    .set({ lastProcessedOffset: offset, lastProcessedAt: Date.now() })
    .where(eq(sessions.id, id))
    .run();
}

export type SessionTokenIncrement = {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  costUsd: number;
};

export function addSessionTokens(
  db: DbClient,
  id: string,
  delta: SessionTokenIncrement,
): void {
  db.update(sessions)
    .set({
      totalTokensInput: sql`${sessions.totalTokensInput} + ${delta.input}`,
      totalTokensOutput: sql`${sessions.totalTokensOutput} + ${delta.output}`,
      totalTokensCacheRead: sql`${sessions.totalTokensCacheRead} + ${delta.cacheRead}`,
      totalTokensCacheCreation: sql`${sessions.totalTokensCacheCreation} + ${delta.cacheCreation}`,
      totalCostUsd: sql`${sessions.totalCostUsd} + ${delta.costUsd}`,
      messageCount: sql`${sessions.messageCount} + 1`,
    })
    .where(eq(sessions.id, id))
    .run();
}
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test sessions`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/queries/sessions.ts packages/db/src/queries/sessions.test.ts
git commit -m "feat(db): adiciona queries de sessions com upsert e increment de tokens"
```

---

### Task 24: Implementar queries — tasks

**Files:**
- Create: `packages/db/src/queries/tasks.ts`
- Create: `packages/db/src/queries/tasks.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/db/src/queries/tasks.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createProject } from "./projects.js";
import { upsertSession } from "./sessions.js";
import {
  createTask,
  getTaskById,
  listTasks,
  updateTask,
  closeTask,
  pauseTask,
} from "./tasks.js";

let db: DbClient;
let close: () => void;
let projectId: string;
let sessionId: string;

beforeEach(() => {
  const handles = createDb(":memory:");
  db = handles.db;
  close = () => handles.sqlite.close();
  runMigrations(db);
  projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
  sessionId = upsertSession(db, { id: "sess-1", projectId, jsonlPath: "/p/sess-1.jsonl" }).id;
});

describe("tasks queries", () => {
  it("createTask insere com defaults sensatos", () => {
    const t = createTask(db, {
      sessionId,
      projectId,
      title: "Hotfix SOC",
      startedAt: Date.now(),
    });
    expect(t.status).toBe("open");
    expect(t.confidence).toBe(1);
    expect(t.tokensInput).toBe(0);
    expect(t.costUsd).toBe(0);
    close();
  });

  it("listTasks filtra por projectId", () => {
    const otherProject = createProject(db, { slug: "q", name: "Q", cwdPath: "/q" });
    const otherSession = upsertSession(db, { id: "sess-2", projectId: otherProject.id, jsonlPath: "/q/s.jsonl" });
    createTask(db, { sessionId, projectId, title: "P-task", startedAt: 1 });
    createTask(db, { sessionId: otherSession.id, projectId: otherProject.id, title: "Q-task", startedAt: 2 });
    const pTasks = listTasks(db, { projectId });
    expect(pTasks).toHaveLength(1);
    expect(pTasks[0]!.title).toBe("P-task");
    close();
  });

  it("listTasks ordena por startedAt DESC por default", () => {
    createTask(db, { sessionId, projectId, title: "First", startedAt: 1000 });
    createTask(db, { sessionId, projectId, title: "Second", startedAt: 2000 });
    const all = listTasks(db, {});
    expect(all[0]!.title).toBe("Second");
    expect(all[1]!.title).toBe("First");
    close();
  });

  it("updateTask altera campos passados", () => {
    const t = createTask(db, { sessionId, projectId, title: "Old", startedAt: 1 });
    const updated = updateTask(db, t.id, { title: "New", category: "hotfix" });
    expect(updated?.title).toBe("New");
    expect(updated?.category).toBe("hotfix");
    close();
  });

  it("closeTask altera status e endedAt", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    const closed = closeTask(db, t.id, 5000, "msg-uuid-last");
    expect(closed?.status).toBe("closed");
    expect(closed?.endedAt).toBe(5000);
    expect(closed?.lastMessageUuid).toBe("msg-uuid-last");
    close();
  });

  it("pauseTask altera status para paused", () => {
    const t = createTask(db, { sessionId, projectId, title: "T", startedAt: 1 });
    const paused = pauseTask(db, t.id);
    expect(paused?.status).toBe("paused");
    close();
  });

  it("listTasks filtra por status", () => {
    const a = createTask(db, { sessionId, projectId, title: "A", startedAt: 1 });
    createTask(db, { sessionId, projectId, title: "B", startedAt: 2 });
    closeTask(db, a.id, 100, null);
    expect(listTasks(db, { status: "closed" })).toHaveLength(1);
    expect(listTasks(db, { status: "open" })).toHaveLength(1);
    close();
  });
});
```

- [ ] **Step 2: Rodar teste e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test tasks`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `tasks.ts`**

`packages/db/src/queries/tasks.ts`:

```typescript
import { newId } from "@tracker/shared";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { tasks } from "../schema.js";

export type TaskRow = typeof tasks.$inferSelect;

export type NewTaskInput = {
  sessionId: string;
  projectId: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  startedAt: number;
  firstMessageUuid?: string | null;
  isBackfilled?: boolean;
  confidence?: number;
};

export function createTask(db: DbClient, input: NewTaskInput): TaskRow {
  const now = Date.now();
  const row = {
    id: newId(),
    sessionId: input.sessionId,
    projectId: input.projectId,
    clientId: input.clientId ?? null,
    title: input.title,
    description: input.description ?? null,
    category: null,
    status: "open" as const,
    startedAt: input.startedAt,
    endedAt: null,
    firstMessageUuid: input.firstMessageUuid ?? null,
    lastMessageUuid: null,
    tokensInput: 0,
    tokensOutput: 0,
    tokensCacheRead: 0,
    tokensCacheCreation: 0,
    primaryModel: null,
    modelsUsed: null,
    timeInputSeconds: 0,
    timeProcessingOutputSeconds: 0,
    timeReadingSeconds: 0,
    timeTotalSeconds: 0,
    humanHoursEstimate: null,
    humanHoursSource: "none" as const,
    humanHoursReasoning: null,
    billableHours: null,
    billableHoursLocked: false,
    costUsd: 0,
    isBackfilled: input.isBackfilled ?? false,
    refinedByHaiku: false,
    confidence: input.confidence ?? 1,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(tasks).values(row).run();
  return row as TaskRow;
}

export function getTaskById(db: DbClient, id: string): TaskRow | null {
  return db.select().from(tasks).where(eq(tasks.id, id)).all()[0] ?? null;
}

export type ListTasksFilter = {
  projectId?: string;
  clientId?: string;
  sessionId?: string;
  status?: "open" | "paused" | "closed";
};

export function listTasks(db: DbClient, filter: ListTasksFilter): TaskRow[] {
  const conditions = [];
  if (filter.projectId) conditions.push(eq(tasks.projectId, filter.projectId));
  if (filter.clientId) conditions.push(eq(tasks.clientId, filter.clientId));
  if (filter.sessionId) conditions.push(eq(tasks.sessionId, filter.sessionId));
  if (filter.status) conditions.push(eq(tasks.status, filter.status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const query = db.select().from(tasks).orderBy(desc(tasks.startedAt));
  return where ? query.where(where).all() : query.all();
}

export function updateTask(
  db: DbClient,
  id: string,
  patch: Partial<Omit<TaskRow, "id" | "createdAt" | "updatedAt">>,
): TaskRow | null {
  const current = getTaskById(db, id);
  if (!current) return null;
  db.update(tasks)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(tasks.id, id))
    .run();
  return getTaskById(db, id);
}

export function closeTask(
  db: DbClient,
  id: string,
  endedAt: number,
  lastMessageUuid: string | null,
): TaskRow | null {
  return updateTask(db, id, {
    status: "closed",
    endedAt,
    lastMessageUuid,
  });
}

export function pauseTask(db: DbClient, id: string): TaskRow | null {
  return updateTask(db, id, { status: "paused" });
}
```

- [ ] **Step 4: Rodar teste e ver passar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test tasks`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/queries/tasks.ts packages/db/src/queries/tasks.test.ts
git commit -m "feat(db): adiciona queries CRUD de tasks com filtros e transições de status"
```

---

### Task 25: Implementar queries — settings, pricing, currency, events, tags, diagnostics (lote)

**Files:**
- Create: `packages/db/src/queries/settings.ts` + `.test.ts`
- Create: `packages/db/src/queries/pricing.ts` + `.test.ts`
- Create: `packages/db/src/queries/currency.ts` + `.test.ts`
- Create: `packages/db/src/queries/events.ts` + `.test.ts`
- Create: `packages/db/src/queries/tags.ts` + `.test.ts`
- Create: `packages/db/src/queries/diagnostics.ts` + `.test.ts`

> **Justificativa do agrupamento:** essas queries são CRUD direto e seguem exatamente o mesmo padrão de `clients.ts`/`projects.ts`. Para evitar redundância gigante, este task agrupa as 6 implementações com testes essenciais (criar, ler, atualizar, deletar, comportamento específico). Cada arquivo de produção/teste é mostrado abaixo na íntegra.

#### 25.1 — settings

- [ ] **Step 1: Escrever `settings.test.ts`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { getSetting, setSetting, getAllSettings } from "./settings.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("settings", () => {
  it("setSetting + getSetting roundtrip JSON", () => {
    setSetting(db, "billableFactorDefault", 0.55);
    expect(getSetting(db, "billableFactorDefault")).toBe(0.55);
    close();
  });

  it("getSetting retorna null se chave não existe", () => {
    expect(getSetting(db, "nada.naoexiste")).toBeNull();
    close();
  });

  it("setSetting é idempotente — sobrescreve valor", () => {
    setSetting(db, "x", 1);
    setSetting(db, "x", 2);
    expect(getSetting(db, "x")).toBe(2);
    close();
  });

  it("getAllSettings retorna todas as chaves persistidas", () => {
    setSetting(db, "a", 1);
    setSetting(db, "b", "str");
    const all = getAllSettings(db);
    expect(all).toEqual({ a: 1, b: "str" });
    close();
  });
});
```

- [ ] **Step 2: Implementar `settings.ts`**

```typescript
import { eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { settings } from "../schema.js";

export function getSetting<T = unknown>(db: DbClient, key: string): T | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).all()[0];
  return row ? (JSON.parse(row.valueJson) as T) : null;
}

export function setSetting(db: DbClient, key: string, value: unknown): void {
  const row = {
    key,
    valueJson: JSON.stringify(value),
    updatedAt: Date.now(),
  };
  db.insert(settings).values(row).onConflictDoUpdate({
    target: settings.key,
    set: { valueJson: row.valueJson, updatedAt: row.updatedAt },
  }).run();
}

export function getAllSettings(db: DbClient): Record<string, unknown> {
  const rows = db.select().from(settings).all();
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = JSON.parse(r.valueJson);
  return out;
}
```

- [ ] **Step 3: Rodar e ver verde**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test settings`
Expected: PASS — 4 tests.

#### 25.2 — pricing (com lookup por valid_from/until)

- [ ] **Step 4: Escrever `pricing.test.ts`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import {
  insertPricing,
  findPricingFor,
  listAllPricing,
  updatePricing,
  deletePricing,
} from "./pricing.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("pricing", () => {
  it("findPricingFor escolhe a row com valid_from <= ts e valid_until > ts (ou null)", () => {
    insertPricing(db, {
      model: "claude-sonnet-4-6",
      inputPerMtok: 3, outputPerMtok: 15, cacheReadPerMtok: 0.3, cacheCreationPerMtok: 3.75,
      validFrom: 1000, validUntil: 2000, source: "manual",
    });
    insertPricing(db, {
      model: "claude-sonnet-4-6",
      inputPerMtok: 3.5, outputPerMtok: 17, cacheReadPerMtok: 0.35, cacheCreationPerMtok: 4,
      validFrom: 2000, validUntil: null, source: "manual",
    });
    const old = findPricingFor(db, "claude-sonnet-4-6", 1500);
    expect(old?.inputPerMtok).toBe(3);
    const current = findPricingFor(db, "claude-sonnet-4-6", 3000);
    expect(current?.inputPerMtok).toBe(3.5);
    close();
  });

  it("findPricingFor retorna null se modelo desconhecido", () => {
    expect(findPricingFor(db, "claude-unknown", 1000)).toBeNull();
    close();
  });

  it("listAllPricing retorna todas as rows", () => {
    insertPricing(db, { model: "a", inputPerMtok: 1, outputPerMtok: 2, cacheReadPerMtok: 0, cacheCreationPerMtok: 0, validFrom: 0, validUntil: null, source: "x" });
    insertPricing(db, { model: "b", inputPerMtok: 1, outputPerMtok: 2, cacheReadPerMtok: 0, cacheCreationPerMtok: 0, validFrom: 0, validUntil: null, source: "x" });
    expect(listAllPricing(db)).toHaveLength(2);
    close();
  });
});
```

- [ ] **Step 5: Implementar `pricing.ts`**

```typescript
import { newId } from "@tracker/shared";
import { and, desc, eq, isNull, lte, gt, or } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { modelPricing } from "../schema.js";

export type PricingRow = typeof modelPricing.$inferSelect;
export type NewPricingInput = Omit<PricingRow, "id">;

export function insertPricing(db: DbClient, input: NewPricingInput): PricingRow {
  const row = { id: newId(), ...input };
  db.insert(modelPricing).values(row).run();
  return row as PricingRow;
}

export function findPricingFor(
  db: DbClient,
  model: string,
  timestampMs: number,
): PricingRow | null {
  const rows = db
    .select()
    .from(modelPricing)
    .where(
      and(
        eq(modelPricing.model, model),
        lte(modelPricing.validFrom, timestampMs),
        or(isNull(modelPricing.validUntil), gt(modelPricing.validUntil, timestampMs)),
      ),
    )
    .orderBy(desc(modelPricing.validFrom))
    .limit(1)
    .all();
  return rows[0] ?? null;
}

export function listAllPricing(db: DbClient): PricingRow[] {
  return db.select().from(modelPricing).orderBy(desc(modelPricing.validFrom)).all();
}

export function updatePricing(
  db: DbClient,
  id: string,
  patch: Partial<Omit<PricingRow, "id">>,
): void {
  db.update(modelPricing).set(patch).where(eq(modelPricing.id, id)).run();
}

export function deletePricing(db: DbClient, id: string): boolean {
  return db.delete(modelPricing).where(eq(modelPricing.id, id)).run().changes > 0;
}
```

- [ ] **Step 6: Rodar e ver verde**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test pricing`
Expected: PASS — 3 tests.

#### 25.3 — currency

- [ ] **Step 7: Escrever `currency.test.ts`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { upsertCurrencyRate, getCurrencyRate, getLatestCurrencyRate } from "./currency.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("currency", () => {
  it("upsert + get retorna a rate gravada", () => {
    upsertCurrencyRate(db, "2026-05-02", 4.97, "awesomeapi");
    expect(getCurrencyRate(db, "2026-05-02")?.usdBrl).toBe(4.97);
    close();
  });

  it("upsert sobrescreve quando data já existe", () => {
    upsertCurrencyRate(db, "2026-05-02", 4.97, "awesomeapi");
    upsertCurrencyRate(db, "2026-05-02", 4.99, "manual");
    const r = getCurrencyRate(db, "2026-05-02")!;
    expect(r.usdBrl).toBe(4.99);
    expect(r.source).toBe("manual");
    close();
  });

  it("getLatestCurrencyRate retorna a data mais recente", () => {
    upsertCurrencyRate(db, "2026-04-30", 4.95, "awesomeapi");
    upsertCurrencyRate(db, "2026-05-02", 4.97, "awesomeapi");
    expect(getLatestCurrencyRate(db)?.date).toBe("2026-05-02");
    close();
  });

  it("getLatestCurrencyRate retorna null se vazio", () => {
    expect(getLatestCurrencyRate(db)).toBeNull();
    close();
  });
});
```

- [ ] **Step 8: Implementar `currency.ts`**

```typescript
import { desc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { currencyRates } from "../schema.js";

export type CurrencyRateRow = typeof currencyRates.$inferSelect;

export function upsertCurrencyRate(
  db: DbClient,
  date: string,
  usdBrl: number,
  source: string,
): void {
  const row = { date, usdBrl, source, fetchedAt: Date.now() };
  db.insert(currencyRates).values(row).onConflictDoUpdate({
    target: currencyRates.date,
    set: { usdBrl, source, fetchedAt: row.fetchedAt },
  }).run();
}

export function getCurrencyRate(db: DbClient, date: string): CurrencyRateRow | null {
  return db.select().from(currencyRates).where(eq(currencyRates.date, date)).all()[0] ?? null;
}

export function getLatestCurrencyRate(db: DbClient): CurrencyRateRow | null {
  return db.select().from(currencyRates).orderBy(desc(currencyRates.date)).limit(1).all()[0] ?? null;
}
```

- [ ] **Step 9: Rodar e ver verde**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test currency`
Expected: PASS — 4 tests.

#### 25.4 — events

- [ ] **Step 10: Escrever `events.test.ts`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createClientRow } from "./clients.js";
import { createEvent, listEvents, getEventById, deleteEvent } from "./events.js";

let db: DbClient;
let close: () => void;
let clientId: string;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
  clientId = createClientRow(db, { name: "C" }).id;
});

describe("events", () => {
  it("createEvent insere com defaults", () => {
    const e = createEvent(db, {
      clientId, title: "Reunião kickoff", durationMinutes: 60, startAt: 1_000_000,
    });
    expect(e.kind).toBe("other");
    expect(e.durationMinutes).toBe(60);
    close();
  });

  it("listEvents filtra por clientId", () => {
    const c2 = createClientRow(db, { name: "C2" });
    createEvent(db, { clientId, title: "A", durationMinutes: 30, startAt: 1 });
    createEvent(db, { clientId: c2.id, title: "B", durationMinutes: 30, startAt: 2 });
    expect(listEvents(db, { clientId })).toHaveLength(1);
    close();
  });

  it("listEvents ordena por startAt DESC", () => {
    createEvent(db, { clientId, title: "old", durationMinutes: 1, startAt: 100 });
    createEvent(db, { clientId, title: "new", durationMinutes: 1, startAt: 200 });
    expect(listEvents(db, {}).map((e) => e.title)).toEqual(["new", "old"]);
    close();
  });

  it("deleteEvent remove e retorna true", () => {
    const e = createEvent(db, { clientId, title: "X", durationMinutes: 1, startAt: 1 });
    expect(deleteEvent(db, e.id)).toBe(true);
    expect(getEventById(db, e.id)).toBeNull();
    close();
  });
});
```

- [ ] **Step 11: Implementar `events.ts`**

```typescript
import { newId } from "@tracker/shared";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { manualEvents } from "../schema.js";

export type EventRow = typeof manualEvents.$inferSelect;

export type NewEventInput = {
  clientId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  kind?: "meeting" | "call" | "review" | "other";
  startAt: number;
  durationMinutes: number;
};

export function createEvent(db: DbClient, input: NewEventInput): EventRow {
  const now = Date.now();
  const row = {
    id: newId(),
    clientId: input.clientId,
    projectId: input.projectId ?? null,
    title: input.title,
    description: input.description ?? null,
    kind: input.kind ?? "other" as const,
    startAt: input.startAt,
    durationMinutes: input.durationMinutes,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(manualEvents).values(row).run();
  return row as EventRow;
}

export function getEventById(db: DbClient, id: string): EventRow | null {
  return db.select().from(manualEvents).where(eq(manualEvents.id, id)).all()[0] ?? null;
}

export function listEvents(
  db: DbClient,
  filter: { clientId?: string; projectId?: string },
): EventRow[] {
  const conditions = [];
  if (filter.clientId) conditions.push(eq(manualEvents.clientId, filter.clientId));
  if (filter.projectId) conditions.push(eq(manualEvents.projectId, filter.projectId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const q = db.select().from(manualEvents).orderBy(desc(manualEvents.startAt));
  return where ? q.where(where).all() : q.all();
}

export function deleteEvent(db: DbClient, id: string): boolean {
  return db.delete(manualEvents).where(eq(manualEvents.id, id)).run().changes > 0;
}
```

- [ ] **Step 12: Rodar e ver verde**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test events`
Expected: PASS — 4 tests.

#### 25.5 — tags

- [ ] **Step 13: Escrever `tags.test.ts`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { createProject } from "./projects.js";
import { upsertSession } from "./sessions.js";
import { createTask } from "./tasks.js";
import { createTag, listTags, attachTagToTask, listTagsForTask } from "./tags.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("tags", () => {
  it("createTag + listTags retorna ordenado por nome", () => {
    createTag(db, { name: "hotfix" });
    createTag(db, { name: "feature" });
    expect(listTags(db).map((t) => t.name)).toEqual(["feature", "hotfix"]);
    close();
  });

  it("attachTagToTask cria many-to-many", () => {
    const projectId = createProject(db, { slug: "p", name: "P", cwdPath: "/p" }).id;
    const sessionId = upsertSession(db, { id: "s", projectId, jsonlPath: "/s.j" }).id;
    const task = createTask(db, { projectId, sessionId, title: "T", startedAt: 1 });
    const tag = createTag(db, { name: "research" });
    attachTagToTask(db, task.id, tag.id);
    const tags = listTagsForTask(db, task.id);
    expect(tags).toHaveLength(1);
    expect(tags[0]!.name).toBe("research");
    close();
  });
});
```

- [ ] **Step 14: Implementar `tags.ts`**

```typescript
import { newId } from "@tracker/shared";
import { asc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { tags, taskTags } from "../schema.js";

export type TagRow = typeof tags.$inferSelect;

export function createTag(db: DbClient, input: { name: string; color?: string | null }): TagRow {
  const row = {
    id: newId(),
    name: input.name,
    color: input.color ?? null,
    createdAt: Date.now(),
  };
  db.insert(tags).values(row).run();
  return row as TagRow;
}

export function listTags(db: DbClient): TagRow[] {
  return db.select().from(tags).orderBy(asc(tags.name)).all();
}

export function attachTagToTask(db: DbClient, taskId: string, tagId: string): void {
  db.insert(taskTags).values({ taskId, tagId }).onConflictDoNothing().run();
}

export function listTagsForTask(db: DbClient, taskId: string): TagRow[] {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
    })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(eq(taskTags.taskId, taskId))
    .all();
}
```

- [ ] **Step 15: Rodar e ver verde**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test tags`
Expected: PASS — 2 tests.

#### 25.6 — diagnostics

- [ ] **Step 16: Escrever `diagnostics.test.ts`**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import {
  startDaemonRun,
  finishDaemonRun,
  listDaemonRuns,
} from "./diagnostics.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("diagnostics", () => {
  it("start + finish completo registra duração e métricas", () => {
    const id = startDaemonRun(db, "tick");
    finishDaemonRun(db, id, {
      filesScanned: 5,
      filesProcessed: 2,
      tasksCreated: 1,
      tasksUpdated: 0,
      ok: true,
    });
    const runs = listDaemonRuns(db, { limit: 10 });
    expect(runs).toHaveLength(1);
    expect(runs[0]!.kind).toBe("tick");
    expect(runs[0]!.tasksCreated).toBe(1);
    expect(runs[0]!.ok).toBe(true);
    expect(runs[0]!.endedAt).toBeGreaterThan(0);
    close();
  });

  it("finishDaemonRun com erros grava JSON", () => {
    const id = startDaemonRun(db, "refine");
    finishDaemonRun(db, id, {
      ok: false,
      errors: [{ where: "haiku", message: "timeout" }],
    });
    const runs = listDaemonRuns(db, { limit: 1 });
    expect(runs[0]!.ok).toBe(false);
    expect(JSON.parse(runs[0]!.errors!)).toEqual([{ where: "haiku", message: "timeout" }]);
    close();
  });

  it("listDaemonRuns filtra por kind", () => {
    finishDaemonRun(db, startDaemonRun(db, "tick"), { ok: true });
    finishDaemonRun(db, startDaemonRun(db, "refine"), { ok: true });
    const ticks = listDaemonRuns(db, { kind: "tick" });
    expect(ticks).toHaveLength(1);
    close();
  });
});
```

- [ ] **Step 17: Implementar `diagnostics.ts`**

```typescript
import { newId } from "@tracker/shared";
import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "../client.js";
import { daemonRuns } from "../schema.js";

export type DaemonRunRow = typeof daemonRuns.$inferSelect;

export function startDaemonRun(db: DbClient, kind: string): string {
  const id = newId();
  db.insert(daemonRuns).values({
    id,
    kind,
    startedAt: Date.now(),
    endedAt: null,
    filesScanned: 0,
    filesProcessed: 0,
    tasksCreated: 0,
    tasksUpdated: 0,
    errors: null,
    ok: true,
  }).run();
  return id;
}

export type FinishMetrics = {
  filesScanned?: number;
  filesProcessed?: number;
  tasksCreated?: number;
  tasksUpdated?: number;
  ok: boolean;
  errors?: unknown[];
};

export function finishDaemonRun(db: DbClient, id: string, m: FinishMetrics): void {
  db.update(daemonRuns).set({
    endedAt: Date.now(),
    filesScanned: m.filesScanned ?? 0,
    filesProcessed: m.filesProcessed ?? 0,
    tasksCreated: m.tasksCreated ?? 0,
    tasksUpdated: m.tasksUpdated ?? 0,
    ok: m.ok,
    errors: m.errors && m.errors.length > 0 ? JSON.stringify(m.errors) : null,
  }).where(eq(daemonRuns.id, id)).run();
}

export function listDaemonRuns(
  db: DbClient,
  filter: { kind?: string; limit?: number },
): DaemonRunRow[] {
  const conditions = filter.kind ? eq(daemonRuns.kind, filter.kind) : undefined;
  const q = db.select().from(daemonRuns).orderBy(desc(daemonRuns.startedAt)).limit(filter.limit ?? 50);
  return conditions ? q.where(conditions).all() : q.all();
}
```

- [ ] **Step 18: Rodar e ver verde**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test diagnostics`
Expected: PASS — 3 tests.

- [ ] **Step 19: Commit do lote inteiro**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/queries/settings.ts packages/db/src/queries/settings.test.ts \
        packages/db/src/queries/pricing.ts packages/db/src/queries/pricing.test.ts \
        packages/db/src/queries/currency.ts packages/db/src/queries/currency.test.ts \
        packages/db/src/queries/events.ts packages/db/src/queries/events.test.ts \
        packages/db/src/queries/tags.ts packages/db/src/queries/tags.test.ts \
        packages/db/src/queries/diagnostics.ts packages/db/src/queries/diagnostics.test.ts
git commit -m "feat(db): adiciona queries de settings, pricing, currency, events, tags e diagnostics"
```

---

### Task 26: Implementar `seed.ts` — semeia settings padrão e pricing

**Files:**
- Create: `packages/db/src/seed.ts`
- Create: `packages/db/src/seed.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`packages/db/src/seed.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { createClient as createDb, type DbClient } from "../client.js";
import { runMigrations } from "../migrate.js";
import { seedDatabase } from "./seed.js";
import { getAllSettings, getSetting } from "./queries/settings.js";
import { listAllPricing } from "./queries/pricing.js";

let db: DbClient;
let close: () => void;
beforeEach(() => {
  const h = createDb(":memory:");
  db = h.db; close = () => h.sqlite.close();
  runMigrations(db);
});

describe("seedDatabase", () => {
  it("popula settings com todos os defaults flat-keyed", () => {
    seedDatabase(db);
    expect(getSetting(db, "billableFactorDefault")).toBe(0.4);
    expect(getSetting(db, "detection.gapMinutesBase")).toBe(30);
    expect(getSetting(db, "haiku.autoEstimateHours")).toBe(true);
    expect(getSetting(db, "currency.preferredDisplay")).toBe("USD");
    close();
  });

  it("popula model_pricing com seed Anthropic", () => {
    seedDatabase(db);
    const rows = listAllPricing(db);
    const models = rows.map((r) => r.model);
    expect(models).toContain("claude-opus-4-7");
    expect(models).toContain("claude-sonnet-4-6");
    expect(models).toContain("claude-haiku-4-5-20251001");
    close();
  });

  it("seed é idempotente — chamar 2× não duplica settings", () => {
    seedDatabase(db);
    seedDatabase(db);
    const all = getAllSettings(db);
    // chave billableFactorDefault deve aparecer exatamente 1×
    expect(Object.keys(all).filter((k) => k === "billableFactorDefault")).toHaveLength(1);
    close();
  });

  it("seed é idempotente — pricing não duplica para mesmo modelo+valid_from", () => {
    seedDatabase(db);
    const before = listAllPricing(db).length;
    seedDatabase(db);
    const after = listAllPricing(db).length;
    expect(after).toBe(before);
    close();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test seed`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar `seed.ts`**

`packages/db/src/seed.ts`:

```typescript
import {
  DEFAULT_SETTINGS,
  loadAnthropicPricingSeed,
  newId,
} from "@tracker/shared";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "./client.js";
import { modelPricing } from "./schema.js";
import { setSetting, getSetting } from "./queries/settings.js";

function flattenSettings(obj: Record<string, unknown>, prefix = ""): Array<[string, unknown]> {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? flattenSettings(v as Record<string, unknown>, key)
      : [[key, v]];
  });
}

export function seedDatabase(db: DbClient): void {
  // 1. settings — só seta se ainda não existe (preservar customizações do user)
  for (const [key, value] of flattenSettings(DEFAULT_SETTINGS)) {
    if (getSetting(db, key) === null) {
      setSetting(db, key, value);
    }
  }

  // 2. model_pricing — não duplica se (model, validFrom) já existe
  for (const p of loadAnthropicPricingSeed()) {
    const existing = db
      .select()
      .from(modelPricing)
      .where(and(eq(modelPricing.model, p.model), eq(modelPricing.validFrom, p.validFromMs)))
      .all();
    if (existing.length === 0) {
      db.insert(modelPricing).values({
        id: newId(),
        model: p.model,
        inputPerMtok: p.inputPerMtok,
        outputPerMtok: p.outputPerMtok,
        cacheReadPerMtok: p.cacheReadPerMtok,
        cacheCreationPerMtok: p.cacheCreationPerMtok,
        validFrom: p.validFromMs,
        validUntil: p.validUntilMs,
        source: p.source ?? "manual",
      }).run();
    }
  }
}
```

- [ ] **Step 4: Rodar e ver verde**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm test seed`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/seed.ts packages/db/src/seed.test.ts
git commit -m "feat(db): adiciona seed idempotente de settings e pricing"
```

---

### Task 27: Atualizar `index.ts` do `@tracker/db` (barrel export)

**Files:**
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Criar `index.ts`**

`packages/db/src/index.ts`:

```typescript
// Client + tipos
export { createClient, type DbClient, type ClientHandles } from "./client.js";
export { runMigrations } from "./migrate.js";
export { seedDatabase } from "./seed.js";

// Schema
export * as schema from "./schema.js";

// Queries
export * from "./queries/clients.js";
export * from "./queries/projects.js";
export * from "./queries/sessions.js";
export * from "./queries/tasks.js";
export * from "./queries/events.js";
export * from "./queries/tags.js";
export * from "./queries/settings.js";
export * from "./queries/pricing.js";
export * from "./queries/currency.js";
export * from "./queries/diagnostics.js";
```

- [ ] **Step 2: Verificar typecheck e suite completa do pacote**

Run: `cd /Users/luiz/dev/tracker/packages/db && pnpm typecheck && pnpm test`
Expected: PASS — typecheck sem erros, ~50 tests passando (todos acumulados em M3).

- [ ] **Step 3: Verificar suite completa do monorepo**

Run: `cd /Users/luiz/dev/tracker && pnpm test`
Expected: PASS — todos os tests de `@tracker/shared` (~30) + `@tracker/db` (~50) verdes.

- [ ] **Step 4: Commit**

```bash
cd /Users/luiz/dev/tracker
git add packages/db/src/index.ts
git commit -m "feat(db): exporta API pública do pacote via barrel index"
```

---

## Self-Review

Após escrever as 27 tasks, faço um check final.

**1. Spec coverage:**
- Schema completo §5.2 + §5.3: ✅ Task 18 + 19.
- Settings keys §5.4: ✅ Task 12 (defaults) + Task 26 (seed).
- 3 blocos de tempo §6.1 step 4: ✅ Task 9.
- Heurística jaccard §6.2: ✅ Task 10.
- Redact antes do Haiku §6.4 / §10.7: ✅ Task 11.
- Pricing seed e cálculo §5.4 / §6.1 step 4: ✅ Task 13.
- TranscriptSource plugável §12: ✅ Task 14.
- Queries CRUD para todas as entidades: ✅ Tasks 21–25.
- ULID PKs §5.1: ✅ Task 8.
- WAL mode §5.1: ✅ Task 17.

**2. Placeholders:** Sem TBD/TODO/"adicione validação"/etc.

**3. Type consistency:** `DbClient` usado consistentemente; `newId()` em todas as queries; `TokenUsage` em `time-calc` vs `TokensForCost` em `pricing` — nomes diferentes propositalmente para refletir uso (cálculo de tempo vs cálculo de custo); ambos compatíveis estruturalmente. Schema field names (`humanHoursSource` em camelCase no Drizzle, `human_hours_source` na coluna SQL) — Drizzle traduz, consistente.

**4. Critérios de aceitação Plan 1 (subset da Fase 1):**
- ✅ `pnpm install` + `pnpm test` rodam todos verdes.
- ✅ `pnpm exec tsx packages/db/src/migrate.ts` cria DB com schema completo.
- ✅ Posso `import { createClient, seedDatabase, ... } from "@tracker/db"` em qualquer outro pacote/app subsequente.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-02-lv-dev-tracker-fase1-plan1-foundation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Orquestração: dispatch um subagent fresh por task, review entre tasks, iteração rápida. Cada subagent recebe esta task como instrução self-contained.

**2. Inline Execution** — Executo as tasks nesta sessão usando `executing-plans`, batch com checkpoints.

**Próximo passo após Plan 1 completar:** escrever Plan 2 (Daemon Core) que constrói sobre `@tracker/db` + `@tracker/shared`.

Qual abordagem?
