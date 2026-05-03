export const DEFAULT_REFINE_SYSTEM = `Você analisa transcripts de sessões do Claude Code e produz um título conciso e descritivo (máximo 60 caracteres) e uma categoria.

REGRAS DE LÍNGUA — críticas:
- O título DEVE estar em português brasileiro.
- Use verbos no infinitivo ou substantivos diretos. Exemplo: "ajustar dashboard", "fix bug login", "refatorar pricing", "investigar lentidão API".
- Se o transcript estiver em inglês, traduza para PT-BR mantendo termos técnicos (Bug, Refactor, API, etc.) quando fizer sentido.
- NUNCA devolva título em inglês puro.

Categorias permitidas: feature, hotfix, refactor, research, infra, docs, debug, other.

Responda APENAS com JSON no formato: {"title": "...", "category": "..."}
Sem explicações, sem comentários, sem markdown, sem prefixos.`;

export const DEFAULT_ESTIMATE_SYSTEM = `Você é um desenvolvedor sênior. Estime quantas horas um humano experiente levaria para completar a tarefa descrita SEM usar IA.

Considere:
- complexidade técnica
- tamanho da mudança
- risco de edge cases
- tempo de testes

REGRAS DE LÍNGUA — críticas:
- O campo "reasoning" DEVE estar em português brasileiro, com 1-2 frases curtas.
- Termos técnicos (API, refactor, hotfix, etc.) podem ficar em inglês quando naturais.

Responda APENAS com JSON: {"hours": <número>, "reasoning": "<1-2 frases em PT-BR>"}`;

// Prompts efetivos: mutáveis em runtime via setRefinerPrompts (ver settings).
let REFINE_SYSTEM = DEFAULT_REFINE_SYSTEM;
let ESTIMATE_SYSTEM = DEFAULT_ESTIMATE_SYSTEM;

export function setRefinerPrompts(opts: { refine?: string | null; estimate?: string | null }): void {
  REFINE_SYSTEM = opts.refine?.trim() ? opts.refine : DEFAULT_REFINE_SYSTEM;
  ESTIMATE_SYSTEM = opts.estimate?.trim() ? opts.estimate : DEFAULT_ESTIMATE_SYSTEM;
}

export function getRefinerPrompts(): { refine: string; estimate: string } {
  return { refine: REFINE_SYSTEM, estimate: ESTIMATE_SYSTEM };
}

export interface RefineInput {
  projectName: string;
  messages: Array<{ role: string; text: string }>;
}

export function buildRefinePrompt(input: RefineInput): { system: string; user: string } {
  const transcript = input.messages
    .slice(0, 30)
    .map((m) => `[${m.role}] ${m.text.slice(0, 800)}`)
    .join("\n\n");
  return {
    system: REFINE_SYSTEM,
    user: `Projeto: ${input.projectName}\n\nTranscript (até 30 msgs, truncadas):\n\n${transcript}`,
  };
}

export interface RefineOutput {
  title: string | null;
  category: string | null;
}

export function parseRefineResponse(text: string): RefineOutput {
  const json = extractJson(text);
  if (!json) return { title: null, category: null };
  return {
    title: typeof json["title"] === "string" ? json["title"] : null,
    category: typeof json["category"] === "string" ? json["category"] : null,
  };
}

export interface EstimateInput {
  title: string;
  description?: string;
  filesTouched?: string[];
}

export function buildEstimatePrompt(input: EstimateInput): { system: string; user: string } {
  const filesStr = input.filesTouched?.length
    ? `\n\nArquivos tocados:\n${input.filesTouched.slice(0, 20).join("\n")}`
    : "";
  return {
    system: ESTIMATE_SYSTEM,
    user: `Tarefa: ${input.title}${input.description ? `\n\nDescrição: ${input.description}` : ""}${filesStr}`,
  };
}

export interface EstimateOutput {
  hours: number | null;
  reasoning: string | null;
}

export function parseEstimateResponse(text: string): EstimateOutput {
  const json = extractJson(text);
  if (!json) return { hours: null, reasoning: null };
  const hours = typeof json["hours"] === "number" ? json["hours"] : null;
  return {
    hours,
    reasoning: typeof json["reasoning"] === "string" ? json["reasoning"] : null,
  };
}

function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  // Tenta direto primeiro
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch { /* continue */ }
  // Tenta extrair de markdown ```json ... ```
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1]!) as Record<string, unknown>;
    } catch { /* continue */ }
  }
  // Tenta extrair primeiro objeto {...}
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as Record<string, unknown>;
    } catch { /* continue */ }
  }
  return null;
}
