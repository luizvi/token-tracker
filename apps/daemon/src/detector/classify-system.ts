/**
 * Classifica tasks como `category="system"` quando geradas por hooks/agents/plugins.
 * Heurística: primeira user msg começa com padrões típicos de prompts automatizados.
 */

import { listTasks, updateTask, type DbClient, type TaskRow } from "@tracker/db";

// Padrões case-insensitive — match no início da mensagem (200 primeiros chars).
export const SYSTEM_TASK_PATTERNS: RegExp[] = [
  /^you['']?re? (a |an )?claude[- ]mem/i,
  /^you are (a |an )?(specialized )?claude[- ]mem/i,
  /^you are (a |an )?agent\b/i,
  /^you are (a |an )?(specialized )?(tool|agent|hook|assistant) (named|called)/i,
  /^<system>/i,
  /^run this hook/i,
  /^extract (memories|insights|observations) from/i,
  /^summari[sz]e (this|the) (session|conversation|transcript)/i,
  /^analyze (this|the) (codebase|repository|project) and/i,
  /^you (will|should) (analyze|extract|summari[sz]e|generate)/i,
  /^based on (the|this) (transcript|conversation|session)/i,
  /^\[task\]/i,
  /^\[hook\]/i,
  /\b(automatic|auto-generated|machine-generated) (analysis|summary|extraction)\b/i,
  /^role:\s*system\b/i,
  /^output schema:/i,
];

export function isSystemTaskTitle(title: string): boolean {
  const head = title.slice(0, 200);
  return SYSTEM_TASK_PATTERNS.some((p) => p.test(head));
}

/**
 * Classifica todas as tasks existentes. Útil em backfill ou após mudar regras.
 */
export function classifyAllSystemTasks(db: DbClient): { reclassified: number; total: number } {
  const all = listTasks(db, {});
  let reclassified = 0;
  for (const t of all) {
    const isSystem = isSystemTaskTitle(t.title);
    const newCategory = isSystem ? "system" : null;
    // Só atualiza se mudou (evita updates inúteis)
    if (t.category !== newCategory) {
      // Não sobrescreve categorias setadas pelo Haiku (refined) que não sejam "system"
      if (t.refinedByHaiku && t.category && t.category !== "system" && !isSystem) continue;
      updateTask(db, t.id, { category: newCategory });
      reclassified++;
    }
  }
  return { reclassified, total: all.length };
}

/**
 * Classifica uma task individual durante criação no detector.
 */
export function classifyTaskOnCreate(task: TaskRow): "system" | null {
  return isSystemTaskTitle(task.title) ? "system" : null;
}
