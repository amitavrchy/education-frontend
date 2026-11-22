"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartDatum = Record<string, string | number>;

interface AreaTrendChartProps {
  data: ChartDatum[];
  xKey: string;
  yKey: string;
  /** CSS color, defaults to the primary chart token. */
  color?: string;
}

/** Single-series area chart themed with the design tokens (works in light and dark). */
export function AreaTrendChart({
  data,
  xKey,
  yKey,
  color = "var(--chart-1)",
}: AreaTrendChartProps) {
  const gradientId = `gradient-${yKey}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--popover-foreground)",
          }}
        />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
