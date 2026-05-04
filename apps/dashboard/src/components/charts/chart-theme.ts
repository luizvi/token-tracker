/**
 * Tema dos charts. Cor base = var(--color-accent) (definido inline no <html> pelo layout
 * a partir de dashboard.brandAccent). Variações geradas via color-mix com bg-card.
 */

export const ACCENT = "var(--color-accent)";

/**
 * Gradiente de variações da accent: posição 0 = accent puro,
 * posição (n-1) = accent misturado com bg-card. Pra usar em séries de barras/áreas.
 */
export function accentForIndex(i: number, total: number): string {
  if (total <= 1) return ACCENT;
  const ratio = i / Math.max(1, total - 1);
  // 0% mix = accent puro; até ~70% mix com bg-card no fim do gradiente.
  const mix = Math.round(ratio * 70);
  return `color-mix(in srgb, var(--color-accent) ${100 - mix}%, var(--color-bg-card))`;
}

/** Mantém o nome legado pra evitar churn nos componentes. */
export const greenForIndex = accentForIndex;

export const TOOLTIP_STYLE = {
  background: "var(--color-bg-card)",
  border: "1px solid var(--color-border-primary)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--color-text-primary)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
} as const;

export const TOOLTIP_ITEM_STYLE = {
  color: "var(--color-text-primary)",
} as const;

export const TOOLTIP_LABEL_STYLE = {
  color: "var(--color-text-muted)",
  fontSize: 11,
  marginBottom: 4,
} as const;

export const AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: "var(--color-text-muted)",
} as const;

export const TOOLTIP_CURSOR_FILL = "color-mix(in srgb, var(--color-accent) 8%, transparent)";
