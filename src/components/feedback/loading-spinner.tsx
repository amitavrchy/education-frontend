import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export function LoadingSpinner({ label = "লোড হচ্ছে...", className }: LoadingSpinnerProps) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 text-muted-foreground", className)}>
      <Loader2 className="size-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
