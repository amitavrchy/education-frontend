"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useFormat } from "@/i18n";
import { cn } from "@/lib/utils";

/** Labelled slider used by every lab. */
export function Param({ label, value, min, max, step = 1, unit, onChange, className }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; className?: string }) {
  const f = useFormat();
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-sm">
        <Label>{label}</Label>
        <span className="font-mono text-xs tabular-nums">
          {f.number(value, { maximumFractionDigits: 2 })}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  );
}

export function Readout({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: "primary" | "success" | "warning" }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-mono text-lg font-semibold tabular-nums", tone === "primary" && "text-primary", tone === "success" && "text-success", tone === "warning" && "text-warning-foreground dark:text-warning")}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

export function LabShell({ controls, children, readouts, note }: { controls: ReactNode; children: ReactNode; readouts?: ReactNode; note?: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4 rounded-xl border p-4">{controls}</div>
      <div className="min-w-0 space-y-3">
        <div className="overflow-hidden rounded-xl border bg-card">{children}</div>
        {readouts && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{readouts}</div>}
        {note && <div className="rounded-lg bg-muted/50 p-3 text-sm">{note}</div>}
      </div>
    </div>
  );
}

/** SVG plot area with axes. `toX/toY` map data → pixels. */
export function Axes({ w, h, xRange, yRange, children, xLabel, yLabel, grid = true }: { w: number; h: number; xRange: [number, number]; yRange: [number, number]; children: (toX: (x: number) => number, toY: (y: number) => number) => ReactNode; xLabel?: string; yLabel?: string; grid?: boolean }) {
  const pad = 32;
  const toX = (x: number) => pad + ((x - xRange[0]) / (xRange[1] - xRange[0])) * (w - pad * 1.5);
  const toY = (y: number) => h - pad - ((y - yRange[0]) / (yRange[1] - yRange[0])) * (h - pad * 1.5);
  const ticks = (a: number, b: number) => {
    const span = b - a;
    const step = span > 40 ? 10 : span > 16 ? 5 : span > 6 ? 2 : span > 3 ? 1 : 0.5;
    const out: number[] = [];
    for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
    return out;
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={yLabel ? `${yLabel} vs ${xLabel}` : "graph"}>
      {grid &&
        ticks(...xRange).map((t) => <line key={`gx${t}`} x1={toX(t)} x2={toX(t)} y1={toY(yRange[0])} y2={toY(yRange[1])} stroke="var(--border)" strokeWidth={t === 0 ? 1.5 : 0.6} />)}
      {grid && ticks(...yRange).map((t) => <line key={`gy${t}`} y1={toY(t)} y2={toY(t)} x1={toX(xRange[0])} x2={toX(xRange[1])} stroke="var(--border)" strokeWidth={t === 0 ? 1.5 : 0.6} />)}
      {ticks(...xRange).map((t) => (
        <text key={`tx${t}`} x={toX(t)} y={h - pad + 14} fontSize="10" textAnchor="middle" fill="var(--muted-foreground)">
          {t}
        </text>
      ))}
      {ticks(...yRange).map((t) => (
        <text key={`ty${t}`} x={pad - 6} y={toY(t) + 3} fontSize="10" textAnchor="end" fill="var(--muted-foreground)">
          {t}
        </text>
      ))}
      {xLabel && (
        <text x={w - 8} y={h - 6} fontSize="11" textAnchor="end" fill="var(--muted-foreground)">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text x={6} y={12} fontSize="11" fill="var(--muted-foreground)">
          {yLabel}
        </text>
      )}
      {children(toX, toY)}
    </svg>
  );
}

export function pathFrom(points: [number, number][]) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}
