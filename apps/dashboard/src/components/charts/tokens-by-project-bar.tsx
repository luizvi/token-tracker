"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function TokensByProjectBar({ data }: { data: Array<{ projectName: string; tokens: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <XAxis dataKey="projectName" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="tokens" fill="#1fe879" />
      </BarChart>
    </ResponsiveContainer>
  );
}
