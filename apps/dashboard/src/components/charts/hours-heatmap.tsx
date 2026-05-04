"use client";
import { useMemo } from "react";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function colorFor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "var(--color-bg-tertiary)";
  const ratio = Math.min(1, value / max);
  const pct = (8 + ratio * 92).toFixed(1);
  return `color-mix(in srgb, var(--color-accent) ${pct}%, transparent)`;
}

export function HoursHeatmap({ matrix }: { matrix: number[][] }) {
  const max = useMemo(() => {
    let m = 0;
    for (const row of matrix) for (const v of row) if (v > m) m = v;
    return m;
  }, [matrix]);

  return (
    <div className="text-xs">
      <div className="grid grid-cols-[28px_repeat(24,minmax(0,1fr))] gap-[2px] items-center">
        <div></div>
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} className="text-text-muted text-center font-mono text-[9px]">
            {h % 3 === 0 ? h : ""}
          </div>
        ))}
        {DAYS.map((day, d) => (
          <>
            <div key={`label-${d}`} className="text-text-muted font-mono text-[10px] pr-1 text-right">
              {day}
            </div>
            {Array.from({ length: 24 }).map((_, h) => {
              const value = matrix[d]?.[h] ?? 0;
              return (
                <div
                  key={`${d}-${h}`}
                  className="aspect-square rounded-[3px] transition-transform hover:scale-110"
                  style={{ background: colorFor(value, max) }}
                  title={`${day} ${h}h — ${value.toFixed(2)}h`}
                />
              );
            })}
          </>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-text-muted">
        <span>menos</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => (
          <div key={r} className="w-4 h-3 rounded-[2px]" style={{ background: colorFor(r * max, max) }} />
        ))}
        <span>mais</span>
        <span className="ml-auto font-mono">pico: {max.toFixed(1)}h</span>
      </div>
    </div>
  );
}
