// DEALMAP Collector — transparency labels.
// Every important fact in the collector/smart-deal pipeline carries one of these.
// New module: no existing file is modified.

export type InfoLabel = "Verified" | "Reported" | "Estimated" | "Unknown";

export interface Labeled<T> {
  value: T | null;
  label: InfoLabel;
  note?: string;
}

export function unknown<T>(note?: string): Labeled<T> {
  return { value: null, label: "Unknown", note };
}

export function labeled<T>(value: T | null | undefined, label: InfoLabel, note?: string): Labeled<T> {
  if (value === null || value === undefined || value === "") return { value: null, label: "Unknown", note };
  return { value, label, note };
}

/** Merge rule: Verified wins over Reported wins over Estimated wins over Unknown. */
const RANK: Record<InfoLabel, number> = { Unknown: 0, Estimated: 1, Reported: 2, Verified: 3 };

export function weaker(a: InfoLabel, b: InfoLabel): InfoLabel {
  return RANK[a] <= RANK[b] ? a : b;
}
