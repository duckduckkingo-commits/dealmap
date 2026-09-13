// DEALMAP Collector — Jumia Morocco parsers.
// Built against real observed markup: article.prd cards (a.core exact links,
// data-gtm-*/data-moengage-* attributes, div.prc/old/bdg, lazy data-src images)
// and JSON-LD Product pages. Missing fields stay null (never invented).
// Polite use only: plain catalog/product URLs, rate-limited by the caller.
// New module: no existing file is modified.
import { detectWarranty, jsonLdProducts } from "./adapters";

export interface JumiaCard {
  url: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  price: number | null;
  currency: string;
  oldPrice: number | null;
  discountPct: number | null;
  image: string | null;
  sku: string | null;
}

export interface JumiaDetails {
  price: number | null;
  oldPrice: number | null;
  availability: "in_stock" | "out_of_stock" | "unknown";
  ratingValue: number | null;
  reviewsCount: number | null;
  seller: string | null;
  location: string | null;
  warrantyMonths: number | null;
  image: string | null;
  brand: string | null;
  name: string | null;
}

export function toAbsolute(href: string, base: string): string | null {
  try {
    const u = new URL(href.replace(/&amp;/g, "&"), base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

function attr(block: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]{1,300})"`, "i").exec(block);
  return m ? decodeHtml(m[1]).trim().slice(0, 300) || null : null;
}

/** Decode HTML entities so names display correctly (13&quot; → 13"). */
export function decodeHtml(s: string): string {
  return s
    .replace(/&quot;|&#34;|&#8243;|&Prime;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function money(text: string | null): { price: number | null; currency: string } {
  if (!text) return { price: null, currency: "MAD" };
  const clean = text.replace(/\s+/g, " ").trim();
  const n = Number(clean.replace(/[^0-9.]/g, ""));
  const currency = /dhs|mad|dh\b|درهم/i.test(clean) ? "MAD" : "MAD";
  return { price: Number.isFinite(n) && n > 0 ? n : null, currency };
}

export function discountPct(price: number | null, oldPrice: number | null): number | null {
  if (price === null || oldPrice === null || oldPrice <= 0 || price >= oldPrice) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function cardImage(block: string): string | null {
  const mo = attr(block, "data-moengage-product_image");
  if (mo && /^https?:\/\//i.test(mo)) return mo;
  const ds = /<img[^>]+data-src="(https?:\/\/[^"]+)"/i.exec(block)?.[1];
  if (ds) return ds;
  const src = /<img[^>]+src="(https?:\/\/[^"]+)"/i.exec(block)?.[1];
  return src ?? null;
}

/** Parse one <article class="prd"> block. Returns null when link or price is missing. */
export function parseCard(block: string, base: string): JumiaCard | null {
  const href = /class="core"[^>]*href="([^"]+)"/i.exec(block)?.[1]
    ?? /href="([^"]+)"[^>]*class="core"/i.exec(block)?.[1];
  const url = href ? toAbsolute(href, base) : null;
  if (!url || !/\.html(\?|#|$)/i.test(url)) return null;

  const name = attr(block, "data-gtm-name") ?? attr(block, "data-moengage-product_name")
    ?? /<img[^>]+alt="([^"]{2,200})"/i.exec(block)?.[1]?.trim()
    ?? /<h3[^>]*>([^<]{2,200})</i.exec(block)?.[1]?.trim()
    ?? null;
  const prcText = /<div class="prc"[^>]*>([^<]{1,40})</i.exec(block)?.[1] ?? null;
  const { price, currency } = money(prcText);
  if (price === null) return null; // no verifiable price → not displayable

  const oldText = /<div class="old"[^>]*>([^<]{1,40})</i.exec(block)?.[1] ?? null;
  const oldPrice = money(oldText).price;
  const bdg = /<div class="bdg"[^>]*>([^<]{1,12})</i.exec(block)?.[1] ?? null;
  const bdgNum = bdg ? Number(bdg.replace(/[^0-9]/g, "")) : null;

  return {
    url,
    name,
    brand: attr(block, "data-gtm-brand") ?? attr(block, "data-moengage-brand_name"),
    category: (attr(block, "data-gtm-category") ?? "").split("/")[0] || null,
    price,
    currency,
    oldPrice,
    discountPct: discountPct(price, oldPrice) ?? (bdgNum !== null && Number.isFinite(bdgNum) ? bdgNum : null),
    image: cardImage(block),
    sku: attr(block, "data-gtm-id") ?? attr(block, "data-sku"),
  };
}

export function parseSearchCards(html: string, base: string, limit = 12): JumiaCard[] {
  const out: JumiaCard[] = [];
  const seen = new Set<string>();
  const re = /<article class="prd[\s\S]*?<\/article>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    try {
      const card = parseCard(m[0], base);
      if (card && !seen.has(card.url)) { seen.add(card.url); out.push(card); }
    } catch { /* one bad card never kills the batch */ }
  }
  return out;
}

function offerOf(ld: Record<string, unknown>): Record<string, unknown> | null {
  const arr = Array.isArray(ld.offers) ? ld.offers : [ld.offers];
  for (const o of arr) {
    if (o && typeof o === "object" && (o as Record<string, unknown>).price !== undefined) {
      return o as Record<string, unknown>;
    }
  }
  return null;
}

/** Parse a product page. Availability/seller/rating come from the page or stay unknown. */
export function parseProductDetails(url: string, html: string): JumiaDetails {
  const lds = jsonLdProducts(html);
  const ld = lds[0];
  const offer = ld ? offerOf(ld) : null;
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  const price = offer ? (() => { const n = Number(String(offer.price ?? "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; })() : null;
  const availRaw = (typeof offer?.availability === "string" ? (offer.availability as string) : "") + " " + text.slice(0, 5000);
  const availability = /InStock|Disponible/i.test(availRaw) && !/Rupture|OutOfStock/i.test(text.slice(0, 3000))
    ? "in_stock" : /OutOfStock|Rupture de stock|SoldOut/i.test(availRaw) ? "out_of_stock" : "unknown";

  let oldPrice: number | null = null;
  const oldAttr = /data-old-price="([\d.]+)"/i.exec(html)?.[1];
  if (oldAttr) { const n = Number(oldAttr); if (Number.isFinite(n) && n > 0) oldPrice = n; }
  if (oldPrice === null) {
    const oldText = /<div class="old"[^>]*>([^<]{1,40})</i.exec(html)?.[1];
    if (oldText) oldPrice = money(oldText).price;
  }

  const agg = (ld?.aggregateRating && typeof ld.aggregateRating === "object" ? ld.aggregateRating as Record<string, unknown> : null);
  const ratingValue = agg ? Number(agg.ratingValue) : NaN;
  const reviewsCount = agg ? Number(agg.reviewCount ?? agg.ratingCount) : NaN;

  const seller = /Vendu par\s+([^<|,]{2,60})/i.exec(text)?.[1]?.trim()
    ?? /INFORMATIONS SUR LE VENDEUR\s+([A-Z0-9][A-Z0-9 \-]{1,40})/.exec(text)?.[1]?.trim()
    ?? null;
  const location = /vers\s+([A-Z][A-Z\- ]{2,40}?)(?:\s|$)/.exec(text)?.[1]?.trim()
    .toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) ?? null;

  const ldImageRaw = ld ? (Array.isArray(ld.image) ? ld.image[0] : ld.image) : null;
  const ldImage = typeof ldImageRaw === "string" ? ldImageRaw : null;
  const ogImage = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ?? null;
  let image: string | null = ldImage ?? ogImage;
  if (image) {
    try { image = new URL(image, url).toString(); } catch { image = null; }
    if (image && !/^https?:\/\//i.test(image)) image = null;
  }

  const brandRaw = ld && typeof ld.brand === "object" && ld.brand !== null ? (ld.brand as Record<string, unknown>).name : ld?.brand;
  return {
    price,
    oldPrice,
    availability,
    ratingValue: Number.isFinite(ratingValue) && ratingValue >= 0 && ratingValue <= 5 ? ratingValue : null,
    reviewsCount: Number.isFinite(reviewsCount) && reviewsCount >= 0 ? Math.round(reviewsCount) : null,
    seller,
    location,
    warrantyMonths: detectWarranty(text.slice(0, 30000)),
    image,
    brand: typeof brandRaw === "string" ? brandRaw : null,
    name: typeof ld?.name === "string" ? (ld.name as string) : null,
  };
}
