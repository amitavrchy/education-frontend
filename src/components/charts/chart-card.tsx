import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Consistent frame for every chart. */
export function ChartCard({ title, description, action, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn("h-72")}>{children}</CardContent>
    </Card>
  );
}
