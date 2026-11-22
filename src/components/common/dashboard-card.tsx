import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Trend } from "@/types";

interface DashboardCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  /** e.g. "+১২%" */
  change?: string;
  trend?: Trend;
  hint?: string;
  className?: string;
}

/** KPI tile used on every portal dashboard. */
export function DashboardCard({ title, value, icon: Icon, change, trend = "neutral", hint, className }: DashboardCardProps) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {(change || hint) && (
          <div className="flex items-center gap-1.5 text-xs">
            {change && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground",
                )}
              >
                {trend === "up" && <ArrowUpRight className="size-3" />}
                {trend === "down" && <ArrowDownRight className="size-3" />}
                {change}
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
