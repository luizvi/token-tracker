"use client";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import {
  AXIS_TICK_STYLE,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_CURSOR_FILL,
  greenForIndex,
} from "./chart-theme";

function compactTokens(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

export function TokensByProjectBar({ data }: { data: Array<{ projectName: string; tokens: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--color-border-primary)" strokeOpacity={0.3} vertical={false} />
        <XAxis dataKey="projectName" tick={AXIS_TICK_STYLE} stroke="var(--color-border-primary)" />
        <YAxis tick={AXIS_TICK_STYLE} stroke="var(--color-border-primary)" tickFormatter={compactTokens} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: TOOLTIP_CURSOR_FILL }}
          formatter={(v: number) => [compactTokens(v), "Tokens"]}
        />
        <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={greenForIndex(i, data.length)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
