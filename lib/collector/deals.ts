// DEALMAP Collector — multi-store real-deals engine.
// Stores: Jumia MA (polite catalog parsing, robots-clean plain URLs),
// Techspace (official Shopify JSON), Mytech (official WooCommerce Store API).
// Serverless-safe: one polite unit per call; 24h lazy refresh; strict display
// rules (no price / no exact link / no verified photo / expired / out-of-stock
// → never shown; UI renders "No verified offers available." instead of demo).
// New module: no existing file is modified.
import { fetchPage } from "./adapters";
import { parseProductDetails, parseSearchCards } from "./jumia";
import { mytechDetail, mytechSearch } from "./mytech";
import { TECHSPACE_ORIGIN, techspaceDetail, techspaceSearch } from "./techspace";
import { matchListing } from "./match";
import { robotsAllows } from "./robots";
import type { CollectorDB } from "./store";import { allProducts } from "../products";
import type { MatchCandidate, Offer, QueueState, StoreKind } from "./types";

export const STALE_HOURS = 24;
const POLITE_MS = 3000;
const JUMIA_ORIGIN = "https://www.jumia.ma";

export interface DealQuery { storeId: string; storeName: string; kind: StoreKind; q: string; category: string; exclude?: RegExp; }

/** Accessories pollute device queries — excluded by name (still real, just off-category). */
const ACCESSORIES = /coque|pochette|housse|étui|etui|cover\b|verre\s*trempé|film\s*écran|protecteur|chargeur|câble|cable|adaptateur|support|écouteurs\s*filaires|kit\s*piéton/i;

export const QUERIES: DealQuery[] = [
  { storeId: "store_jumia_ma", storeName: "Jumia Morocco", kind: "jumia", q: "iphone 13", category: "smartphones", exclude: ACCESSORIES },
  { storeId: "store_jumia_ma", storeName: "Jumia Morocco", kind: "jumia", q: "galaxy a54", category: "smartphones", exclude: ACCESSORIES },
  { storeId: "store_jumia_ma", storeName: "Jumia Morocco", kind: "jumia", q: "redmi note 13", category: "smartphones", exclude: ACCESSORIES },
  { storeId: "store_jumia_ma", storeName: "Jumia Morocco", kind: "jumia", q: "thinkpad", category: "laptops", exclude: ACCESSORIES },
  { storeId: "store_jumia_ma", storeName: "Jumia Morocco", kind: "jumia", q: "macbook air m2", category: "laptops", exclude: ACCESSORIES },
  { storeId: "store_jumia_ma", storeName: "Jumia Morocco", kind: "jumia", q: "playstation 5", category: "gaming-consoles", exclude: ACCESSORIES },
  { storeId: "store_jumia_ma", storeName: "Jumia Morocco", kind: "jumia", q: "sony wh-1000xm5", category: "headphones" },
  { storeId: "store_jumia_ma", storeName: "Jumia Morocco", kind: "jumia", q: "ipad", category: "tablets" },
  { storeId: "store_techspace", storeName: "Techspace", kind: "techspace", q: "iphone", category: "smartphones" },
  { storeId: "store_techspace", storeName: "Techspace", kind: "techspace", q: "samsung galaxy", category: "smartphones" },
  { storeId: "store_techspace", storeName: "Techspace", kind: "techspace", q: "xiaomi", category: "smartphones" },
  { storeId: "store_techspace", storeName: "Techspace", kind: "techspace", q: "playstation 5", category: "gaming-consoles" },
  { storeId: "store_techspace", storeName: "Techspace", kind: "techspace", q: "rtx 4060", category: "pc-components" },
  { storeId: "store_mytech", storeName: "Mytech", kind: "mytech", q: "samsung", category: "smartphones" },
  { storeId: "store_mytech", storeName: "Mytech", kind: "mytech", q: "tablette", category: "tablets" },
  { storeId: "store_mytech", storeName: "Mytech", kind: "mytech", q: "tv", category: "tvs" },
  { storeId: "store_mytech", storeName: "Mytech", kind: "mytech", q: "pc portable", category: "laptops" },
];

export function queueOf(db: CollectorDB): QueueState {
  if (db.queue && (db.queue.searches.length || db.queue.details.length)) return db.queue;
  db.queue = { searches: QUERIES.map((x) => ({ storeId: x.storeId, q: x.q })), details: [] };
  return db.queue;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function verifyImage(url: string | null): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  // Some CDNs refuse HEAD: fall back to a ranged GET (downloads ~0 bytes).
  const attempts: RequestInit[] = [
    { method: "HEAD", redirect: "follow" },
    { method: "GET", redirect: "follow", headers: { Range: "bytes=0-0" } },
  ];
  for (const init of attempts) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      const ct = res.headers.get("content-type") ?? "";
      if ((res.ok || res.status === 206) && ct.startsWith("image/")) return true;
      try { await res.body?.cancel(); } catch { /* ignore */ }
    } catch {
      /* try next method */
    }
  }
  return false;
}

async function candidates(): Promise<MatchCandidate[]> {
  try {
    const catalog = await allProducts();
    return catalog.map((p) => ({ ref: p.id, name: p.name, brand: p.brand, model: p.model }));
  } catch {
    return [];
  }
}

function baseOffer(partial: Partial<Offer> & { storeName: string; source: string; sourceUrl: string }): Offer {
  const now = new Date().toISOString();
  return {
    id: `off_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`,
    productRef: null,
    productName: null,
    storeId: null,
    price: null,
    currency: "MAD",
    availability: "unknown",
    availabilityLabel: "Unknown",
    condition: "unknown",
    conditionLabel: "Unknown",
    warrantyMonths: null,
    warrantyLabel: "Unknown",
    returnPolicy: null,
    specs: {},
    verificationStatus: "pending",
    lastChecked: now,
    createdAt: now,
    ...partial,
  } as Offer;
}

export interface StepResult { did: string; collected: number; enriched: number; expired: number; errors: string[]; }

async function stepJumiaSearch(db: CollectorDB, queue: QueueState, q: string): Promise<StepResult> {
  const res: StepResult = { did: `jumia-search:${q}`, collected: 0, enriched: 0, expired: 0, errors: [] };
  const now = new Date().toISOString();
  const searchUrl = `${JUMIA_ORIGIN}/catalog/?q=${encodeURIComponent(q)}`;
  const gate = await robotsAllows(searchUrl);
  if (!gate.ok) { res.errors.push(`Skipped (robots): ${searchUrl}`); return res; }
  const { html, note } = await fetchPage(searchUrl);
  if (!html) { res.errors.push(`Search unreachable for "${q}" (${note})`); return res; }
  const entry = QUERIES.find((x) => x.kind === "jumia" && x.q === q);
  for (const card of parseSearchCards(html, JUMIA_ORIGIN, 14)) {
    if (db.offers.some((o) => o.sourceUrl === card.url)) continue;
    if (entry?.exclude && card.name && entry.exclude.test(card.name)) continue;
    const offer = baseOffer({
      storeId: "store_jumia_ma", storeName: "Jumia Morocco", source: "jumia-catalog",
      sourceUrl: card.url, productName: card.name, price: card.price, currency: card.currency,
      oldPrice: card.oldPrice ?? undefined, discountPct: card.discountPct ?? undefined,
      imageUrl: card.image, imageOk: false, category: entry?.category,
      specs: { brand: card.brand ?? undefined }, lastChecked: now,
    });
    if (offer.imageUrl) offer.imageOk = await verifyImage(offer.imageUrl);
    db.offers.unshift(offer);
    queue.details.push({ url: card.url, q, kind: "jumia", storeId: "store_jumia_ma" });
    res.collected++;
    if (res.collected >= 4) break;
  }
  return res;
}

async function stepJumiaDetail(db: CollectorDB, url: string): Promise<StepResult> {
  const res: StepResult = { did: `jumia-detail`, collected: 0, enriched: 0, expired: 0, errors: [] };
  const now = new Date().toISOString();
  const gate = await robotsAllows(url);
  const offer = db.offers.find((o) => o.sourceUrl === url);
  if (!gate.ok) { res.errors.push(`Skipped (robots): ${url.slice(0, 80)}`); return res; }
  const { html, note } = await fetchPage(url);
  if (!html) {
    res.errors.push(`Detail unreachable (${note})`);
    if (offer) { offer.verificationStatus = "expired"; res.expired++; }
    return res;
  }
  const d = parseProductDetails(url, html);
  if (!offer) return res;
  if (d.price === null) { offer.verificationStatus = "expired"; res.expired++; return res; }
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
  if (offer.imageUrl && !offer.imageOk) offer.imageOk = await verifyImage(offer.imageUrl);
  offer.lastChecked = now;
  if (offer.verificationStatus === "expired") offer.verificationStatus = "pending";
  db.history.push({ productRef: offer.productRef ?? offer.id, offerId: offer.id, price: d.price, at: now });
  res.enriched++;
  return res;
}

async function stepTechspaceSearch(db: CollectorDB, queue: QueueState, q: string): Promise<StepResult> {
  const res: StepResult = { did: `techspace-search:${q}`, collected: 0, enriched: 0, expired: 0, errors: [] };
  const now = new Date().toISOString();
  const entry = QUERIES.find((x) => x.kind === "techspace" && x.q === q);
  let hits: Awaited<ReturnType<typeof import("./techspace").techspaceSearch>>;
  try {
    const { techspaceSearch } = await import("./techspace");
    hits = await techspaceSearch(q, 6);
  } catch (e) { res.errors.push(`Techspace search failed: ${e instanceof Error ? e.message : "network"}`); return res; }
  for (const hit of hits) {
    if (db.offers.some((o) => o.sourceUrl === hit.url)) continue;
    const offer = baseOffer({
      storeId: "store_techspace", storeName: "Techspace", source: "techspace-api",
      sourceUrl: hit.url, productName: hit.name, price: hit.price, currency: "MAD",
      oldPrice: hit.oldPrice ?? undefined,
      discountPct: hit.oldPrice && hit.price && hit.oldPrice > hit.price ? Math.round(((hit.oldPrice - hit.price) / hit.oldPrice) * 100) : undefined,
      imageUrl: hit.image, imageOk: false, category: entry?.category,
      availability: hit.available === null ? "unknown" : hit.available ? "in_stock" : "out_of_stock",
      availabilityLabel: hit.available === null ? "Unknown" : "Reported",
      specs: { remoteId: hit.handle }, lastChecked: now,
    });
    if (offer.imageUrl) offer.imageOk = await verifyImage(offer.imageUrl);
    db.offers.unshift(offer);
    queue.details.push({ url: hit.url, q, kind: "techspace", ref: hit.handle, storeId: "store_techspace" });
    res.collected++;
  }
  return res;
}

async function stepTechspaceDetail(db: CollectorDB, ref: string, url: string): Promise<StepResult> {
  const res: StepResult = { did: `techspace-detail`, collected: 0, enriched: 0, expired: 0, errors: [] };
  const now = new Date().toISOString();
  const offer = db.offers.find((o) => o.sourceUrl === url);
  if (!offer) return res;
  try {
    const { techspaceDetail } = await import("./techspace");
    const d = await techspaceDetail(ref);
    if (!d || d.price === null) { offer.verificationStatus = "expired"; res.expired++; return res; }
    offer.price = d.price;
    if (d.oldPrice) offer.oldPrice = d.oldPrice;
    if (d.oldPrice && d.price < d.oldPrice) offer.discountPct = Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100);
    offer.availability = d.available === null ? "unknown" : d.available ? "in_stock" : "out_of_stock";
    offer.availabilityLabel = d.available === null ? "Unknown" : "Reported";
    if (d.image) offer.imageUrl = d.image;
    if (offer.imageUrl && !offer.imageOk) offer.imageOk = await verifyImage(offer.imageUrl);
    offer.lastChecked = now;
    if (offer.verificationStatus === "expired") offer.verificationStatus = "pending";
    db.history.push({ productRef: offer.productRef ?? offer.id, offerId: offer.id, price: d.price, at: now });
    res.enriched++;
  } catch (e) {
    res.errors.push(`Techspace detail failed: ${e instanceof Error ? e.message : "network"}`);
  }
  return res;
}

async function stepMytechSearch(db: CollectorDB, queue: QueueState, q: string): Promise<StepResult> {
  const res: StepResult = { did: `mytech-search:${q}`, collected: 0, enriched: 0, expired: 0, errors: [] };
  const now = new Date().toISOString();
  const entry = QUERIES.find((x) => x.kind === "mytech" && x.q === q);
  let hits: Awaited<ReturnType<typeof import("./mytech").mytechSearch>>;
  try {
    const { mytechSearch } = await import("./mytech");
    hits = await mytechSearch(q, 6);
  } catch (e) { res.errors.push(`Mytech search failed: ${e instanceof Error ? e.message : "network"}`); return res; }
  const cands = await candidates();
  for (const hit of hits) {
    if (db.offers.some((o) => o.sourceUrl === hit.url)) continue;
    const m = matchListing(
      { url: hit.url, name: { value: hit.name, label: "Reported" }, brand: { value: null, label: "Unknown" }, model: { value: null, label: "Unknown" }, ramGB: { value: null, label: "Unknown" }, storageGB: { value: null, label: "Unknown" }, ean: { value: null, label: "Unknown" }, modelNumber: { value: null, label: "Unknown" }, price: { value: hit.price, label: "Reported" }, currency: "MAD", condition: { value: "unknown", label: "Unknown" }, conditionRaw: null, warrantyMonths: { value: null, label: "Unknown" }, availability: { value: null, label: "Unknown" }, storeName: { value: null, label: "Unknown" }, image: { value: null, label: "Unknown" }, issues: [], missing: [], fetchedAt: now, fetchNote: "" },
      cands
    );
    const offer = baseOffer({
      storeId: "store_mytech", storeName: "Mytech", source: "mytech-api",
      sourceUrl: hit.url, productRef: m.productRef, productName: hit.name ?? m.productName,
      price: hit.price, currency: "MAD",
      oldPrice: hit.oldPrice ?? undefined,
      discountPct: hit.oldPrice && hit.price && hit.oldPrice > hit.price ? Math.round(((hit.oldPrice - hit.price) / hit.oldPrice) * 100) : undefined,
      imageUrl: hit.image, imageOk: false, category: entry?.category,
      availability: hit.available === null ? "unknown" : hit.available ? "in_stock" : "out_of_stock",
      availabilityLabel: hit.available === null ? "Unknown" : "Reported",
      ratingValue: hit.ratingValue ?? undefined, reviewsCount: hit.reviewsCount ?? undefined,
      specs: { remoteId: String(hit.remoteId) }, lastChecked: now,
    });
    if (offer.ratingValue !== undefined) offer.reviewsCount = offer.reviewsCount ?? null;
    if (offer.imageUrl) offer.imageOk = await verifyImage(offer.imageUrl);
    db.offers.unshift(offer);
    queue.details.push({ url: hit.url, q, kind: "mytech", ref: String(hit.remoteId), storeId: "store_mytech" });
    res.collected++;
  }
  return res;
}

async function stepMytechDetail(db: CollectorDB, ref: string, url: string): Promise<StepResult> {
  const res: StepResult = { did: `mytech-detail`, collected: 0, enriched: 0, expired: 0, errors: [] };
  const now = new Date().toISOString();
  const offer = db.offers.find((o) => o.sourceUrl === url);
  if (!offer) return res;
  try {
    const { mytechDetail } = await import("./mytech");
    const d = await mytechDetail(Number(ref));
    if (!d || d.price === null) { offer.verificationStatus = "expired"; res.expired++; return res; }
    offer.price = d.price;
    if (d.oldPrice) offer.oldPrice = d.oldPrice;
    if (d.oldPrice && d.price < d.oldPrice) offer.discountPct = Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100);
    offer.availability = d.available === null ? "unknown" : d.available ? "in_stock" : "out_of_stock";
    offer.availabilityLabel = d.available === null ? "Unknown" : "Reported";
    if (d.ratingValue !== null) { offer.ratingValue = d.ratingValue; offer.reviewsCount = d.reviewsCount; }
    if (d.image) offer.imageUrl = d.image;
    if (offer.imageUrl && !offer.imageOk) offer.imageOk = await verifyImage(offer.imageUrl);
    offer.lastChecked = now;
    if (offer.verificationStatus === "expired") offer.verificationStatus = "pending";
    db.history.push({ productRef: offer.productRef ?? offer.id, offerId: offer.id, price: d.price, at: now });
    res.enriched++;
  } catch (e) {
    res.errors.push(`Mytech detail failed: ${e instanceof Error ? e.message : "network"}`);
  }
  return res;
}

/** One polite unit: a search page OR one product detail. Returns quickly. */
export async function stepCollect(db: CollectorDB): Promise<StepResult> {
  const queue = queueOf(db);
  const detail = queue.details.shift();
  let res: StepResult;
  if (detail) {
    if (detail.kind === "techspace") res = await stepTechspaceDetail(db, detail.ref ?? "", detail.url);
    else if (detail.kind === "mytech") res = await stepMytechDetail(db, detail.ref ?? "", detail.url);
    else res = await stepJumiaDetail(db, detail.url);
  } else {
    const next = queue.searches.shift();
    if (!next) { db.queue = queue; return { did: "queue-empty", collected: 0, enriched: 0, expired: 0, errors: [] }; }
    const def = QUERIES.find((x) => x.storeId === next.storeId && x.q === next.q);
    if (!def || def.kind === "jumia") res = await stepJumiaSearch(db, queue, next.q);
    else if (def.kind === "techspace") res = await stepTechspaceSearch(db, queue, next.q);
    else res = await stepMytechSearch(db, queue, next.q);
  }
  db.queue = queue;
  await sleep(POLITE_MS);
  return res;
}

/** Public feed: only live, IN-STOCK offers with photo + exact link.
 *  Unknown availability never displays (detail check pending), expired,
 *  rejected and out-of-stock never display. Empty feed renders
 *  "No verified offers available." — never demo data. */
export function displayable(db: CollectorDB): Offer[] {
  return db.offers.filter((o) =>
    o.price !== null
    && /^https?:\/\//i.test(o.sourceUrl)
    && o.imageOk === true
    && !!o.imageUrl
    && o.verificationStatus !== "expired"
    && o.verificationStatus !== "rejected"
    && o.availability === "in_stock"
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
