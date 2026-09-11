import type { PriceObservation } from "@/types";

export interface MarketStats {
  count: number; median: number | null; min: number | null; max: number | null;
  p25: number | null; p75: number | null; newMedian: number | null; usedMedian: number | null;
  lastUpdated: string | null; confidenceNote: string;
}

function med(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function marketStats(observations: PriceObservation[]): MarketStats {
  const prices = observations.map((o) => o.price).filter((p) => p > 0).sort((a, b) => a - b);
  if (!prices.length) {
    return { count: 0, median: null, min: null, max: null, p25: null, p75: null, newMedian: null, usedMedian: null, lastUpdated: null, confidenceNote: "Not enough reliable data yet." };
  }
  const q = (p: number) => prices[Math.min(prices.length - 1, Math.floor(p * prices.length))];
  const news = observations.filter((o) => o.condition === "new").map((o) => o.price);
  const used = observations.filter((o) => o.condition !== "new").map((o) => o.price);
  const lastUpdated = observations.map((o) => o.observedAt).sort().at(-1) ?? null;
  return {
    count: prices.length, median: med(prices), min: prices[0], max: prices[prices.length - 1],
    p25: q(0.25), p75: q(0.75), newMedian: med(news), usedMedian: med(used),
    lastUpdated,
    confidenceNote: prices.length < 5 ? "Not enough reliable data yet." : prices.length < 12 ? "Small sample — treat with caution." : "Market-based analysis",
  };
}

export function priceHistorySeries(observations: PriceObservation[]): { date: string; median: number }[] {
  const byDay = new Map<string, number[]>();
  for (const o of [...observations].sort((a, b) => +new Date(a.observedAt) - +new Date(b.observedAt))) {
    const day = o.observedAt.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(o.price);
  }
  return [...byDay.entries()].map(([date, arr]) => ({ date, median: med(arr)! }));
}

/** Normalize product identity to avoid treating every listing title as a product. */
export function normalizeModel(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9+ ]/g, "").replace(/\s+/g, " ").trim();
}
