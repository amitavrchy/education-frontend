"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/types";

export interface FilterDefinition {
  key: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

interface FilterPanelProps {
  filters: FilterDefinition[];
  values: Record<string, string | undefined>;
  onChange: (key: string, value: string | undefined) => void;
  onReset?: () => void;
  className?: string;
}

const ALL = "__all__";

/** Controlled set of select filters. The parent owns the values (state or URL params). */
export function FilterPanel({ filters, values, onChange, onReset, className }: FilterPanelProps) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {filters.map((filter) => (
        <div key={filter.key} className="flex min-w-40 flex-col gap-1.5">
          <Label htmlFor={`filter-${filter.key}`} className="text-xs text-muted-foreground">
            {filter.label}
          </Label>
          <Select
            value={values[filter.key] ?? ALL}
            onValueChange={(value) => onChange(filter.key, value === ALL ? undefined : value)}
          >
            <SelectTrigger id={`filter-${filter.key}`} className="w-full">
              <SelectValue placeholder={filter.placeholder ?? "সব"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>সব</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {onReset && (
        <Button variant="ghost" onClick={onReset}>
          <RotateCcw /> রিসেট
        </Button>
      )}
    </div>
  );
}
