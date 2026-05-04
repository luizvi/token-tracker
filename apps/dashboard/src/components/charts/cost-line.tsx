"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import {
  AXIS_TICK_STYLE,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_CURSOR_FILL,
} from "./chart-theme";

export function CostLine({
  data,
  unit = "$",
}: {
  data: Array<{ date: string; cost: number }>;
  unit?: string;
}) {
  const formatter = (v: number) => `${unit}${v.toFixed(v < 1 ? 4 : 2)}`;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="costLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border-primary)" strokeOpacity={0.3} vertical={false} />
        <XAxis dataKey="date" tick={AXIS_TICK_STYLE} stroke="var(--color-border-primary)" />
        <YAxis tick={AXIS_TICK_STYLE} stroke="var(--color-border-primary)" tickFormatter={(v) => `${unit}${v}`} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ stroke: "var(--color-accent)", strokeOpacity: 0.3, strokeWidth: 1 }}
          formatter={(v: number) => [formatter(v), "Custo"]}
        />
        <Line
          type="monotone"
          dataKey="cost"
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: "var(--color-accent)", stroke: "var(--color-bg-card)", strokeWidth: 2 }}
          fill="url(#costLineGrad)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
