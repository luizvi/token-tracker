// Paleta de verdes (gradiente do accent base #1fe879)
export const GREEN_PALETTE = [
  "#1fe879",
  "#16d96e",
  "#0ec963",
  "#08b95a",
  "#04a850",
  "#019848",
  "#018540",
  "#017337",
];

export function greenForIndex(i: number, total: number): string {
  if (total <= 1) return GREEN_PALETTE[0]!;
  const ratio = i / Math.max(1, total - 1);
  const idx = Math.min(GREEN_PALETTE.length - 1, Math.floor(ratio * (GREEN_PALETTE.length - 1)));
  return GREEN_PALETTE[idx]!;
}

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

export const TOOLTIP_CURSOR_FILL = "rgba(31, 232, 121, 0.08)";
