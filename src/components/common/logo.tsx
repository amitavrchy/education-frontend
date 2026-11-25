import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  /** Hide the wordmark (e.g. collapsed sidebar). */
  iconOnly?: boolean;
  /** For use on a primary-colored background. */
  inverted?: boolean;
  className?: string;
}

export function Logo({ href = "/", iconOnly = false, inverted = false, className }: LogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold", className)}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          inverted ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        <GraduationCap className="size-5" />
      </span>
      {!iconOnly && (
        <span className="text-lg tracking-tight">
          Shikkha<span className={inverted ? "font-bold" : "text-primary"}>AI</span>
        </span>
      )}
    </Link>
  );
}
