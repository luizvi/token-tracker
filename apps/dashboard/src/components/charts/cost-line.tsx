"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function CostLine({ data }: { data: Array<{ date: string; cost: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="cost" stroke="#1fe879" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
