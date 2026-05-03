import { NextResponse } from "next/server";
import {
  listClients, listProjects, listTasks, listEvents, listRevenueEntries, getSetting, type DbClient,
} from "@tracker/db";
import { getDb } from "@/lib/db";
import { makeHaikuClient, HaikuUnavailableError } from "@/lib/haiku";
import { ANTHROPIC_PLAN_COSTS, planMonthlyCostUsd } from "@tracker/shared";

interface ClientInsight {
  name: string;
  kind: "service" | "personal" | "product";
  billingMode: "fixed" | "hourly" | "none";
  // Para clientes "product" — receitas registradas no período.
  revenueActualUsdInPeriod: number | null;
  revenueEstimatedUsdInPeriod: number | null;
  hourlyRateBrl: number | null;
  hourlyRateUsd: number | null;
  contractValueMonthlyBrl: number | null;
  contractValueMonthlyUsd: number | null;
  contractPeriodOriginal: string | null;
  monthlyAverageHours: number | null;
  hourLimitMonthlyEquivalent: number | null;
  baselineHoursMonthly: number | null;
  monthlyAverageCostUsdExplicit: number | null;
  inferredMonthlyCostUsdFromHistory: number | null;
  // Realizado no período visível
  taskHours: number;
  eventHours: number;
  totalClaimableHours: number;
  costUsdInPeriod: number;
  // Receita esperada e realizada (proporcional ao período visível)
  expectedRevenueUsd: number | null;
  realizedRevenueUsd: number | null;
  // Δ horas
  expectedHoursForPeriod: number | null;
  hoursDeltaPct: number | null;
  // Custo IA × receita
  costAsPctOfRevenue: number | null;
  marginUsd: number | null; // receita - custo IA
  // Datas do contrato (informativas)
  contractStartAtIso: string | null;
  contractRenewalAtIso: string | null;
  daysUntilRenewal: number | null;
}

interface InsightSummary {
  rangeDays: number;
  monthFraction: number;
  currencyUsdToBrl: number;
  anthropicPlan: {
    planType: string;
    planLabel: string;
    monthlyFixedCostUsd: number | null;
    monthlyFixedCostUsdForPeriod: number | null;
    note: string;
  };
  tolerances: {
    billableHoursBelow: number;
    billableHoursAbove: number;
    costBelow: number;
    costAbove: number;
  };
  carteira: {
    totalTasks: number;
    totalCostUsd: number;
    totalClaimableHours: number;
    totalEventHours: number;
  };
  byClient: ClientInsight[];
  topProjects: Array<{
    name: string;
    clientName: string | null;
    claimableHours: number;
    costUsd: number;
  }>;
}

function periodToMonthly(value: number, period: string | null): number {
  if (period === "week") return value * (30 / 7);
  if (period === "year") return value / 12;
  return value;
}

function buildSummary(
  db: DbClient,
  days = 30,
  rate = 5,
  plan: { planType: string; planLabel: string; monthlyFixedCostUsd: number | null },
): InsightSummary {
  const now = Date.now();
  const cutoff = now - days * 86400000;
  const ninetyAgo = now - 90 * 86400000;
  const monthFraction = days / 30;

  const projects = listProjects(db).filter((p) => p.active);
  const projectIds = new Set(projects.map((p) => p.id));
  const allTasks = listTasks(db, {})
    .filter((t) => t.category !== "system")
    .filter((t) => projectIds.has(t.projectId));
  const tasks = allTasks.filter((t) => t.startedAt >= cutoff);
  const histTasks = allTasks.filter((t) => t.startedAt >= ninetyAgo);

  const clients = listClients(db);
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const tolerances = {
    billableHoursBelow: getSetting<number>(db, "billableTolerancePercentBelow") ?? 15,
    billableHoursAbove: getSetting<number>(db, "billableTolerancePercentAbove") ?? 10,
    costBelow: getSetting<number>(db, "costTolerancePercentBelow") ?? 25,
    costAbove: getSetting<number>(db, "costTolerancePercentAbove") ?? 15,
  };

  function claimable(t: typeof tasks[number]): number {
    if (t.billableHours !== null && t.billableHours > 0) return t.billableHours;
    return t.humanHoursEstimate ?? (t.timeTotalSeconds / 3600);
  }

  const byClient: ClientInsight[] = clients.map((c) => {
    const projIds = new Set(projects.filter((p) => p.clientId === c.id).map((p) => p.id));
    const ts = tasks.filter((t) => t.clientId === c.id || projIds.has(t.projectId));
    const revs = listRevenueEntries(db, { clientId: c.id, fromMs: cutoff, toMs: now });
    const revActualUsd = revs.filter((r) => r.kind === "actual").reduce((s, r) => {
      return s + (r.amountUsd ?? (r.amountBrl !== null ? r.amountBrl / rate : 0));
    }, 0);
    const revEstUsd = revs.filter((r) => r.kind === "estimated").reduce((s, r) => {
      return s + (r.amountUsd ?? (r.amountBrl !== null ? r.amountBrl / rate : 0));
    }, 0);
    const histTs = histTasks.filter((t) => t.clientId === c.id || projIds.has(t.projectId));
    const evs = listEvents(db, { clientId: c.id })
      .filter((e) => e.startAt >= cutoff && e.startAt <= now);

    const taskHours = ts.reduce((s, t) => s + claimable(t), 0);
    const eventHours = evs.reduce((s, e) => s + e.durationMinutes / 60, 0);
    const totalClaimableHours = taskHours + eventHours;
    const costUsdInPeriod = ts.reduce((s, t) => s + t.costUsd, 0);
    const histCostUsd = histTs.reduce((s, t) => s + t.costUsd, 0);
    const inferredMonthlyCostUsdFromHistory = histTs.length > 0 ? histCostUsd / 3 : null;

    const billingMode: ClientInsight["billingMode"] =
      (c.hourlyRateBrl !== null || c.hourlyRateUsd !== null) ? "hourly"
      : (c.contractValueBrl !== null || c.contractValueUsd !== null) ? "fixed"
      : "none";

    const hourLimitMonthlyEquivalent = c.hourLimitValue !== null
      ? periodToMonthly(c.hourLimitValue, c.hourLimitPeriod) : null;
    const baselineHoursMonthly = c.monthlyAverageHours ?? hourLimitMonthlyEquivalent;
    const expectedHoursForPeriod = baselineHoursMonthly !== null
      ? baselineHoursMonthly * monthFraction : null;
    const hoursDeltaPct = expectedHoursForPeriod && expectedHoursForPeriod > 0
      ? Number(((totalClaimableHours / expectedHoursForPeriod) * 100 - 100).toFixed(1))
      : null;

    const contractMonthlyBrl = c.contractValueBrl !== null
      ? periodToMonthly(c.contractValueBrl, c.contractPeriod) : null;
    const contractMonthlyUsd = c.contractValueUsd !== null
      ? periodToMonthly(c.contractValueUsd, c.contractPeriod)
      : (contractMonthlyBrl !== null ? contractMonthlyBrl / rate : null);
    const hourlyUsd = c.hourlyRateUsd ?? (c.hourlyRateBrl !== null ? c.hourlyRateBrl / rate : null);

    let expectedRevenueUsd: number | null = null;
    let realizedRevenueUsd: number | null = null;
    if (billingMode === "fixed") {
      expectedRevenueUsd = contractMonthlyUsd !== null ? contractMonthlyUsd * monthFraction : null;
      realizedRevenueUsd = expectedRevenueUsd;
    } else if (billingMode === "hourly") {
      expectedRevenueUsd = hourlyUsd !== null && expectedHoursForPeriod !== null
        ? hourlyUsd * expectedHoursForPeriod : null;
      realizedRevenueUsd = hourlyUsd !== null ? hourlyUsd * totalClaimableHours : null;
    }

    const costAsPctOfRevenue = expectedRevenueUsd !== null && expectedRevenueUsd > 0
      ? Number(((costUsdInPeriod / expectedRevenueUsd) * 100).toFixed(1))
      : null;
    const marginUsd = expectedRevenueUsd !== null
      ? Number((expectedRevenueUsd - costUsdInPeriod).toFixed(2))
      : null;

    return {
      name: c.name,
      kind: c.kind as "service" | "personal" | "product",
      billingMode,
      revenueActualUsdInPeriod: revs.length > 0 ? Number(revActualUsd.toFixed(2)) : null,
      revenueEstimatedUsdInPeriod: revs.length > 0 ? Number(revEstUsd.toFixed(2)) : null,
      hourlyRateBrl: c.hourlyRateBrl,
      hourlyRateUsd: c.hourlyRateUsd,
      contractValueMonthlyBrl: contractMonthlyBrl !== null ? Number(contractMonthlyBrl.toFixed(2)) : null,
      contractValueMonthlyUsd: contractMonthlyUsd !== null ? Number(contractMonthlyUsd.toFixed(2)) : null,
      contractPeriodOriginal: c.contractPeriod,
      monthlyAverageHours: c.monthlyAverageHours,
      hourLimitMonthlyEquivalent: hourLimitMonthlyEquivalent !== null
        ? Number(hourLimitMonthlyEquivalent.toFixed(1)) : null,
      baselineHoursMonthly: baselineHoursMonthly !== null
        ? Number(baselineHoursMonthly.toFixed(1)) : null,
      monthlyAverageCostUsdExplicit: c.monthlyAverageCostUsd,
      inferredMonthlyCostUsdFromHistory: inferredMonthlyCostUsdFromHistory !== null
        ? Number(inferredMonthlyCostUsdFromHistory.toFixed(2)) : null,
      taskHours: Number(taskHours.toFixed(2)),
      eventHours: Number(eventHours.toFixed(2)),
      totalClaimableHours: Number(totalClaimableHours.toFixed(2)),
      costUsdInPeriod: Number(costUsdInPeriod.toFixed(2)),
      expectedRevenueUsd: expectedRevenueUsd !== null ? Number(expectedRevenueUsd.toFixed(2)) : null,
      realizedRevenueUsd: realizedRevenueUsd !== null ? Number(realizedRevenueUsd.toFixed(2)) : null,
      expectedHoursForPeriod: expectedHoursForPeriod !== null
        ? Number(expectedHoursForPeriod.toFixed(2)) : null,
      hoursDeltaPct,
      costAsPctOfRevenue,
      marginUsd,
      contractStartAtIso: c.contractStartAt !== null ? new Date(c.contractStartAt).toISOString().slice(0, 10) : null,
      contractRenewalAtIso: c.contractRenewalAt !== null ? new Date(c.contractRenewalAt).toISOString().slice(0, 10) : null,
      daysUntilRenewal: c.contractRenewalAt !== null
        ? Math.ceil((c.contractRenewalAt - now) / 86400000) : null,
    };
  }).filter((c) => c.totalClaimableHours > 0 || c.costUsdInPeriod > 0
    || c.baselineHoursMonthly !== null || c.contractValueMonthlyBrl !== null || c.contractValueMonthlyUsd !== null);

  const topProjects = projects
    .map((p) => {
      const ts = tasks.filter((t) => t.projectId === p.id);
      const clientName = p.clientId ? clientById.get(p.clientId)?.name ?? null : null;
      return {
        name: p.name,
        clientName,
        claimableHours: Number(ts.reduce((s, t) => s + claimable(t), 0).toFixed(2)),
        costUsd: Number(ts.reduce((s, t) => s + t.costUsd, 0).toFixed(2)),
      };
    })
    .filter((p) => p.claimableHours > 0)
    .sort((a, b) => b.claimableHours - a.claimableHours)
    .slice(0, 10);

  const monthlyFixedCostUsdForPeriod = plan.monthlyFixedCostUsd !== null
    ? Number((plan.monthlyFixedCostUsd * monthFraction).toFixed(2))
    : null;
  const planNote = plan.planType === "api_paygo"
    ? "Usuário paga pay-as-you-go: 'costUsdInPeriod' representa débito real."
    : plan.planType === "free"
      ? "Plano free: 'costUsdInPeriod' é hipotético, sem cobrança."
      : `Usuário tem plano fixo de ~$${plan.monthlyFixedCostUsd}/mês. 'costUsdInPeriod' é INFORMATIVO — mostra o que SERIA cobrado em pay-as-you-go. O custo real pago no período é monthlyFixedCostUsdForPeriod (rateado entre todos os clientes).`;

  return {
    rangeDays: days,
    monthFraction: Number(monthFraction.toFixed(2)),
    currencyUsdToBrl: rate,
    anthropicPlan: {
      planType: plan.planType,
      planLabel: plan.planLabel,
      monthlyFixedCostUsd: plan.monthlyFixedCostUsd,
      monthlyFixedCostUsdForPeriod,
      note: planNote,
    },
    tolerances,
    carteira: {
      totalTasks: tasks.length,
      totalCostUsd: Number(tasks.reduce((s, t) => s + t.costUsd, 0).toFixed(2)),
      totalClaimableHours: Number(byClient.reduce((s, c) => s + c.totalClaimableHours, 0).toFixed(2)),
      totalEventHours: Number(byClient.reduce((s, c) => s + c.eventHours, 0).toFixed(2)),
    },
    byClient,
    topProjects,
  };
}

const SYSTEM_PROMPT = `Você é um analista financeiro/operacional sênior ajudando um desenvolvedor freelancer brasileiro a entender e otimizar a carteira de clientes dele e o uso de IA.

CONTEXTO DO SISTEMA:
- "claimableHours" = horas que o dev pode cobrar (billable se calculado, ou estimativa humana, ou tempo Claude derivado de tokens).
- "costUsdInPeriod" = quanto a IA (Claude) custou nesse período pra esse cliente.
- "anthropicPlan" = leia esse campo PRIMEIRO. Ele diz se costUsdInPeriod é débito real (api_paygo) ou apenas informativo (planos fixos Pro/Max). Quando é fixo, o custo real do dev é "monthlyFixedCostUsdForPeriod", rateado entre TODOS os clientes — então um cliente "caro em IA" não está te custando dinheiro extra; está consumindo mais da cota do plano. Use isso pra calibrar conselhos: se está em plano fixo, não recomende "negocie por causa do custo IA" — em vez disso fale em "% da cota do plano consumida" ou "quando o custo IA passar do plano fixo, virar gasto real".
- "expectedRevenueUsd" = receita esperada no período. Pra cliente fixo = contrato mensal × fração do período. Pra cliente por hora = hourlyRate × baselineHoursMonthly × fração.
- "realizedRevenueUsd" = receita já realizada (pra contrato fixo, igual ao previsto; pra hora, hourlyRate × claimableHours).
- "marginUsd" = receita esperada − custo IA. É lucro bruto antes de horas humanas, impostos, infra.
- "costAsPctOfRevenue" = % da receita prevista que está sendo gasto em IA.
- "hoursDeltaPct" = diferença % entre horas trabalhadas e baseline esperado (positivo = passou do esperado, negativo = abaixo).

TIPOS DE CLIENTE (campo "kind"):
- "service":  cliente real, com cobrança/contrato. Avalie normalmente (acima/abaixo/tolerado).
- "personal": projeto pessoal. SEM lucro esperado. NÃO recomendar contrato/preço — só observar tempo investido e custo IA. Se está fora de controle, sugerir limite ou pausar. Receita = 0 sempre.
- "product":  produto próprio. Sem contrato fixo, mas pode ter receita registrada em "revenueActualUsdInPeriod" (real) e "revenueEstimatedUsdInPeriod" (previsão). Lucro = revenueActual - costUsdInPeriod. Se lucro for muito menor que estimado, alertar.

GLOSSÁRIO DOS MODELOS DE COBRANÇA:
- "fixed": cliente paga valor mensal/anual fixo. Receita não escala com horas.
- "hourly": cliente paga por hora trabalhada. Receita escala com horas.
- "none": cliente sem modelo definido (esperado pra "personal" e "product"; sugerir configurar pra "service").

TOLERÂNCIAS DO USUÁRIO (não exigir desvio zero):
- Para horas: dentro de [-billableHoursBelow%, +billableHoursAbove%] está OK. Acima = ruim, abaixo = lucro (cliente fixo, paga a mesma coisa por menos horas).
- Para custo IA vs receita: dentro de [costBelow%, costAbove%] está OK. Acima = IA está caro pro contrato, abaixo = ótima margem.
- Use os valores literais de "tolerances" no JSON pra calibrar suas conclusões. Se cliente está dentro da faixa tolerada, NÃO recomende ajuste — só observe.

REGRAS DE OUTPUT:
- Português brasileiro, direto, prático.
- 6-10 bullets. Use "-" como marcador.
- Pode usar 1 emoji por bullet, no início, com moderação (💸 custo, 📈 crescimento, ⚠️ alerta, 💡 sugestão, ⏱️ tempo, 🎯 ação). Sem emoji no bullet final "Ação prioritária:".
- Cada bullet pode ter até ~180 chars (espaço pra dado + sugestão concreta).
- NUNCA invente números — use APENAS o JSON. Quando for sugerir valor (ex: "ajustar pra R$ X"), justifique pelo dado (custo IA, horas, hourly equivalente).
- Identifique:
  1. Clientes acima do esperado em horas — sugerir reajuste do contrato fixo OU virar pra hora se freela está "comendo" muito tempo.
  2. Clientes acima do tolerado em custo IA vs receita — sugerir aumentar contrato/rate, mudar modelo de cobrança, ou negociar.
  3. Clientes ABAIXO do tolerado em horas (cliente fixo) — você está cobrando mais do que entrega = lucro silencioso, mantém.
  4. Clientes em modo "none" — propor modelo (sugerir hourly + valor/hora baseado em rate de outros clientes ou custo IA × margem 5x).
  5. Projetos consumindo tempo desproporcional ao cliente.
  6. Anomalias de custo IA (cliente com costUsdInPeriod alto e poucas horas — possível sessão de exploração desnecessária).
  7. Renovações próximas: se "daysUntilRenewal" ≤ 30, lembrar e sugerir o que renegociar (ex: "Cliente X renova em N dias e está acima do esperado em Y%, pedir reajuste de Z%").
- Não dar conselho genérico ("considere reavaliar"). Sempre dar valor numérico ou ação executável.
- Último bullet começa exatamente com "Ação prioritária:" (sem emoji), e contém a UMA recomendação mais alta de ROI.

FORMATAÇÃO PERMITIDA (markdown leve):
- Use **negrito** pra destacar nome do cliente, valores monetários e ações concretas.
- Use \`código\` pra nomes de campos do JSON (ex: \`hourlyRateBrl\`) ou valores literais que vão pro form.
- *Itálico* só quando absolutamente necessário pra ênfase.
- NADA de títulos (#, ##), tabelas, ou blocos de código grandes. Apenas bullets com inline markdown.

Sem títulos, sem frases introdutórias. Apenas os bullets.`;

// Cache em memória do último insight gerado (5 min) — protege contra rate limit em re-cliques.
const cache = new Map<string, { text: string; model: string; createdAt: number }>();
const CACHE_TTL_MS = 5 * 60_000;

function summaryHash(s: InsightSummary): string {
  return JSON.stringify({
    days: s.rangeDays,
    tot: s.carteira.totalTasks,
    cost: s.carteira.totalCostUsd,
    clients: s.byClient.map((c) => `${c.name}:${c.totalClaimableHours}:${c.costUsdInPeriod}`).join("|"),
  });
}

import { getUsdBrlRate } from "@/lib/currency-rate";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "30");
  const force = url.searchParams.get("force") === "1";

  const db = getDb();
  const planType = getSetting<string>(db, "anthropic.planType") ?? "max20_200";
  const planOverride = getSetting<number | null>(db, "anthropic.planMonthlyCostUsd") ?? null;
  const plan = {
    planType,
    planLabel: ANTHROPIC_PLAN_COSTS[planType]?.label ?? planType,
    monthlyFixedCostUsd: planMonthlyCostUsd(planType, planOverride),
  };

  let summary: InsightSummary;
  try {
    summary = buildSummary(db, days, getUsdBrlRate(), plan);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao montar resumo: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
  const model = getSetting<string>(db, "insights.model") ?? "claude-sonnet-4-6";

  // Cache hit — evita queimar rate limit em cliques rápidos.
  const key = `${model}|${summaryHash(summary)}`;
  if (!force) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return NextResponse.json({
        insights: cached.text,
        summary,
        model: cached.model,
        cached: true,
        cacheAgeSeconds: Math.floor((Date.now() - cached.createdAt) / 1000),
      });
    }
  }

  let client;
  try {
    client = await makeHaikuClient(db, { model });
  } catch (err) {
    if (err instanceof HaikuUnavailableError) {
      return NextResponse.json({ error: err.message, summary }, { status: 503 });
    }
    return NextResponse.json(
      { error: `Falha ao inicializar cliente: ${err instanceof Error ? err.message : String(err)}`, summary },
      { status: 500 },
    );
  }
  try {
    const userPrompt = `Período analisado: ${days} dias.\n\nDados completos da carteira em JSON (use apenas estes valores):\n\n${JSON.stringify(summary, null, 2)}`;
    let text: string;
    try {
      text = await client.complete({ system: SYSTEM_PROMPT, user: userPrompt, maxTokens: 1400 });
    } catch (firstErr) {
      const e = firstErr as { status?: number };
      if (e.status === 429) {
        await new Promise((r) => setTimeout(r, 5000));
        text = await client.complete({ system: SYSTEM_PROMPT, user: userPrompt, maxTokens: 1400 });
      } else {
        throw firstErr;
      }
    }
    cache.set(key, { text, model, createdAt: Date.now() });
    return NextResponse.json({ insights: text, summary, model, cached: false });
  } catch (err) {
    const e = err as { status?: number; message?: string; error?: { message?: string } };
    const msg = e.error?.message ?? e.message ?? String(err);
    const status = e.status === 429 ? 429 : e.status === 401 ? 401 : 500;
    const friendly = status === 429
      ? `Rate limit do plano (modelo "${model}"). Aguarda ~1 min ou troca pra claude-haiku-4-5-20251001 em /settings.`
      : status === 401
        ? `Token expirado/inválido. Rode "claude" em qualquer pasta pra renovar.`
        : `Falha ao gerar insights: ${msg}`;
    return NextResponse.json({ error: friendly, summary, model }, { status });
  }
}
