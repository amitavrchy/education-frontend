"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  /** Called with the debounced value. */
  onSearch?: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchBar({
  placeholder = "খুঁজুন...",
  defaultValue = "",
  onSearch,
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const debounced = useDebounce(value, debounceMs);

  useEffect(() => {
    onSearch?.(debounced);
  }, [debounced, onSearch]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="মুছে ফেলুন"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
