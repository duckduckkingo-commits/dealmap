// DEALMAP Collector — Techspace.ma adapter (official Shopify JSON surfaces).
// Uses the store's public storefront JSON: search suggest + /products/{handle}.js
// (designed for storefront use: title, price, availability, CDN images).
// Polite, rate-limited by the caller. Missing fields stay null.
// New module: no existing file is modified.

export interface TechspaceHit {
  url: string;
  handle: string;
  name: string | null;
  price: number | null;
  oldPrice: number | null;
  image: string | null;
  available: boolean | null;
  ratingValue: number | null;
  reviewsCount: number | null;
}

export const TECHSPACE_ORIGIN = "https://www.techspace.ma";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; DEALMAP-link-analysis)" };

function abs(src: string | null): string | null {
  if (!src) return null;
  const s = src.startsWith("//") ? `https:${src}` : src;
  return /^https?:\/\//i.test(s) ? s.slice(0, 1000) : null;
}

/** MAD prices arrive in centimes (929000 = 9,290.00 dh). */
export function centimesToMad(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / 100) * 100) / 100;
}

/** Search via the official suggest endpoint. */
export async function techspaceSearch(q: string, limit = 6): Promise<TechspaceHit[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(
      `${TECHSPACE_ORIGIN}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=${limit}`,
      { headers: UA, signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!r.ok) return [];
    const j = await r.json() as { resources?: { results?: { products?: Record<string, unknown>[] } } };
    const products = j?.resources?.results?.products ?? [];
    return products.slice(0, limit).map((p) => {
      const handle = String(p.url ?? "").split("/products/")[1]?.split("?")[0] ?? null;
      const variants = Array.isArray(p.variants) ? (p.variants as Record<string, unknown>[]) : [];
      const v0 = variants[0] as Record<string, unknown> | undefined;
      const price = centimesToMad((p.price ?? v0?.price) as unknown);
      const old = centimesToMad((p.compare_at_price ?? v0?.compare_at_price) as unknown);
      return {
        url: handle ? `${TECHSPACE_ORIGIN}/products/${handle}` : String(p.url ?? ""),
        handle: handle ?? "",
        name: typeof p.title === "string" ? p.title : null,
        price,
        oldPrice: old && price && old > price ? old : null,
        image: abs(typeof p.featured_image === "string" ? p.featured_image : (p.featured_image as Record<string, unknown> | null)?.url as string ?? null),
        available: typeof p.available === "boolean" ? p.available : null,
        ratingValue: null,
        reviewsCount: null,
      };
    }).filter((h) => h.handle && h.price !== null);
  } catch {
    clearTimeout(t);
    return [];
  }
}

/** Full detail via the official per-product JSON. */
export async function techspaceDetail(handle: string): Promise<TechspaceHit | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`${TECHSPACE_ORIGIN}/products/${handle}.js`, { headers: UA, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const p = await r.json() as Record<string, unknown>;
    const variants = Array.isArray(p.variants) ? (p.variants as Record<string, unknown>[]) : [];
    const inStock = variants.length ? variants.some((v) => v.available === true) : (p.available as boolean | undefined ?? null);
    const firstAvail = variants.find((v) => v.available === true) ?? variants[0];
    const price = centimesToMad((firstAvail?.price ?? p.price) as unknown);
    const old = centimesToMad((firstAvail?.compare_at_price ?? p.compare_at_price) as unknown);
    const images = Array.isArray(p.images) ? (p.images as string[]) : [];
    return {
      url: `${TECHSPACE_ORIGIN}/products/${handle}`,
      handle,
      name: typeof p.title === "string" ? p.title : null,
      price,
      oldPrice: old && price && old > price ? old : null,
      image: abs(images[0] ?? (typeof p.featured_image === "string" ? p.featured_image : null)),
      available: typeof inStock === "boolean" ? inStock : null,
      ratingValue: null,
      reviewsCount: null,
    };
  } catch {
    clearTimeout(t);
    return null;
  }
}
