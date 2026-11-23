"use client";

import { ChevronDown, FlaskConical } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useT } from "@/i18n";
import { demoAccountList } from "@/services/auth.service";

/** Demo credentials helper (clearly labelled; development/testing only). */
export function DemoAccounts({ onPick }: { onPick: (identifier: string) => void }) {
  const t = useT();
  return (
    <Collapsible className="rounded-xl border border-dashed bg-muted/40">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
        <FlaskConical className="size-4 text-info" />
        <span className="flex-1">{t("auth.demoAccounts")}</span>
        <ChevronDown className="size-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <p className="mb-2 text-xs text-muted-foreground">{t("auth.demoAccountsHint")}</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {demoAccountList.map((a) => (
            <button
              key={a.role}
              type="button"
              onClick={() => onPick(a.email)}
              className="rounded-lg border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="block font-medium">{t(`roles.${a.role}`)}</span>
              <span className="block truncate text-muted-foreground">{a.email}</span>
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
