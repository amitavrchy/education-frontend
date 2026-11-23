"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";
import { useT } from "@/i18n";

/** Persistent but dismissible reminder that all data is synthetic and AI/payments are simulated (§49). */
export function DemoBanner() {
  const t = useT();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="no-print flex items-center gap-2 bg-info/10 px-4 py-1.5 text-xs text-foreground sm:px-6">
      <Info className="size-3.5 shrink-0 text-info" />
      <span className="flex-1">{t("shell.demoBanner")}</span>
      <button type="button" onClick={() => setHidden(true)} aria-label={t("common.close")} className="rounded p-0.5 hover:bg-muted">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
