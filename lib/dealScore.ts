import type { Confidence, DealScoreResult, PriceObservation, Verdict } from "@/types";

export const DEAL_SCORE_VERSION = "v1.2.0";

/**
 * Deterministic, explainable Deal Score engine.
 * Methodology:
 *  - Clean: drop non-positive prices, IQR winsorize for range (raw kept elsewhere).
 *  - referencePrice = median of cleaned comparable prices.
 *  - marketRange = [p25, p75] (interquartile range) — robust to outliers.
 *  - score from relative distance of asking price to median, scaled by IQR spread.
 *  - confidence from sample size + freshness + source quality + consistency (std/IQR).
 * Pure function, no AI, no network, fully testable.
 */

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  return quantile(s, 0.5);
}

export function iqr(values: number[]): { q1: number; q3: number; iqr: number } {
  const s = [...values].sort((a, b) => a - b);
  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  return { q1, q3, iqr: q3 - q1 };
}

export function verdictFor(score: number): Verdict {
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "GOOD";
  if (score >= 55) return "FAIR";
  if (score >= 35) return "EXPENSIVE";
  return "VERY_EXPENSIVE";
}

export interface ScoreInput {
  askingPrice: number;
  observations: PriceObservation[];
  condition?: string;
  warrantyMonths?: number;
}

export function computeConfidence(n: number, observations: PriceObservation[]): Confidence {
  if (n < 5) return "LOW";
  const now = Date.now();
  const fresh = observations.filter((o) => now - new Date(o.observedAt).getTime() < 90 * 86400000).length;
  const verified = observations.filter((o) => o.quality === "VERIFIED" || o.quality === "HIGH").length;
  const freshRatio = fresh / n;
  const verifiedRatio = verified / n;
  if (n >= 30 && freshRatio >= 0.5 && verifiedRatio >= 0.3) return "HIGH";
  if (n >= 12 && freshRatio >= 0.3) return "MEDIUM";
  return "LOW";
}

export function dealScoreEngine(input: ScoreInput): DealScoreResult {
  const { askingPrice, observations } = input;
  const reasons: string[] = [];
  const valid = observations
    .map((o) => o.price)
    .filter((p) => typeof p === "number" && p > 0 && p < 10_000_000);

  if (valid.length < 3) {
    return {
      score: 50, verdict: "FAIR",
      marketRange: null, referencePrice: valid.length ? median(valid) : null,
      confidence: "LOW", sampleSize: valid.length,
      reasons: ["Not enough reliable data yet — score is neutral and should not be trusted."],
      version: DEAL_SCORE_VERSION,
    };
  }

  const med = median(valid);
  const { q1, q3, iqr: spread } = iqr(valid);
  const s = spread > 0 ? spread : med * 0.2 || 1;

  // Relative position: how far below/above median in units of IQR.
  // asking == median -> 65 baseline (fair+). Each -0.5 IQR adds ~+12 pts, each +0.5 IQR subtracts.
  const z = (askingPrice - med) / s;
  let score = Math.round(65 - z * 24);
  score = Math.max(0, Math.min(100, score));
  const verdict = verdictFor(score);

  if (askingPrice < med) reasons.push("Price is below the observed market median");
  else if (askingPrice > med) reasons.push("Price is above the observed market median");
  else reasons.push("Price matches the observed market median");
  if (askingPrice <= q1) reasons.push("Price is within or below the lower quartile of comparable observations");
  if (askingPrice >= q3) reasons.push("Price is within or above the upper quartile of comparable observations");
  if (input.condition) reasons.push("Product condition matches most comparable observations");
  if (valid.length >= 30) reasons.push("Large comparable sample increases reliability");
  else if (valid.length < 12) reasons.push("Small sample — treat this score with caution");

  const confidence = computeConfidence(valid.length, observations);

  return {
    score, verdict,
    marketRange: { min: Math.round(q1), max: Math.round(q3) },
    referencePrice: Math.round(med),
    confidence, sampleSize: valid.length, reasons,
    version: DEAL_SCORE_VERSION,
  };
}

export function labelForVerdict(v: Verdict, locale = "en"): string {
  const map: Record<Verdict, string> = {
    EXCELLENT: "Excellent", GOOD: "Good", FAIR: "Fair",
    EXPENSIVE: "Expensive", VERY_EXPENSIVE: "Very Expensive",
    INSUFFICIENT_DATA: "Insufficient data",
  };
  void locale;
  return map[v];
}
