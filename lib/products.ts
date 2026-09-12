import { readDB } from "./db";
import { normalizeModel } from "./market";
import type { PriceObservation, Product } from "@/types";
import catalog from "@/data/seed.catalog.json";

export interface ProductWithMarket extends Product {
  median: number | null; count: number; min: number | null; max: number | null;
  isDemo: boolean;
}

/** REAL_ONLY mode: demo seed catalog is excluded everywhere, so only real
 * collected data is ever seen. ON by default; set DEALMAP_REAL_ONLY=false
 * only if you explicitly want the demo catalog back. */
export function realOnly(): boolean {
  return process.env.DEALMAP_REAL_ONLY !== "false";
}

export async function allProducts(): Promise<ProductWithMarket[]> {
  const db = await readDB();
  const byId = new Map<string, ProductWithMarket>();
  if (!realOnly()) {
  for (const p of (catalog as unknown as { products: { id: string; brand: string; model: string; name: string; category: string; specs: Record<string, string> }[] }).products) {
    byId.set(p.id, {
      id: p.id, brandId: "b_" + p.brand.toLowerCase(), brand: p.brand, model: p.model,
      name: p.name, categoryId: "cat", category: p.category, specs: p.specs,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      median: null, count: 0, min: null, max: null, isDemo: true,
    });
  }
  }
  for (const p of db.products) {
    byId.set(p.id, { ...p, median: null, count: 0, min: null, max: null, isDemo: false });
  }
  const obsByProduct = new Map<string, number[]>();
  const demoFlag = new Map<string, boolean>();
  const seedObs = realOnly() ? [] : (catalog as { observations: { productId: string; prices: number[] }[] }).observations;
  for (const g of seedObs) {
    if (!obsByProduct.has(g.productId)) obsByProduct.set(g.productId, []);
    obsByProduct.get(g.productId)!.push(...g.prices);
    demoFlag.set(g.productId, true);
  }
  for (const o of db.observations) {
    if (!obsByProduct.has(o.productId)) obsByProduct.set(o.productId, []);
    obsByProduct.get(o.productId)!.push(o.price);
    if (o.isDemo) demoFlag.set(o.productId, true);
  }
  for (const [id, prices] of obsByProduct) {
    const item = byId.get(id);
    if (!item) continue;
    const s = [...prices].sort((a, b) => a - b);
    item.count = s.length;
    item.min = s[0]; item.max = s[s.length - 1];
    item.median = s.length % 2 ? s[Math.floor(s.length / 2)] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
    if (demoFlag.get(id)) item.isDemo = true;
  }
  return [...byId.values()];
}

export async function searchProducts(q: string, filters: { category?: string; maxPrice?: number; condition?: string } = {}): Promise<ProductWithMarket[]> {
  const all = await allProducts();
  const nq = normalizeModel(q || "");
  return all.filter((p) => {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.maxPrice && (p.median ?? Infinity) > filters.maxPrice) return false;
    if (!nq) return true;
    const hay = normalizeModel(`${p.name} ${p.brand} ${p.model} ${p.category}`);
    return nq.split(" ").every((tok) => hay.includes(tok));
  });
}

export async function observationsFor(productId: string): Promise<PriceObservation[]> {
  const db = await readDB();
  const out: PriceObservation[] = [];
  const seed = realOnly() ? undefined : (catalog as { observations: { productId: string; prices: number[]; condition: string; location: string }[] }).observations.find((g) => g.productId === productId);
  if (seed) {
    seed.prices.forEach((price, i) => {
      const d = new Date(Date.now() - (seed.prices.length - i) * 6 * 86400000);
      out.push({
        id: `seed_${productId}_${i}`, productId, price, currency: "MAD",
        condition: seed.condition === "new" ? "new" : "used_good",
        sellerType: i % 3 === 0 ? "store" : "individual", location: seed.location,
        sourceType: "partner_feed", observedAt: d.toISOString(), createdAt: d.toISOString(),
        quality: "MEDIUM", verificationStatus: "verified", isDemo: true,
      });
    });
  }
  for (const o of db.observations.filter((o) => o.productId === productId)) out.push(o);
  return out.sort((a, b) => +new Date(a.observedAt) - +new Date(b.observedAt));
}
