"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n";
import { usePreferencesStore } from "@/stores/preferences-store";

/** Switches the whole UI between Bangla and English. */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useT();
  const set = usePreferencesStore((s) => s.set);
  const next = locale === "bn" ? "en" : "bn";
  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      onClick={() => set("locale", next)}
      aria-label={t("shell.switchLanguage")}
      title={t("shell.switchLanguage")}
    >
      {compact ? <Languages /> : <span className="font-semibold">{next === "en" ? "EN" : "বাং"}</span>}
    </Button>
  );
}
