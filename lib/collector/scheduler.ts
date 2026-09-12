// DEALMAP Collector — scheduler + freshness ledger.
// No in-process cron (serverless-safe): updates run when an admin triggers
// POST /api/collector/runs {action:"tick"} (button or external cron ping).
// Only re-checks offers whose store explicitly allows it AND that carry a
// source URL. Everything else is counted as skipped — never silently faked.
// A price is labeled Live ONLY when actually checked within LIVE_MINUTES.
// New module: no existing file is modified.
import { extractListing } from "./adapters";
import { historyFor } from "./store";
import type { CollectorDB } from "./store";
import type { CollectionRun, Offer } from "./types";

export const LIVE_MINUTES = 60;
export const FRESH_MINUTES = 24 * 60;

export type Freshness = "Live" | "Fresh" | "Stale" | "Unknown";

export function freshnessOf(lastChecked: string | null, now = Date.now()): { state: Freshness; checkedAgo: string } {
  if (!lastChecked) return { state: "Unknown", checkedAgo: "never checked" };
  const mins = Math.max(0, Math.round((now - +new Date(lastChecked)) / 60000));
  const ago = mins < 60 ? `${mins} min ago` : mins < 60 * 24 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} d ago`;
  if (mins <= LIVE_MINUTES) return { state: "Live", checkedAgo: ago };
  if (mins <= FRESH_MINUTES) return { state: "Fresh", checkedAgo: ago };
  return { state: "Stale", checkedAgo: ago };
}

export interface TickDeps {
  extract?: typeof extractListing;
  now?: () => number;
}

export async function tick(db: CollectorDB, limit = 20, deps: TickDeps = {}): Promise<CollectionRun> {
  const extract = deps.extract ?? extractListing;
  const nowIso = new Date(deps.now ? deps.now() : Date.now()).toISOString();
  const run: CollectionRun = {
    id: `run_${Date.now()}`, startedAt: nowIso, finishedAt: null,
    status: "running", checked: 0, updated: 0, skipped: 0, failedSources: [], errors: [],
  };
  const due = db.offers
    .filter((o) => o.verificationStatus !== "rejected")
    .sort((a, b) => +new Date(a.lastChecked ?? 0) - +new Date(b.lastChecked ?? 0))
    .slice(0, limit);

  for (const offer of due) {
    const store = db.stores.find((s) => s.id === offer.storeId);
    if (!store?.allowRecheck || !offer.sourceUrl) {
      run.skipped++;
      continue;
    }
    run.checked++;
    try {
      const live = await extract(offer.sourceUrl);
      const price = live.price.value;
      offer.lastChecked = nowIso;
      if (price !== null && price !== offer.price) {
        offer.price = price;
        offer.verificationStatus = "pending";
        db.history.push({ productRef: offer.productRef ?? offer.id, offerId: offer.id, price, at: nowIso });
        run.updated++;
      }
      if (live.availability.value) offer.availability = live.availability.value;
    } catch (e) {
      const msg = `${offer.storeName}: ${e instanceof Error ? e.message : "recheck failed"}`;
      run.failedSources.push(offer.storeName);
      run.errors.push(msg);
    }
  }
  run.finishedAt = new Date().toISOString();
  run.status = run.errors.length ? (run.updated > 0 ? "partial" : "failed") : "ok";
  db.runs.unshift(run);
  db.runs = db.runs.slice(0, 100);
  void historyFor;
  return run;
}

/** Collector health snapshot for the admin dashboard. */
export function health(db: CollectorDB): {
  lastRun: CollectionRun | null; offers: number; products: number; stale: number;
  pendingSubmissions: number; verifiedOffers: number;
} {
  const productRefs = new Set<string>();
  for (const o of db.offers) if (o.productRef) productRefs.add(o.productRef);
  for (const h of db.history) productRefs.add(h.productRef);
  const stale = db.offers.filter((o) => freshnessOf(o.lastChecked).state === "Stale").length;
  return {
    lastRun: db.runs[0] ?? null,
    offers: db.offers.length,
    products: productRefs.size,
    stale,
    pendingSubmissions: db.submissions.filter((s) => s.status === "pending").length,
    verifiedOffers: db.offers.filter((o) => o.verificationStatus === "verified").length,
  };
}

export type { Offer };
