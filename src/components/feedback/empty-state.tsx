"use client";

import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  const t = useT();
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{title || t("states.emptyTitle")}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description ?? t("states.emptyDescription")}</p>
      </div>
      {action}
    </div>
  );
}
