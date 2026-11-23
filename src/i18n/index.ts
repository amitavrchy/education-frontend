import { useCallback, useMemo } from "react";
import { usePreferencesStore, type Locale } from "@/stores/preferences-store";
import { bn } from "./messages/bn";
import { en } from "./messages/en";
import type { MessageKey, Messages, MessageVars } from "./types";

export type { MessageKey, Messages, MessageVars } from "./types";
export type { Locale } from "@/stores/preferences-store";

export const dictionaries: Record<Locale, Messages> = { bn, en };

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function localizeDigits(value: string | number, locale: Locale, latinOnly = false): string {
  const text = String(value);
  if (locale !== "bn" || latinOnly) return text;
  return text.replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

/** Pure translator — usable outside React (tests, services that build notification text). */
export function translate(locale: Locale, key: MessageKey, vars?: MessageVars, latinDigits = false): string {
  const template = lookup(dictionaries[locale], key) ?? lookup(dictionaries.bn, key) ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? localizeDigits(vars[name], locale, latinDigits) : `{${name}}`,
  );
}

export function useLocale(): Locale {
  return usePreferencesStore((s) => s.locale);
}

export function useT() {
  const locale = useLocale();
  const latin = usePreferencesStore((s) => s.digits === "latin");
  return useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(locale, key, vars, latin),
    [locale, latin],
  );
}

/** Locale-aware formatting. Bangla UI uses bn-BD (Bangla digits) unless the user prefers Latin digits. */
export function useFormat() {
  const locale = useLocale();
  const latin = usePreferencesStore((s) => s.digits === "latin");
  return useMemo(() => {
    const intl = locale === "bn" && !latin ? "bn-BD" : locale === "bn" ? "en-BD" : "en-GB";
    return {
      locale,
      intl,
      digits: (v: string | number) => localizeDigits(v, locale, latin),
      number: (v: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(intl, opts).format(v),
      percent: (v: number, digits = 0) =>
        new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: digits }).format(v / 100),
      currency: (v: number) =>
        new Intl.NumberFormat(intl, { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(v),
      date: (v: string | Date | number, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) =>
        new Intl.DateTimeFormat(intl, { timeZone: "Asia/Dhaka", ...opts }).format(new Date(v)),
      time: (v: string | Date | number) =>
        new Intl.DateTimeFormat(intl, { timeZone: "Asia/Dhaka", timeStyle: "short" }).format(new Date(v)),
      relative: (v: string | Date | number) => formatRelative(new Date(v), intl),
      duration: (minutes: number) => formatDuration(minutes, locale, latin),
      /** Pick the right language from a bilingual content field. */
      pick: <T extends { bn: string; en: string }>(field: T | undefined) => (field ? field[locale] || field.bn : ""),
    };
  }, [locale, latin]);
}

function formatRelative(date: Date, intl: string): string {
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

function formatDuration(minutes: number, locale: Locale, latin: boolean): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const text =
    locale === "bn"
      ? `${h ? `${h} ঘণ্টা ` : ""}${m || !h ? `${m} মিনিট` : ""}`
      : `${h ? `${h}h ` : ""}${m || !h ? `${m}m` : ""}`;
  return localizeDigits(text.trim(), locale, latin);
}

/**
 * Inline bilingual strings for module-specific copy: `l("সংরক্ষণ", "Save")`.
 * Shared UI vocabulary lives in the dictionaries (useT); one-off screen copy uses this
 * so both languages stay side by side in the component.
 */
export function useL() {
  const locale = useLocale();
  return useCallback((bn: string, en: string) => (locale === "en" ? en : bn), [locale]);
}
