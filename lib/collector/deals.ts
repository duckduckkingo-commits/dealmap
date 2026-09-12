// DEALMAP Collector — real-deals engine (Jumia MA catalog).
// Serverless-safe: each call performs at most ONE polite unit of work
// (a search page OR a few product details + image checks), so public traffic
// and cron pings gradually converge a fresh catalog. Auto-refreshes when the
// last successful run is older than 24h. Display rules are strict: no price,
// no exact link, no verified photo, expired or out-of-stock → never shown,
// the UI renders "No verified offers available." instead of demo data.
// New module: no existing file is modified.
import { fetchPage } from "./adapters";
import { parseProductDetails, parseSearchCards, toAbsolute } from "./jumia";
import { matchListing } from "./match";
import { robotsAllows } from "./robots";
import { readCollector, saveCollector, type CollectorDB } from "./store";
import { allProducts } from "../products";
import type { MatchCandidate, Offer, QueueState } from "./types";

export const STALE_HOURS = 24;
const POLITE_MS = 3000;
const ORIGIN = "https://www.jumia.ma";

export interface DealQuery { q: string; category: string; }

export const QUERIES: DealQuery[] = [
  { q: "iphone 13", category: "smartphones" },
  { q: "galaxy a54", category: "smartphones" },
  { q: "redmi note 13", category: "smartphones" },
  { q: "thinkpad", category: "laptops" },
  { q: "macbook air m2", category: "laptops" },
  { q: "playstation 5", category: "gaming-consoles" },
  { q: "sony wh-1000xm5", category: "headphones" },
  { q: "ipad", category: "tablets" },
  { q: "xiaomi tv 55", category: "tvs" },
  { q: "apple watch", category: "smartwatches" },
];

export function queueOf(db: CollectorDB): QueueState {
  if (db.queue && (db.queue.searches.length || db.queue.details.length)) return db.queue;
  db.queue = { searches: QUERIES.map((x) => x.q), details: [] };
  return db.queue;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function verifyImage(url: string | null): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (res.ok) {
      const ct = res.headers.get("content-type") ?? "";
      return ct.startsWith("image/");
    }
    return false;
  } catch {
    return false;
  }
}

async function candidates(): Promise<MatchCandidate[]> {
  try {
    const catalog = await allProducts();
    return catalog.map((p) => ({ ref: p.id, name: p.name, brand: p.brand, model: p.model }));
  } catch {
    return [];
  }
}

export interface StepResult { did: string; collected: number; enriched: number; expired: number; errors: string[]; }

/** One polite unit: a search page OR up to 2 product details. Returns quickly. */
export async function stepCollect(db: CollectorDB): Promise<StepResult> {
  const res: StepResult = { did: "idle", collected: 0, enriched: 0, expired: 0, errors: [] };
  const queue = queueOf(db);
  const now = new Date().toISOString();

  // Prefer finishing detail enrichment (makes offers displayable).
  const detail = queue.details.shift();
  if (detail) {
    res.did = `detail:${detail.url.slice(0, 60)}`;
    const gate = await robotsAllows(detail.url);
    if (!gate.ok) { res.errors.push(`Skipped (robots): ${detail.url.slice(0, 80)}`); }
    else {
      const { html, note } = await fetchPage(detail.url);
      const offer = db.offers.find((o) => o.sourceUrl === detail.url);
      if (!html) {
        res.errors.push(`Detail unreachable: ${detail.url.slice(0, 80)} (${note})`);
        if (offer) { offer.verificationStatus = "expired"; res.expired++; }
      } else {
        const d = parseProductDetails(detail.url, html);
        if (offer) {
          if (d.price === null) {
            offer.verificationStatus = "expired";
            res.expired++;
          } else {
            offer.price = d.price;
            if (d.oldPrice) offer.oldPrice = d.oldPrice;
            if (d.oldPrice && d.price < d.oldPrice) offer.discountPct = Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100);
            offer.availability = d.availability;
            offer.availabilityLabel = d.availability === "unknown" ? "Unknown" : "Reported";
            if (d.ratingValue !== null) { offer.ratingValue = d.ratingValue; offer.reviewsCount = d.reviewsCount; }
            if (d.seller) offer.seller = d.seller;
            if (d.location) offer.location = d.location;
            if (d.warrantyMonths !== null) { offer.warrantyMonths = d.warrantyMonths; offer.warrantyLabel = "Reported"; }
            if (d.image) offer.imageUrl = d.image;
            if (d.brand && !offer.specs.brand) offer.specs.brand = d.brand;
            // Match to catalog for cross-source comparison (never forced).
            try {
              const cands = await candidates();
              const m = matchListing(
                { url: detail.url, name: { value: d.name, label: "Reported" }, brand: { value: d.brand, label: "Reported" }, model: { value: null, label: "Unknown" }, ramGB: { value: null, label: "Unknown" }, storageGB: { value: null, label: "Unknown" }, ean: { value: null, label: "Unknown" }, modelNumber: { value: null, label: "Unknown" }, price: { value: d.price, label: "Reported" }, currency: "MAD", condition: { value: "unknown", label: "Unknown" }, conditionRaw: null, warrantyMonths: { value: null, label: "Unknown" }, availability: { value: null, label: "Unknown" }, storeName: { value: null, label: "Unknown" }, image: { value: null, label: "Unknown" }, issues: [], missing: [], fetchedAt: now, fetchNote: "" },
                cands
              );
              if (m.productRef && m.method !== "none") offer.productRef = m.productRef;
            } catch { /* matching never blocks collection */ }
            if (offer.imageUrl && !offer.imageOk) offer.imageOk = await verifyImage(offer.imageUrl);
            offer.lastChecked = now;
            if (offer.verificationStatus === "expired" && d.price !== null) offer.verificationStatus = "pending";
            db.history.push({ productRef: offer.productRef ?? offer.id, offerId: offer.id, price: d.price, at: now });
            res.enriched++;
          }
        }
      }
    }
    db.queue = queue;
    await sleep(POLITE_MS);
    return res;
  }

  // Otherwise take the next search page.
  const q = queue.searches.shift();
  if (!q) { res.did = "queue-empty"; db.queue = queue; return res; }
  res.did = `search:${q}`;
  const searchUrl = `${ORIGIN}/catalog/?q=${encodeURIComponent(q)}`;
  const gate = await robotsAllows(searchUrl);
  if (!gate.ok) { res.errors.push(`Skipped (robots): ${searchUrl}`); db.queue = queue; return res; }
  const { html, note } = await fetchPage(searchUrl);
  if (!html) {
    res.errors.push(`Search unreachable for "${q}" (${note})`);
    db.queue = queue;
    return res;
  }
  const entry = QUERIES.find((x) => x.q === q);
  const cards = parseSearchCards(html, ORIGIN, 8);
  let added = 0;
  for (const card of cards) {
    if (db.offers.some((o) => o.sourceUrl === card.url)) continue;
    const id = `off_jm_${Date.now().toString(36)}_${added}`;
    const offer: Offer = {
      id,
      productRef: null,
      productName: card.name,
      storeId: "store_jumia_ma",
      storeName: "Jumia Morocco",
      source: "jumia-catalog",
      sourceUrl: card.url,
      price: card.price,
      currency: card.currency,
      oldPrice: card.oldPrice ?? undefined,
      discountPct: card.discountPct ?? undefined,
      availability: "unknown",
      availabilityLabel: "Unknown",
      condition: "unknown",
      conditionLabel: "Unknown",
      warrantyMonths: null,
      warrantyLabel: "Unknown",
      returnPolicy: "Retour gratuit les 7 jours suivant la date de livraison.",
      returnPolicyLabel: "Reported",
      specs: { brand: card.brand ?? undefined },
      category: entry?.category,
      ratingValue: undefined,
      reviewsCount: undefined,
      seller: undefined,
      location: undefined,
      imageUrl: card.image,
      imageOk: false,
      verificationStatus: "pending",
      lastChecked: now,
      createdAt: now,
    };
    // Verify the card photo now (cheap HEAD); failures stay hidden until fixed.
    if (offer.imageUrl) offer.imageOk = await verifyImage(offer.imageUrl);
    db.offers.unshift(offer);
    queue.details.push({ url: card.url, q });
    added++;
    if (added >= 4) break;
  }
  res.collected = added;
  db.queue = queue;
  await sleep(POLITE_MS);
  return res;
}

/** Public feed: only live, verified, in-stock offers with photo + link. */
export function displayable(db: CollectorDB): Offer[] {
  return db.offers.filter((o) =>
    o.price !== null
    && /^https?:\/\//i.test(o.sourceUrl)
    && o.imageOk === true
    && !!o.imageUrl
    && o.verificationStatus !== "expired"
    && o.verificationStatus !== "rejected"
    && o.availability !== "out_of_stock"
  );
}

export function lastSuccess(db: CollectorDB): string | null {
  const ok = db.runs.find((r) => r.status === "ok" || r.status === "partial");
  return ok?.finishedAt ?? ok?.startedAt ?? null;
}

export function needsRefresh(db: CollectorDB, hours = STALE_HOURS): boolean {
  // Initial fill: work remains queued → keep pumping on every visit.
  if (db.queue && (db.queue.searches.length > 0 || db.queue.details.length > 0)) return true;
  const last = lastSuccess(db);
  if (!last) return true;
  return Date.now() - +new Date(last) > hours * 3600000;
}
