"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

/** Categorical palette from design tokens (themed for light/dark/high-contrast). */
export const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

type Datum = Record<string, string | number | null | undefined>;
export interface Series {
  key: string;
  label: string;
  color?: string;
}

const axis = { tickLine: false, axisLine: false, tick: { fill: "var(--muted-foreground)", fontSize: 12 } } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--popover-foreground)", fontSize: 12 },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
};

/** Screen-reader table mirroring the chart data (charts are otherwise visual-only). */
function SrTable({ data, x, series, label }: { data: Datum[]; x: string; series: Series[]; label: string }) {
  return (
    <table className="sr-only">
      <caption>{label}</caption>
      <thead>
        <tr>
          <th>{x}</th>
          {series.map((s) => (
            <th key={s.key}>{s.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={i}>
            <td>{String(d[x])}</td>
            {series.map((s) => (
              <td key={s.key}>{String(d[s.key] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Frame({ height, label, children, table }: { height: number; label: string; children: ReactNode; table: ReactNode }) {
  return (
    <figure className="w-full" style={{ height }} aria-label={label}>
      <div aria-hidden className="size-full">
        {children}
      </div>
      {table}
    </figure>
  );
}

export function TrendChart({ data, x, series, height = 240, label, area = true, yDomain, unit }: { data: Datum[]; x: string; series: Series[]; height?: number; label: string; area?: boolean; yDomain?: [number, number]; unit?: string }) {
  const Chart = area ? AreaChart : LineChart;
  return (
    <Frame height={height} label={label} table={<SrTable data={data} x={x} series={series} label={label} />}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color ?? SERIES[i % SERIES.length]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color ?? SERIES[i % SERIES.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={x} {...axis} minTickGap={16} />
          <YAxis {...axis} domain={yDomain} unit={unit} width={unit ? 54 : 44} />
          <Tooltip {...tooltipStyle} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) =>
            area ? (
              <Area key={s.key} type="monotone" name={s.label} dataKey={s.key} stroke={s.color ?? SERIES[i % SERIES.length]} strokeWidth={2} fill={`url(#g-${s.key})`} connectNulls />
            ) : (
              <Line key={s.key} type="monotone" name={s.label} dataKey={s.key} stroke={s.color ?? SERIES[i % SERIES.length]} strokeWidth={2} dot={false} connectNulls />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function BarsChart({ data, x, series, height = 240, label, horizontal, stacked, unit, colorByValue }: { data: Datum[]; x: string; series: Series[]; height?: number; label: string; horizontal?: boolean; stacked?: boolean; unit?: string; colorByValue?: (v: number) => string }) {
  return (
    <Frame height={height} label={label} table={<SrTable data={data} x={x} series={series} label={label} />}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: horizontal ? 8 : -12, bottom: 0 }}>
          <CartesianGrid vertical={!!horizontal} horizontal={!horizontal} stroke="var(--border)" />
          {horizontal ? (
            <>
              <XAxis type="number" {...axis} unit={unit} />
              <YAxis type="category" dataKey={x} {...axis} width={120} interval={0} />
            </>
          ) : (
            <>
              <XAxis dataKey={x} {...axis} interval={0} minTickGap={4} />
              <YAxis {...axis} unit={unit} width={unit ? 54 : 44} />
            </>
          )}
          <Tooltip {...tooltipStyle} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? SERIES[i % SERIES.length]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId={stacked ? "a" : undefined} maxBarSize={36}>
              {colorByValue && data.map((d, j) => <Cell key={j} fill={colorByValue(Number(d[s.key] ?? 0))} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function DonutChart({ data, height = 200, label, centerLabel }: { data: { name: string; value: number; color?: string }[]; height?: number; label: string; centerLabel?: ReactNode }) {
  return (
    <div className="relative">
      <Frame height={height} label={label} table={<SrTable data={data} x="name" series={[{ key: "value", label }]} label={label} />}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
              {data.map((d, i) => (
                <Cell key={d.name} fill={d.color ?? SERIES[i % SERIES.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </Frame>
      {centerLabel && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">{centerLabel}</div>}
    </div>
  );
}

export function RadarSkill({ data, x, series, height = 260, label }: { data: Datum[]; x: string; series: Series[]; height?: number; label: string }) {
  return (
    <Frame height={height} label={label} table={<SrTable data={data} x={x} series={series} label={label} />}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey={x} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          {series.map((s, i) => (
            <Radar key={s.key} name={s.label} dataKey={s.key} stroke={s.color ?? SERIES[i % SERIES.length]} fill={s.color ?? SERIES[i % SERIES.length]} fillOpacity={0.2} />
          ))}
          <Tooltip {...tooltipStyle} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

/** Tiny inline trend (no axes). */
export function Sparkline({ values, className, color = "var(--chart-1)" }: { values: number[]; className?: string; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn("h-8 w-24", className)} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** 0–100 value → sequential colour (red → amber → green), used by heatmaps and mastery bars. */
export function masteryColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return "var(--muted)";
  if (v >= 80) return "oklch(0.62 0.15 150)";
  if (v >= 65) return "oklch(0.72 0.14 135)";
  if (v >= 50) return "oklch(0.8 0.14 90)";
  if (v >= 35) return "oklch(0.72 0.16 55)";
  return "oklch(0.62 0.2 27)";
}
