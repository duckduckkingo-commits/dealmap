import DealCard, { type Deal } from "@/components/collector/DealCard";
import { displayable } from "@/lib/collector/deals";
import { lastSuccess, needsRefresh, stepCollect } from "@/lib/collector/deals";
import { readCollector, saveCollector } from "@/lib/collector/store";

export const metadata = { title: "Real Deals — DEALMAP" };
export const dynamic = "force-dynamic";

/** Real verified offers only. Never demo data, never placeholders. */
export default async function DealsPage() {
  const db = await readCollector();
  // Lazy 24h refresh: one polite unit per stale visit, then serve.
  if (needsRefresh(db)) {
    try {
      await stepCollect(db);
      db.runs.unshift({
        id: `run_lazy_${Date.now()}`, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
        status: "ok", checked: 0, updated: 0, skipped: 0, failedSources: [], errors: [], notes: ["Lazy refresh (page visit)"],
      });
      await saveCollector(db);
    } catch { /* serve last verified data on hiccup */ }
  }
  const offers = displayable(db);
  const last = lastSuccess(db);
  const stale = needsRefresh(db);
  const items: Deal[] = offers.slice(0, 60).map((o) => ({
    id: o.id, productRef: o.productRef, productName: o.productName, storeName: o.storeName,
    url: o.sourceUrl, price: o.price, currency: o.currency,
    oldPrice: o.oldPrice ?? null, discountPct: o.discountPct ?? null,
    ratingValue: o.ratingValue ?? null, reviewsCount: o.reviewsCount ?? null,
    seller: o.seller ?? null, location: o.location ?? null,
    availability: o.availability, imageUrl: o.imageUrl ?? null,
    verificationStatus: o.verificationStatus, lastChecked: o.lastChecked,
  }));

  return (
    <>
      <div className="section-title">
        <h1 style={{ margin: 0 }}>Real Deals</h1>
        <span className="badge good">✓ {items.length} verified live</span>
      </div>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Every card is a real checked offer with photo, price and a direct link.{" "}
        {last ? <>Last refresh: {new Date(last).toLocaleString()}{stale ? " — refreshing now, come back in a minute." : "."}</> : "First collection in progress — come back in a minute."}{" "}
        Offers re-check automatically every 24 hours; expired ones disappear.
      </p>
      {items.length === 0 ? (
        <div className="empty">
          <div className="big" aria-hidden="true">🏷️</div>
          <h2 style={{ color: "var(--fg)" }}>No verified offers available.</h2>
          <p>Real offers are being collected right now. Reload in a minute — no demo data will ever be shown here.</p>
        </div>
      ) : (
        <div className="grid cols3 stagger">
          {items.map((d) => <DealCard key={d.id} deal={d} />)}
        </div>
      )}
    </>
  );
}
