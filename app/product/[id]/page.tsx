import { allProducts, observationsFor } from "@/lib/products";
import { dealScoreEngine } from "@/lib/dealScore";
import { marketStats, priceHistorySeries } from "@/lib/market";
import { formatPrice, formatDate } from "@/lib/format";
import PriceChart from "@/components/PriceChart";
import { ScoreBadge, ScoreRing } from "@/components/ScoreBadge";
import { catIcon } from "@/components/categoryIcons";
import ProductActions from "@/components/ProductActions";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const all = await allProducts();
  const p = all.find((x) => x.id === params.id);
  return { title: p ? `${p.name} — DEALMAP` : "Product — DEALMAP" };
}

export default async function ProductPage({ params, searchParams }: { params: { id: string }; searchParams: { price?: string } }) {
  const all = await allProducts();
  const product = all.find((x) => x.id === params.id);
  if (!product) return notFound();
  const obs = await observationsFor(params.id);
  const stats = marketStats(obs);
  const series = priceHistorySeries(obs);
  const asking = searchParams.price ? Number(searchParams.price) : (stats.median ?? 0);
  const deal = stats.median !== null && asking > 0 ? dealScoreEngine({ askingPrice: asking, observations: obs }) : null;
  const similar = all.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <>
      <p style={{ margin: "12px 0 0" }}><Link href="/explore">← Back to Explore</Link></p>
      <div className="card" style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div className="pcard-img" style={{ width: 110, height: 110, fontSize: "3rem" }} aria-hidden="true">{catIcon(product.category)}</div>
          <div style={{ flex: "1 1 220px" }}>
            <h1 style={{ margin: "0 0 4px", fontSize: "1.4rem" }}>{product.name}</h1>
            <p style={{ color: "var(--muted)", margin: "0 0 8px" }}>{product.brand} · {product.model} · {product.category}</p>
            <p style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 800 }}>{stats.median !== null ? formatPrice(stats.median) : "Price on check"}</p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: ".85rem" }}>
              {stats.count > 0 ? `${stats.count} observations · ${formatPrice(stats.min)} – ${formatPrice(stats.max)}` : "Not enough reliable data yet."}
            </p>
            <div style={{ marginTop: 8 }}>{deal ? <ScoreBadge score={deal.score} verdict={deal.verdict} /> : <span className="badge">No score yet — enter a price below</span>}</div>
          </div>
        </div>
        <ProductActions id={product.id} name={product.name} />
      </div>

      <div className="grid cols2" style={{ marginTop: 14 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Deal Score</h2>
          {deal ? (
            <>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <ScoreRing score={deal.score} verdict={deal.verdict} />
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 800 }}>{deal.verdict} {deal.score >= 75 ? "— Good Deal ✓" : deal.score < 35 ? "— Overpriced ⚠" : ""}</p>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: ".85rem" }}>Confidence: {deal.confidence} · n={deal.sampleSize} · {deal.version}</p>
                </div>
              </div>
              <h3 style={{ fontSize: ".9rem", marginBottom: 6 }}>Price analysis</h3>
              <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: ".9rem" }}>{deal.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              {deal.marketRange && <p style={{ fontSize: ".9rem" }}>Market range (IQR): <b>{formatPrice(deal.marketRange.min)} – {formatPrice(deal.marketRange.max)}</b></p>}
            </>
          ) : <p style={{ color: "var(--muted)" }}>Not enough reliable data yet. Enter an asking price to score it.</p>}
          <form method="get" style={{ display: "flex", gap: 8, marginTop: 10 }} aria-label="Score an asking price">
            <label className="skip" htmlFor="price">Asking price in MAD</label>
            <input id="price" name="price" type="number" min={1} placeholder="Asking price to score (MAD)" defaultValue={asking || ""} required />
            <button className="btn" type="submit">Score it</button>
          </form>
          <p style={{ color: "var(--muted)", fontSize: ".8rem" }}>Market-based analysis · deterministic {deal?.version ?? ""} · no AI, no guesswork.</p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Market range</h2>
          {stats.median === null ? <p style={{ color: "var(--muted)" }}>Not enough reliable data yet.</p> : (
            <>
              <div className="kv"><span>Reference (median)</span><b>{formatPrice(stats.median)}</b></div>
              <div className="kv"><span>Range</span><b>{formatPrice(stats.min)} – {formatPrice(stats.max)}</b></div>
              <div className="kv"><span>New median</span><b>{formatPrice(stats.newMedian)}</b></div>
              <div className="kv"><span>Used median</span><b>{formatPrice(stats.usedMedian)}</b></div>
              <div className="kv"><span>Observations</span><b>{stats.count}</b></div>
              <p style={{ color: "var(--muted)", fontSize: ".82rem" }}>Updated: {formatDate(stats.lastUpdated)} · {stats.confidenceNote}</p>
            </>
          )}
          {product.isDemo && <p><span className="badge">DEVELOPMENT / DEMO DATA</span></p>}
          {Object.keys(product.specs ?? {}).length > 0 && (
            <>
              <h3 style={{ fontSize: ".9rem" }}>Specifications</h3>
              {Object.entries(product.specs).map(([k, v]) => <div className="kv" key={k}><span>{k}</span><b>{v}</b></div>)}
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-title" style={{ margin: "0 0 8px" }}><h2>Price history</h2><span className="badge info">{series.length} points</span></div>
        <PriceChart series={series} />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Price comparison</h2>
        {obs.length === 0 ? <p style={{ color: "var(--muted)" }}>No observed prices yet. <Link href={`/contribute?product=${product.id}`}>Be the first to contribute</Link>.</p> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Price</th><th>Type</th><th>Condition</th><th>Seller</th><th>Location</th><th>Date</th><th>Quality</th></tr></thead>
              <tbody>{obs.slice(-10).reverse().map((o) => (
                <tr key={o.id}><td><b>{formatPrice(o.price)}</b></td><td>{o.sourceType === "purchase" ? "Reported purchase" : o.sourceType === "listing" ? "Asking" : "Observed"}</td><td>{o.condition}</td><td>{o.sellerType}</td><td>{o.location}</td><td>{formatDate(o.observedAt)}</td><td><span className={`badge ${o.quality === "VERIFIED" || o.quality === "HIGH" ? "good" : o.quality === "MEDIUM" ? "warn" : ""}`}>{o.quality}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {similar.length > 0 && (
        <>
          <div className="section-title"><h2>Similar products</h2><Link href={`/explore?category=${product.category}`}>More →</Link></div>
          <div className="grid cols3 stagger">
            {similar.map((p) => (
              <div className="card hoverable" key={p.id}>
                <Link href={`/product/${p.id}`} style={{ color: "var(--fg)", fontWeight: 700 }}>{p.name}</Link>
                <p style={{ margin: "4px 0 0" }}><b>{p.median !== null ? formatPrice(p.median) : "No data yet"}</b></p>
                <Link className="btn secondary small" style={{ marginTop: 8 }} href={`/compare?ids=${product.id},${p.id}`}>Compare</Link>
              </div>
            ))}
          </div>
        </>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: product.name, brand: product.brand, offers: stats.median ? { "@type": "Offer", priceCurrency: "MAD", price: stats.median } : undefined }) }} />
    </>
  );
}
