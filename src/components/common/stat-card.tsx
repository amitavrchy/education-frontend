import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  /** Positive = up (good), negative = down. */
  delta?: { value: string; positive: boolean };
  tone?: "primary" | "success" | "warning" | "info" | "destructive";
  className?: string;
}

const TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground dark:text-warning",
  info: "bg-info/15 text-info",
  destructive: "bg-destructive/10 text-destructive",
};

/** KPI tile used on every dashboard. */
export function StatCard({ label, value, icon: Icon, hint, delta, tone = "primary", className }: StatCardProps) {
  return (
    <Card className={cn("gap-2 p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", TONES[tone])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {(delta || hint) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {delta && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", delta.positive ? "text-success" : "text-destructive")}>
              {delta.positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {delta.value}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
