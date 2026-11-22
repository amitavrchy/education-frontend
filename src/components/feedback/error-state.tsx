"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "কিছু একটা ভুল হয়েছে",
  description = "অনুগ্রহ করে আবার চেষ্টা করুন।",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 px-6 py-16 text-center", className)}>
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </span>
      <div className="space-y-1">
        <h2 className="text-h3">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw /> আবার চেষ্টা করুন
        </Button>
      )}
    </div>
  );
}
