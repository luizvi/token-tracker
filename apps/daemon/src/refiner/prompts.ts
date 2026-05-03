const REFINE_SYSTEM = `Você analisa transcripts de sessões do Claude Code e produz um título conciso (max 60 chars) e uma categoria.

Categorias possíveis: feature, hotfix, refactor, research, infra, docs, debug, other.

Responda APENAS com JSON no formato: {"title": "...", "category": "..."}
Não inclua explicações, comentários, ou markdown.`;

const ESTIMATE_SYSTEM = `Você é um sênior em desenvolvimento de software. Estime quantas horas um humano experiente levaria para completar a tarefa descrita SEM usar IA.

Considere:
- complexidade técnica
- tamanho da mudança
- risco de edge cases
- tempo de testes

Responda APENAS com JSON: {"hours": <número>, "reasoning": "<1-2 frases>"}`;

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
