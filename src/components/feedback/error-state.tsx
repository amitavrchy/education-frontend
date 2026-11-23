"use client";

import { RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useL, useT } from "@/i18n";
import { errorText } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/api-error";

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({ title, description, error, onRetry, className, compact }: ErrorStateProps) {
  const t = useT();
  const l = useL();
  const offline = error instanceof ApiError && (error.code === "OFFLINE" || error.isNetworkError);
  const Icon = offline ? WifiOff : TriangleAlert;
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-4 px-6 text-center", compact ? "py-8" : "py-16", className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icon className="size-7" />
      </span>
      <div className="space-y-1">
        <h2 className="text-h3">{title ?? t("states.errorTitle")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description ?? (error ? errorText(error, l) : t("states.errorDescription"))}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw /> {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
