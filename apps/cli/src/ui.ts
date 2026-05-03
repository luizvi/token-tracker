import kleur from "kleur";

export const ui = {
  success: (msg: string) => console.log(kleur.green(`✓ ${msg}`)),
  info: (msg: string) => console.log(kleur.cyan(msg)),
  warn: (msg: string) => console.log(kleur.yellow(`⚠ ${msg}`)),
  error: (msg: string) => console.error(kleur.red(`✗ ${msg}`)),
  dim: (msg: string) => console.log(kleur.dim(msg)),

  table(rows: Array<Record<string, string | number>>) {
    if (rows.length === 0) {
      console.log(kleur.dim("(sem dados)"));
      return;
    }
    const keys = Object.keys(rows[0]!);
    const widths: Record<string, number> = {};
    for (const k of keys) {
      widths[k] = Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length));
    }
    const header = keys.map((k) => k.padEnd(widths[k]!)).join("  ");
    console.log(kleur.bold(header));
    console.log(kleur.dim(keys.map((k) => "─".repeat(widths[k]!)).join("  ")));
    for (const r of rows) {
      console.log(keys.map((k) => String(r[k] ?? "").padEnd(widths[k]!)).join("  "));
    }
  },

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m < 60) return `${m}m${s.toString().padStart(2, "0")}s`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h${mm.toString().padStart(2, "0")}m`;
  },

  formatUsd(amount: number): string {
    return `$${amount.toFixed(amount < 1 ? 4 : 2)}`;
  },
};
