"use client";

import { Loader2 } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ label, className }: { label?: string; className?: string }) {
  const t = useT();
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 text-muted-foreground", className)}>
      <Loader2 className="size-5 animate-spin" />
      <span className="text-sm">{label ?? t("common.loading")}</span>
    </div>
  );
}
