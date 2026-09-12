// DEALMAP Smart Deal Engine — configurable weights.
// Admin-editable from /admin/collector. Weights normalize to 100 at scoring time.
// New module: no existing file is modified.
import { readCollector, saveCollector } from "../collector/store";

export interface FactorDef { key: string; label: string; def: number; }

export const FACTORS: FactorDef[] = [
  { key: "priceVsMarket", label: "Price vs market", def: 25 },
  { key: "savings", label: "Savings %", def: 10 },
  { key: "history", label: "Historical position", def: 10 },
  { key: "condition", label: "Condition", def: 10 },
  { key: "warranty", label: "Warranty", def: 8 },
  { key: "age", label: "Device age", def: 7 },
  { key: "specs", label: "Performance / specs", def: 8 },
  { key: "ramStorage", label: "RAM & storage", def: 5 },
  { key: "availability", label: "Availability", def: 4 },
  { key: "store", label: "Store reliability", def: 6 },
  { key: "returns", label: "Return policy", def: 3 },
  { key: "region", label: "Region / version fit", def: 2 },
  { key: "costs", label: "Extra costs", def: 1 },
  { key: "ratings", label: "User ratings", def: 1 },
];

export function defaultWeights(): Record<string, number> {
  return Object.fromEntries(FACTORS.map((f) => [f.key, f.def]));
}

export async function getWeights(): Promise<Record<string, number>> {
  const db = await readCollector();
  const base = defaultWeights();
  for (const k of Object.keys(base)) {
    const v = db.weights[k];
    base[k] = typeof v === "number" && v >= 0 ? v : base[k];
  }
  return base;
}

export async function saveWeights(next: Record<string, number>): Promise<Record<string, number>> {
  const base = defaultWeights();
  const clean: Record<string, number> = {};
  for (const k of Object.keys(base)) {
    const v = next[k];
    clean[k] = typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, 1000) : base[k];
  }
  const db = await readCollector();
  db.weights = clean;
  await saveCollector(db);
  return clean;
}
