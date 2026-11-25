"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * Accessible single-choice switch (role="radiogroup") for UI that only changes state, e.g. the
 * email/phone choice on login. Use real Tabs only when there are matching tab panels.
 */
export function SegmentedControl<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: Option<T>[]; label: string; className?: string }) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid w-full rounded-lg bg-muted p-[3px]", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      onKeyDown={(e) => {
        const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = options[(index + dir + options.length) % options.length];
        onChange(next.value);
        (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            data-value={o.value}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
              on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
