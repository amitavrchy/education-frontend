const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Convert ASCII digits in a value to Bangla digits: 2026 → ২০২৬. */
export function toBanglaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)]);
}

/** Locale-aware number formatting with Bangla digits by default. */
export function formatNumber(value: number, locale = "bn-BD"): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Bangladeshi Taka. */
export function formatCurrency(value: number, locale = "bn-BD"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, locale = "bn-BD"): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(
    value / 100,
  );
}

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale = "bn-BD",
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
