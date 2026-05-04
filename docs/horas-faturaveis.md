# Horas faturáveis: como funcionam

Documento de referência sobre como o `token-tracker` mede tempo, calcula horas faturáveis, projeta previsto × realizado e classifica status (abaixo / no ponto / acima).

> Volte pro [README](../README.md) quando quiser.

---

## Sumário

1. [Conceitos básicos](#1-conceitos-básicos)
2. [Como o tempo é computado](#2-como-o-tempo-é-computado)
3. [Como horas faturáveis são calculadas](#3-como-horas-faturáveis-são-calculadas)
4. [Fallback "horas claimable"](#4-fallback-horas-claimable)
5. [Forecast: previsto × realizado](#5-forecast-previsto--realizado)
6. [Convenção de cores e status](#6-convenção-de-cores-e-status)
7. [Tabela de settings configuráveis](#7-tabela-de-settings-configuráveis)
8. [Cenários de uso](#8-cenários-de-uso)
9. [FAQ](#9-faq)

---

## 1. Conceitos básicos

| Conceito | O que é | Onde fica |
|---|---|---|
| **Tarefa (task)** | Unidade básica. Bloco contíguo de mensagens agrupadas pelo detector via gap + similaridade Jaccard + keywords de retomada/troca. | Tabela `tasks` |
| **Tempo real** | Tempo de relógio entre `startedAt` e `endedAt`. Uma task aberta há 4h conta como 4h reais, mesmo que você só tenha falado 30min. | `tasks.startedAt` / `tasks.endedAt` |
| **Tempo derivado de tokens** | Estimativa do tempo "ativo" em segundos baseada em quantos tokens foram processados. Não é tempo real. | `tasks.timeTotalSeconds` (= `inputSeconds + processingOutputSeconds + readingSeconds`) |
| **Horas humanas estimadas** | Quanto tempo você levaria se fizesse à mão — estimado pelo Haiku a partir do título/descrição, ou inserido manualmente. | `tasks.humanHoursEstimate` + `humanHoursSource` |
| **Horas faturáveis** | Resultado final. O que vai pra cobrança / planilha. Calculado a partir das duas anteriores + um fator. | `tasks.billableHours` + `billableHoursLocked` |

---

## 2. Como o tempo é computado

### 2.1 Tempo real (wall clock)

Calculado direto: `endedAt - startedAt`. Usado para ordenar tasks por duração e medir "quanto tempo a janela ficou aberta". **Não é o que vai pra horas faturáveis.**

### 2.2 Tempo derivado de tokens (`timeTotalSeconds`)

Fórmula em [`packages/shared/src/time-calc.ts`](../packages/shared/src/time-calc.ts):

```
inputBillableTokens     = tokens.input + tokens.cacheCreation
cacheReadEffectiveTokens = tokens.cacheRead × cacheReadFactor

inputSeconds            = (inputBillableTokens + cacheReadEffectiveTokens) × timePerInputTokenSeconds
processingOutputSeconds = tokens.output × timePerProcessingOutputTokenSeconds
readingSeconds          = tokens.output × timePerReadingTokenSeconds

timeTotalSeconds        = inputSeconds + processingOutputSeconds + readingSeconds
```

**Defaults atuais** (calibrados em maio/2026 pra Opus ~75 tok/s — antes os valores eram 0.5/0.05/0.15 e inflavam tempo de input em ~1000×):

| Setting | Default | O que faz |
|---|---|---|
| `timePerInputTokenSeconds` | `0.0008` | Tempo por token de input. Input é processado em batch — barato. |
| `timePerProcessingOutputTokenSeconds` | `0.013` | Tempo de geração por token de output. ~75 tok/s (Opus). |
| `timePerReadingTokenSeconds` | `0.04` | Tempo que **um humano** leva pra ler/revisar cada token de output. Isto é o que mais infla o tempo total. |
| `cacheReadFactor` | `0.05` | Cache read conta como 5% do tempo de um token novo (cache é ~20× mais rápido). |

> Toda mudança nesses 4 valores via `/settings` dispara `recalcTimeAndBillableForAll` automaticamente — todas as tasks históricas são recomputadas.

### 2.3 Horas humanas (`humanHoursEstimate`)

Três fontes possíveis (campo `humanHoursSource`):

- **`haiku`** — refiner usa Haiku 4.5 pra estimar quanto tempo um humano levaria, a partir do título e descrição da task. Roda automaticamente nas tasks acima de `haiku.autoRefineAboveTokens` (default 5000), em batch noturno se `haiku.autoEstimateHours = true`. Custo: ~$0.001 por task.
- **`manual`** — você mesmo digitou. **Tem prioridade absoluta** — Haiku nunca sobrescreve estimativa manual.
- **`none`** — ainda não foi estimado.

> Sem chave Anthropic configurada (nem `ANTHROPIC_API_KEY` nem `CLAUDE_CODE_OAUTH_TOKEN`), o refiner é skipado. As tasks ficam sem `humanHoursEstimate` e portanto sem `billableHours`. O fallback abaixo cobre esse caso.

---

## 3. Como horas faturáveis são calculadas

Fórmula em [`apps/daemon/src/biller/biller.ts`](../apps/daemon/src/biller/biller.ts):

```
claudeHours    = timeTotalSeconds / 3600
billableHours  = ((claudeHours + humanHoursEstimate) / 2) × factor
```

Onde `factor` é (em ordem de precedência):

1. `client.billableFactor` (campo do cliente, default 0.4) **se** a task está vinculada a um cliente com `billableFactor` setado.
2. Senão, `settings.billableFactorDefault` (default 0.4).

**Por que essa fórmula?**
- A média entre `claudeHours` (tempo derivado de tokens — proxy de quanto IA processou) e `humanHoursEstimate` (quanto seria à mão) tenta capturar o "trabalho real entregue", não o tempo de janela aberta.
- O `factor` (0.4 default) é o desconto que reconhece que **nem todo tempo gasto vira hora faturável**: pausas, refatoração descartada, exploração que deu errado, conversas paralelas. Você ajusta por cliente — ex.: cliente exigente onde tudo é cobrado pode ter `factor=0.7`; projeto experimental, `factor=0.2`.

### Quando `billableHours` NÃO é calculada

- `billableHoursLocked = true` → você travou o valor manualmente. Recálculos não tocam.
- `humanHoursEstimate IS NULL` → não há estimativa humana. Sem ela, a fórmula não roda.

Nesses casos, o dashboard usa o fallback "horas claimable" (próxima seção) pra ainda mostrar algo útil.

### Quando recalcula

- Mudou settings de tempo (`timePerInputTokenSeconds`, etc) → recálculo de **todas as tasks**.
- Estimator do Haiku gravou `humanHoursEstimate` → recálculo só da task afetada.
- Alterou cliente da task → no próximo tick relevante, recálculo dela.
- Trocou `client.billableFactor` → tasks daquele cliente serão recomputadas no próximo tick que tocá-las.

---

## 4. Fallback "horas claimable"

Quando `billableHours` está `NULL` ou zero, o dashboard usa esta cascata pra ainda mostrar valor (ver `apps/dashboard/src/app/page.tsx` na construção de `topTasks` e `forecast`):

```
claimable = billableHours > 0
          ? billableHours
          : humanHoursEstimate ?? (timeTotalSeconds / 3600)
```

Isso garante que o **forecast e top-tasks nunca somem zero só porque o Haiku ainda não rodou**. Você vê algo desde o primeiro tick — e refina depois.

---

## 5. Forecast: previsto × realizado

A tabela na home (`/`) projeta cada cliente em 3 dimensões: **horas**, **receita**, **custo IA**. Tudo proporcional ao período selecionado (today / week / month / all / custom).

### 5.1 Modelo de cobrança do cliente

Inferido automaticamente a partir dos campos preenchidos em `/clients`:

| Modelo | Como detecta | Como projeta receita |
|---|---|---|
| **`fixed`** | `contractValueBrl` ou `contractValueUsd` setado | Valor do contrato × `monthFraction` |
| **`hourly`** | `hourlyRateBrl` ou `hourlyRateUsd` setado (precedência sobre fixed) | `hourlyRate × expectedHoursForPeriod` (previsto), `hourlyRate × hoursRealizadas` (realizado) |
| **`none`** | Nenhum dos dois | Sem receita projetada |

### 5.2 Normalização proporcional ao período

Toda baseline mensal/semanal/anual é normalizada pra **mensal** primeiro, depois multiplicada por `monthFraction = rangeDays / 30`:

```
periodToMonthly(value, "week")  = value × (30/7)
periodToMonthly(value, "month") = value
periodToMonthly(value, "year")  = value / 12
```

Aplicado a `hourLimitValue` (com `hourLimitPeriod`) e `contractValue*` (com `contractPeriod`).

**Exemplo:** cliente com `contractValueBrl=12000`, `contractPeriod="year"`, range selecionado "week" (7 dias):
- contractMonthlyUsd = (12000/rate) / 12 = ~$200
- expectedRevenueUsd = 200 × (7/30) = ~$47
- Comparado contra horas/custo realizados na mesma janela.

### 5.3 Δ horas (status)

```
expectedHoursForPeriod = (monthlyAverageHours ?? hourLimitMonthly) × monthFraction
hoursPct                = (hoursRealizadas / expectedHoursForPeriod × 100) - 100
```

Status (`hoursStatus`) classificado por:

| Condição | Status | Cor (default) | Significado |
|---|---|---|---|
| `pct < -tolBelow` | `below` | 🟢 accent | Trabalhou **menos** que o esperado — sobra de capacidade ou cliente subutilizado. |
| `pct > tolAbove` | `above` | 🔴 danger | Trabalhou **mais** que o esperado — pode estar saindo do escopo / escope creep. |
| caso contrário | `ok` | ⚪ neutro | No ponto. |
| `expectedHoursForPeriod` ausente | `no_target` | ⚫ muted | Sem baseline configurada. |

Defaults: `billableTolerancePercentBelow=15`, `billableTolerancePercentAbove=10`.

### 5.4 Custo IA (3 baselines em ordem de prioridade)

A baseline contra a qual o custo de IA é comparado tem **prioridade ordenada**:

1. **`revenue`** — se há `expectedRevenueUsd > 0`, baseline = receita prevista.
   - `costPct = (custoUsd / receitaPrevista) × 100` — **% da receita gasto em IA**.
   - `costDeltaUsd = receitaPrevista - custoUsd` — sobra (positivo = lucro bruto).
   - Status:
     - `costPct > costTolAbove` → `above` (🔴 IA está comendo margem demais).
     - `costPct < costTolBelow` → `below` (🟢 ótima margem).
     - caso contrário → `ok`.
   - Defaults: `costTolAbove=15%`, `costTolBelow=25%` (i.e. > 15% da receita em IA é alerta; < 25% é ótimo).

2. **`explicit`** — se `client.monthlyAverageCostUsd` está setado e não houve receita.
   - Baseline = `monthlyAverageCostUsd × monthFraction` (orçamento ajustado ao período).
   - `costPct = (custoUsd / orçamento × 100) - 100` — variação clássica.
   - `costDeltaUsd = custoUsd - orçamento` (positivo = passou do orçamento).
   - Status: `classify(costPct, costTolBelow, costTolAbove)` (mesma regra das horas — `above` é ruim).

3. **`inferred`** — fallback final.
   - Baseline = média histórica dos últimos 90 dias (`histCostUsd / 3`), normalizada ao período.
   - Mesma fórmula do `explicit`.
   - Útil pra detectar mudanças de comportamento mesmo sem orçamento configurado.

4. **`none`** — sem dados pra inferir baseline. `costStatus = no_target`.

### 5.5 Eventos manuais

Tasks manuais e eventos de calendário (criados via `/iniciar-task`, `/concluir-task`, ou direto em `/events`) são **somados às horas do cliente** no forecast — não substituem.

---

## 6. Convenção de cores e status

**Importantíssimo:** a convenção é **invertida em relação a outras ferramentas** porque "passar do esperado" geralmente é ruim em contexto de margem.

| Status | Cor | Quando aparece | O que significa |
|---|---|---|---|
| `below` | 🟢 verde (accent) | `pct < -tolBelow` (horas/custo abaixo do esperado) | **Bom.** Sobra. Pode ser margem alta ou capacidade ociosa. |
| `ok` | ⚪ neutro (text-secondary) | dentro da faixa de tolerância | **No ponto.** Operação dentro do esperado. |
| `above` | 🔴 vermelho (danger) | `pct > tolAbove` | **Alerta.** Passou do orçamento/horas — escope creep ou IA cara demais. |
| `no_target` | ⚫ cinza (muted) | sem baseline definida | **Sem comparativo.** Configure metas em `/clients`. |

Mesma convenção pra horas e pra custo de IA.

---

## 7. Tabela de settings configuráveis

Editáveis em `/settings`. Mudanças entram em vigor no próximo tick — sem restart do daemon.

### Tempo derivado de tokens

| Chave | Default | Efeito | Quando ajustar |
|---|---|---|---|
| `timePerInputTokenSeconds` | `0.0008` | Segundos por token de input. | Se rodar quase só Sonnet (mais rápido) ou Haiku, pode reduzir. |
| `timePerProcessingOutputTokenSeconds` | `0.013` | Segundos por token de output gerado. | Modelo mais lento → aumenta. Default Opus ~75 tok/s. |
| `timePerReadingTokenSeconds` | `0.04` | Segundos por token de output que **você** lê/revisa. | Você lê muito rápido (skimmar) → reduzir; você revisa cada linha → aumentar. |
| `cacheReadFactor` | `0.05` | Multiplicador pro tempo de cache hit. | Aumente se desconfia que cache está cobrando tempo demais. |

### Horas faturáveis

| Chave | Default | Efeito |
|---|---|---|
| `billableFactorDefault` | `0.4` | Fator padrão pra clientes sem `billableFactor` próprio. |
| `billableTolerancePercentBelow` | `15` | Quanto abaixo do previsto vira `below`. |
| `billableTolerancePercentAbove` | `10` | Quanto acima do previsto vira `above`. |
| `costTolerancePercentBelow` | `25` | Tolerância de custo IA — abaixo disso é `below` (ótima margem). |
| `costTolerancePercentAbove` | `15` | Tolerância de custo IA — acima disso é `above` (alerta margem). |

### Refinamento Haiku

| Chave | Default | Efeito |
|---|---|---|
| `haiku.autoRefineAboveTokens` | `5000` | Tasks com mais que isso recebem título/descrição refinados. |
| `haiku.autoEstimateHours` | `true` | Liga estimativa automática de horas humanas. |
| `haiku.maxConcurrent` | `3` | Concurrency do batch noturno. |
| `haiku.requestsPerSecond` | `1` | Rate limit. |
| `haiku.model` | `claude-haiku-4-5-20251001` | Modelo usado. |

### Por cliente (em `/clients`)

| Campo | O que faz |
|---|---|
| `billableFactor` | Sobrescreve `billableFactorDefault` pra tasks deste cliente. |
| `monthlyAverageHours` | Baseline mensal de horas (input no forecast). |
| `hourLimitValue` + `hourLimitPeriod` | Fallback de baseline de horas (usado se `monthlyAverageHours` vazio). |
| `monthlyAverageCostUsd` | Orçamento mensal de IA (USD). |
| `contractValueBrl/Usd` + `contractPeriod` | Valor de contrato (modelo `fixed`). |
| `hourlyRateBrl/Usd` | Taxa horária (modelo `hourly` — precedência sobre fixed). |

---

## 8. Cenários de uso

### 🧑‍💻 Freela hourly

```
hourlyRateBrl       = 250
monthlyAverageHours = 80
billableFactor      = 0.5  (você é exigente — cobra metade do que mediu)
```

Forecast mostra: previsto $250 × 80h = $20k/mês. Realizado = $250 × horas_de_billable_calculadas. Custo IA é comparado contra a receita prevista — se estiver consumindo > 15% da receita, alerta.

### 🏢 Agência fixed

```
contractValueBrl     = 30000
contractPeriod       = "month"
monthlyAverageHours  = 120  (capacity expectation)
monthlyAverageCostUsd = 200  (orçamento explícito de IA)
billableFactor       = 0.6
```

Forecast: receita previsto = realizado = $30k/rate (fixed contract). Δ horas alerta se passou de 120h. Custo IA tem dois pontos de comparação: % da receita (prioridade) e o orçamento explícito (fallback).

### 🔬 Projeto pessoal

```
kind = "personal"
```

Sem cobrança esperada. O forecast ainda mostra horas e custo IA pra você ter consciência, mas não calcula margem.

### 🚀 Produto próprio

```
kind = "product"
```

Receita variável via `revenue_entries` (entradas manuais em `/clients/{id}`). Use pra produto SaaS onde o MRR muda mês a mês.

---

## 9. FAQ

**Por que minha task não tem `billableHours`?**
Provavelmente falta `humanHoursEstimate`. Verifique se o Haiku está configurado (chave Anthropic ou OAuth token). Sem isso, o fallback "horas claimable" é o que aparece no dashboard.

**Por que o forecast diz `no_target` pra um cliente?**
Falta baseline. Configure pelo menos um destes em `/clients`: `monthlyAverageHours`, `hourLimitValue`, `hourlyRate`, `contractValue`, ou `monthlyAverageCostUsd`.

**Mexi em `billableFactor`. Por que as tasks antigas não atualizaram na hora?**
Mudanças em settings de **tempo** (`timePerInput*`, etc) disparam recálculo total. Mudanças em `billableFactor` do cliente só atualizam a task no próximo tick que a tocar. Pra forçar agora: `tktr backfill` ou abra o cliente e salve qualquer campo (dispara update).

**Posso travar uma `billableHours` específica?**
Sim. Marque `billableHoursLocked = true` na task (botão de cadeado no detalhe da task). Recálculos automáticos passam por cima dela.

**O `timeTotalSeconds` está enorme — task de 30min mostrando 4 horas. Bug?**
Provavelmente settings de tempo desatualizadas (era pré-maio/2026, valores 0.5/0.05/0.15). Em `/settings` há um botão "↻ restaurar defaults" que volta pros valores calibrados pra Opus. Isso recalcula tudo.

**Posso ajustar `humanHoursEstimate` manualmente?**
Sim — entre no detalhe da task e edite. Source vira `manual` e Haiku nunca mais sobrescreve.

**Por que existe a inversão "above é ruim"?**
Porque o forecast existe pra você descobrir **risco de margem**. Custo IA acima do orçamento é alerta; horas acima do previsto pode ser escope creep. Acima do esperado raramente é "feedback positivo" em contexto de cobrança.

**Como excluir uma task do forecast/top-tasks?**
Tasks com `category="system"` são filtradas automaticamente. Marque a task como sistema no detalhe — útil pra pings de manutenção, sync de schema, etc.

---

## Fontes no código

| Lógica | Arquivo |
|---|---|
| Fórmula de tempo derivado | [`packages/shared/src/time-calc.ts`](../packages/shared/src/time-calc.ts) |
| Cálculo de billable hours | [`apps/daemon/src/biller/biller.ts`](../apps/daemon/src/biller/biller.ts) |
| Recálculo em massa | [`apps/daemon/src/recalc/recalc.ts`](../apps/daemon/src/recalc/recalc.ts) |
| Estimativa Haiku | [`apps/daemon/src/estimator/estimator.ts`](../apps/daemon/src/estimator/estimator.ts) |
| Forecast (previsto × realizado) | [`apps/dashboard/src/app/page.tsx`](../apps/dashboard/src/app/page.tsx) |
| Schema (clientes, tasks) | [`packages/db/src/schema.ts`](../packages/db/src/schema.ts) |
| Defaults e validação de settings | [`packages/shared/src/settings-schema.ts`](../packages/shared/src/settings-schema.ts) |
