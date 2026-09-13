// DEALMAP Collector — MyTech.ma adapter (official WooCommerce Store API).
// Uses the store's public Store API (/wp-json/wc/store/v1/products), built
// for storefront use: id, name, permalink (exact link), MAD prices
// (price/regular_price/sale_price), images, stock status. No scraping.
// Polite, rate-limited by the caller. Missing fields stay null.
// New module: no existing file is modified.

export interface MytechHit {
  url: string;
  remoteId: number;
  name: string | null;
  price: number | null;
  oldPrice: number | null;
  image: string | null;
  available: boolean | null;
  ratingValue: number | null;
  reviewsCount: number | null;
}

export const MYTECH_ORIGIN = "https://mytech.ma";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; DEALMAP-link-analysis)" };

function cleanName(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.replace(/<[^>]+>/g, "")
    .replace(/&quot;|&#34;|&#8243;|&Prime;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&").trim();
  return t || null;
}

function wcMoney(v: unknown): number | null {
  // WooCommerce Store API: price strings in major units when minor_unit=0 (MAD here).
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface WcProduct {
  id: number;
  name?: string;
  permalink?: string;
  prices?: { price?: string; regular_price?: string; sale_price?: string; currency_code?: string };
  images?: { src?: string }[];
  is_in_stock?: boolean;
  average_rating?: string;
  review_count?: number;
}

function toHit(p: WcProduct): MytechHit | null {
  if (!p.permalink || !/^https?:\/\//i.test(p.permalink)) return null;
  const price = wcMoney(p.prices?.price);
  if (price === null) return null;
  const regular = wcMoney(p.prices?.regular_price);
  return {
    url: p.permalink,
    remoteId: p.id,
    name: cleanName(p.name),
    price,
    oldPrice: regular !== null && regular > price ? regular : null,
    image: p.images?.[0]?.src ?? null,
    available: typeof p.is_in_stock === "boolean" ? p.is_in_stock : null,
    ratingValue: (() => { const r = Number(p.average_rating); return Number.isFinite(r) && r >= 0 && r <= 5 ? r : null; })(),
    reviewsCount: typeof p.review_count === "number" && p.review_count >= 0 ? p.review_count : null,
  };
}

async function getJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { headers: UA, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    clearTimeout(t);
    return null;
  }
}

/** Search products via the official Store API. Currency is MAD on this store. */
export async function mytechSearch(q: string, limit = 6): Promise<MytechHit[]> {
  const list = await getJson<WcProduct[]>(
    `${MYTECH_ORIGIN}/wp-json/wc/store/v1/products?search=${encodeURIComponent(q)}&per_page=${limit}&_fields=id,name,permalink,prices,images,is_in_stock,average_rating,review_count`
  );
  if (!Array.isArray(list)) return [];
  const out: MytechHit[] = [];
  for (const p of list.slice(0, limit)) {
    const hit = toHit(p);
    if (hit) out.push(hit);
  }
  return out;
}

/** Re-check one product by id (exact, stable). */
export async function mytechDetail(remoteId: number): Promise<MytechHit | null> {
  const p = await getJson<WcProduct>(`${MYTECH_ORIGIN}/wp-json/wc/store/v1/products/${remoteId}`);
  if (!p || typeof p !== "object") return null;
  return toHit(p);
}
