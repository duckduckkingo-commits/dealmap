export const DEFAULT_CURRENCY = "MAD";
export const DEFAULT_COUNTRY = "MA";

export function formatPrice(value: number | null | undefined, currency = DEFAULT_CURRENCY, locale = "fr-MA"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${Math.round(value)} ${currency}`;
  }
}

export function formatDate(iso: string | null | undefined, locale = "fr-MA"): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}
