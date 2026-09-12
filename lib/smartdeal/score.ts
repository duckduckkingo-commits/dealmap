// DEALMAP Smart Deal Engine — transparent multi-factor score (/100).
// Price ALONE never decides: specs, condition, warranty, history, store,
// availability, region, costs and ratings all contribute with visible weights.
// Unknown inputs stay neutral AND are disclosed (never invented, never hidden).
// Reuses the existing market engine (dealScoreEngine/marketStats) as ONE input.
// New module: no existing file is modified.
import type { InfoLabel } from "../collector/labels";
import { FACTORS } from "./weights";

export type Verdict = "Excellent Deal" | "Good Deal" | "Fair Price" | "Expensive" | "Very Expensive";
export type Recommendation = "BUY" | "GOOD DEAL" | "CONSIDER" | "AVOID";

export interface FactorInput {
  /** 0..1 (1 = best). Null = unknown → neutral, disclosed. */
  score: number | null;
  label: InfoLabel;
  note: string;
}

export interface ScoreInput {
  priceVsMarket: FactorInput;
  savings: FactorInput;
  history: FactorInput;
  condition: FactorInput;
  warranty: FactorInput;
  age: FactorInput;
  specs: FactorInput;
  ramStorage: FactorInput;
  availability: FactorInput;
  store: FactorInput;
  returns: FactorInput;
  region: FactorInput;
  costs: FactorInput;
  ratings: FactorInput;
}

export interface FactorResult {
  key: string; label: string; weight: number;
  score: number | null; infoLabel: InfoLabel; note: string;
}

export interface SmartScore {
  score: number;
  verdict: Verdict;
  recommendation: Recommendation;
  reasons: string[];
  redFlags: string[];
  factors: FactorResult[];
  coverage: number;
  confidence: "High" | "Medium" | "Low";
}

export function verdictFor(score: number): Verdict {
  if (score >= 90) return "Excellent Deal";
  if (score >= 75) return "Good Deal";
  if (score >= 55) return "Fair Price";
  if (score >= 35) return "Expensive";
  return "Very Expensive";
}

/** Builders: turn raw evidence into labeled 0..1 factor inputs. Unknown stays null. */
export const f = {
  ratio(observed: number | null, good: number, bad: number, note: string, label: InfoLabel): FactorInput {
    if (observed === null || !Number.isFinite(observed)) return { score: null, label: "Unknown", note: `${note} (unknown)` };
    const t = Math.min(1, Math.max(0, (bad - observed) / Math.max(1e-9, bad - good)));
    return { score: Math.round(t * 100) / 100, label, note };
  },
  fixed(score: number | null, label: InfoLabel, note: string): FactorInput {
    return score === null ? { score: null, label: "Unknown", note: `${note} (unknown)` } : { score, label, note };
  },
};

export function computeSmartScore(input: ScoreInput, weights: Record<string, number>): SmartScore {
  const totalW = FACTORS.reduce((s, d) => s + (weights[d.key] ?? d.def), 0) || 1;
  const factors: FactorResult[] = [];
  let weighted = 0;
  let knownW = 0;
  const unknownKeys: string[] = [];

  for (const def of FACTORS) {
    const w = (weights[def.key] ?? def.def) / totalW;
    const fi = input[def.key as keyof ScoreInput];
    factors.push({ key: def.key, label: def.label, weight: Math.round(w * 1000) / 10, score: fi.score, infoLabel: fi.score === null ? "Unknown" : fi.label, note: fi.note });
    if (fi.score === null) {
      unknownKeys.push(def.label);
      weighted += 0.5 * w; // neutral placeholder, always disclosed
    } else {
      weighted += fi.score * w;
      knownW += w;
    }
  }

  let score = Math.round(weighted * 100);
  const coverage = Math.round(knownW * 100) / 100;
  const reasons: string[] = [];
  const redFlags: string[] = [];

  // Hard evidence first.
  const byKey = Object.fromEntries(factors.map((x) => [x.key, x]));
  const push = (k: string) => { const x = byKey[k]; if (x.score !== null) reasons.push(`${x.label}: ${x.note}`); };
  ["priceVsMarket", "savings", "history", "condition", "warranty"].forEach(push);

  // Red flags (explicit, never guessed).
  if (input.condition.score !== null && input.condition.score <= 0.25) redFlags.push(`Condition concern: ${input.condition.note}`);
  if (input.warranty.score !== null && input.warranty.score <= 0.2) redFlags.push(`Warranty concern: ${input.warranty.note}`);
  if (input.store.score !== null && input.store.score <= 0.2) redFlags.push(`Store reliability concern: ${input.store.note}`);

  // Low-evidence guard: thin data can never look good OR bad — it reads Fair/CONSIDER.
  let capped = false;
  if (coverage < 0.4) {
    if (score > 60) { score = 60; capped = true; }
  }
  if (unknownKeys.length) reasons.push(`Unknown (${unknownKeys.length}): ${unknownKeys.slice(0, 5).join(", ")}${unknownKeys.length > 5 ? "…" : ""} — treated neutrally, verify before buying.`);
  if (capped) reasons.push("Capped at Fair Price: too little verified evidence to judge either way.");

  const verdict = coverage < 0.4 ? "Fair Price" : verdictFor(score);
  let recommendation: Recommendation;
  if (coverage < 0.4) recommendation = "CONSIDER";
  else if (redFlags.length > 0 && score < 55) recommendation = "AVOID";
  else if (score >= 85 && coverage >= 0.6 && redFlags.length === 0) recommendation = "BUY";
  else if (score >= 75) recommendation = "GOOD DEAL";
  else if (score >= 55) recommendation = "CONSIDER";
  else recommendation = "AVOID";

  return {
    score, verdict, recommendation, reasons: reasons.slice(0, 10), redFlags,
    factors, coverage,
    confidence: coverage >= 0.7 ? "High" : coverage >= 0.4 ? "Medium" : "Low",
  };
}

/** Convenience: build common factor inputs from listing + market evidence. */
export function buildInputs(ev: {
  price: number | null;
  marketAvg: number | null; marketLow: number | null;
  histLow: number | null; histAvg: number | null; histHigh: number | null;
  condition: "new" | "used" | "refurbished" | "unknown";
  warrantyMonths: number | null;
  inStock: boolean | null;
  storeReliability: number | null;
  hasReturnPolicy: boolean | null;
  regionFit: boolean | null;
  extraCostsNote?: string;
}): ScoreInput {
  const pct = (a: number, b: number) => Math.round(((b - a) / b) * 100);
  return {
    priceVsMarket: ev.price !== null && ev.marketAvg !== null
      ? f.ratio(ev.price / ev.marketAvg, 0.85, 1.2, `${pct(ev.price, ev.marketAvg)}% ${ev.price <= ev.marketAvg ? "below" : "above"} market average`, "Reported")
      : f.fixed(null, "Unknown", "No market average"),
    savings: ev.price !== null && ev.marketAvg !== null && ev.price < ev.marketAvg
      ? f.fixed(Math.min(1, (ev.marketAvg - ev.price) / ev.marketAvg / 0.25), "Estimated", `Saves ~${pct(ev.price, ev.marketAvg)}% vs average`)
      : f.fixed(ev.price !== null && ev.marketAvg !== null ? 0.35 : null, "Unknown", "No savings vs market"),
    history: ev.price !== null && ev.histLow !== null && ev.histHigh !== null && ev.histHigh > ev.histLow
      ? f.ratio(ev.price, ev.histLow, ev.histHigh, ev.histAvg !== null ? `Now ${ev.price} vs history ${ev.histLow}–${ev.histHigh} (avg ${ev.histAvg})` : `Within history ${ev.histLow}–${ev.histHigh}`, "Reported")
      : f.fixed(null, "Unknown", "No price history"),
    condition: f.fixed(ev.condition === "new" ? 1 : ev.condition === "refurbished" ? 0.45 : ev.condition === "used" ? 0.35 : null, ev.condition === "unknown" ? "Unknown" : "Reported", `Condition: ${ev.condition}`),
    warranty: f.fixed(ev.warrantyMonths === null ? null : ev.warrantyMonths <= 0 ? 0.1 : ev.warrantyMonths < 12 ? 0.55 : 1, ev.warrantyMonths === null ? "Unknown" : "Reported", ev.warrantyMonths === null ? "Warranty unknown" : ev.warrantyMonths <= 0 ? "No warranty" : `${ev.warrantyMonths}-month warranty`),
    age: f.fixed(null, "Unknown", "Release date unknown"),
    specs: f.fixed(null, "Unknown", "Full benchmark unknown"),
    ramStorage: f.fixed(null, "Unknown", "Variant tier unverified"),
    availability: f.fixed(ev.inStock === null ? null : ev.inStock ? 1 : 0.2, ev.inStock === null ? "Unknown" : "Reported", ev.inStock === null ? "Availability unknown" : ev.inStock ? "In stock" : "Not in stock"),
    store: f.fixed(ev.storeReliability, ev.storeReliability === null ? "Unknown" : "Estimated", ev.storeReliability === null ? "Store track record unknown" : "Store track record"),
    returns: f.fixed(ev.hasReturnPolicy === null ? null : ev.hasReturnPolicy ? 0.8 : 0.3, ev.hasReturnPolicy === null ? "Unknown" : "Reported", ev.hasReturnPolicy === null ? "Return policy unknown" : ev.hasReturnPolicy ? "Returns accepted" : "No returns"),
    region: f.fixed(ev.regionFit === null ? null : ev.regionFit ? 1 : 0.3, ev.regionFit === null ? "Unknown" : "Estimated", ev.regionFit === null ? "Region/version fit unknown" : ev.regionFit ? "Region/version fits" : "Possible region/version mismatch"),
    costs: f.fixed(0.7, "Estimated", ev.extraCostsNote ?? "No extra costs reported"),
    ratings: f.fixed(null, "Unknown", "No reliable ratings"),
  };
}
