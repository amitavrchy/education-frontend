"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { useL } from "@/i18n";
import { cn } from "@/lib/utils";

/** Password field with a show/hide toggle. Label/aria props (from <Field>) land on the real input. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const l = useL();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? l("পাসওয়ার্ড লুকান", "Hide password") : l("পাসওয়ার্ড দেখুন", "Show password")}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
