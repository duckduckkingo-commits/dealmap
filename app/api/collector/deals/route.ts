// GET /api/collector/deals — public REAL-ONLY deals feed.
// Lazy 24h refresh: when the last successful run is older than STALE_HOURS,
// one polite collection unit runs inside this call (bounded, fast), so the
// catalog renews itself through normal traffic + cron pings. Expired offers,
// demo data and unverified items are NEVER included.
// New route. Modifies nothing existing.
import { NextResponse } from "next/server";
import { displayable, needsRefresh, stepCollect } from "@/lib/collector/deals";
import { readCollector, saveCollector } from "@/lib/collector/store";
import type { Offer } from "@/lib/collector/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readCollector();
  let refreshing = false;
  let refreshed: string | null = null;
  if (needsRefresh(db)) {
    refreshing = true;
    try {
      const step = await stepCollect(db);
      refreshed = step.did;
      db.runs.unshift({
        id: `run_lazy_${Date.now()}`, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
        status: step.errors.length ? "partial" : "ok", checked: step.enriched, updated: step.collected,
        skipped: 0, failedSources: [], errors: step.errors, notes: [`Lazy refresh (${step.did})`],
      });
      await saveCollector(db);
    } catch {
      return NextResponse.json({
        error: "Collection hiccup — showing last verified offers.",
        offers: displayable(db).map(publicOffer),
      }, { status: 200 });
    }
  }
  const offers = displayable(db);
  return NextResponse.json({
    offers: offers.map(publicOffer),
    count: offers.length,
    total: db.offers.length,
    refreshing,
    refreshed,
    stale: needsRefresh(db),
    updatedNote: "Offers re-checked automatically every 24 hours. Prices labeled Live were checked within 60 minutes.",
  });
}

function publicOffer(o: Offer) {
  return {
    id: o.id,
    productRef: o.productRef,
    productName: o.productName,
    storeName: o.storeName,
    url: o.sourceUrl,
    price: o.price,
    currency: o.currency,
    oldPrice: o.oldPrice ?? null,
    discountPct: o.discountPct ?? null,
    ratingValue: o.ratingValue ?? null,
    reviewsCount: o.reviewsCount ?? null,
    seller: o.seller ?? null,
    location: o.location ?? null,
    availability: o.availability,
    condition: o.condition,
    imageUrl: o.imageUrl ?? null,
    verificationStatus: o.verificationStatus,
    lastChecked: o.lastChecked,
  };
}
