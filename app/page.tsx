import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import { catIcon } from "@/components/categoryIcons";
import { allProducts } from "@/lib/products";
import { cookies } from "next/headers";
import { getLocale, t } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";

const CATS = [
  { slug: "smartphones", name: "Smartphones" },
  { slug: "laptops", name: "Laptops" },
  { slug: "pc-components", name: "PC parts" },
  { slug: "tablets", name: "Tablets" },
  { slug: "smartwatches", name: "Watches" },
  { slug: "gaming-consoles", name: "Consoles" },
  { slug: "tvs", name: "TVs" },
  { slug: "headphones", name: "Audio" },
];

export default async function Home() {
  const locale = getLocale(cookies().get("dm_lang")?.value);
  const products = await allProducts();
  const trending = [...products].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 6);
  const deals = products.filter((p) => (p.median ?? Infinity) < 4000).slice(0, 3);

  return (
    <>
      <section className="hero">
        <p style={{ margin: "0 0 4px", color: "var(--muted)", fontWeight: 700, fontSize: ".85rem" }}>
          📍 Casablanca · <span className="badge info">MAD</span>
        </p>
        <h1>{t(locale, "tagline")} <span className="grad">Know the real price.</span></h1>
        <p>{t(locale, "subtitle")}</p>
        <div style={{ maxWidth: 620, marginBottom: 14 }}>
          <SearchBar placeholder={t(locale, "searchPlaceholder")} />
        </div>
        <div className="chips" role="navigation" aria-label="Categories">
          <Link className="chip active" href="/explore">All</Link>
          {CATS.map((c) => (
            <Link key={c.slug} className="chip" href={`/explore?category=${c.slug}`}>
              <span aria-hidden="true">{catIcon(c.slug)}</span> {c.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="section-title">
        <h2>🔥 Trending Deals</h2>
        <Link href="/explore">See all →</Link>
      </div>
      <section aria-label="Trending deals" className="grid cols3 stagger">
        {trending.map((p) => <ProductCard key={p.id} p={p} />)}
      </section>

      {deals.length > 0 && (
        <>
          <div className="section-title">
            <h2>💰 Under 4,000 MAD</h2>
            <Link href="/search?maxPrice=4000">See all →</Link>
          </div>
          <section className="grid cols3 stagger">
            {deals.map((p) => <ProductCard key={p.id} p={p} />)}
          </section>
        </>
      )}

      <section className="card hero-card" style={{ marginTop: 26 }} aria-label="How it works">
        <h2 style={{ margin: "0 0 6px" }}>How DealMap protects you</h2>
        <p style={{ margin: "0 0 14px", opacity: 0.92 }}>1. Search a product → 2. See the market range → 3. Check the Deal Score before you pay.</p>
        <div className="cta-row">
          <Link className="btn" style={{ background: "#fff", color: "#1e4fd7" }} href="/search">{t(locale, "checkPrice")}</Link>
          <Link className="btn secondary" style={{ background: "rgba(255,255,255,.15)", color: "#fff", borderColor: "rgba(255,255,255,.4)" }} href="/compare">{t(locale, "compare")}</Link>
        </div>
      </section>

      <section className="grid cols2" style={{ marginTop: 16 }} aria-label="Product info">
        <div className="card"><h2 style={{ fontSize: "1rem" }}>{t(locale, "dealScore")}</h2><p style={{ color: "var(--muted)", fontSize: ".9rem" }}>0–100 deterministic score from median, quartiles and sample size. Excellent 90+, Good 75+, Fair 55+, Expensive 35+.</p><Link href="/help#deal-score" className="btn ghost small">Learn more →</Link></div>
        <div className="card"><h2 style={{ fontSize: "1rem" }}>{t(locale, "priceHistory")}</h2><p style={{ color: "var(--muted)", fontSize: ".9rem" }}>Observed, asking, reported and confirmed prices are kept separate. Sparse data is never made to look reliable.</p><Link href="/help#price-history" className="btn ghost small">Learn more →</Link></div>
        <div className="card"><h2 style={{ fontSize: "1rem" }}>{t(locale, "trust")}</h2><p style={{ color: "var(--muted)", fontSize: ".9rem" }}>Quality LOW / MEDIUM / HIGH / VERIFIED. Contributions are weighted, never trusted equally.</p><Link href="/help#trust" className="btn ghost small">Learn more →</Link></div>
        <div className="card"><h2 style={{ fontSize: "1rem" }}>{t(locale, "community")}</h2><p style={{ color: "var(--muted)", fontSize: ".9rem" }}>Contribute real prices with evidence. Build reputation with accurate, verified contributions.</p><Link href="/contribute" className="btn ghost small">Contribute →</Link></div>
      </section>

      <p style={{ marginTop: 16 }}><span className="badge">DEVELOPMENT / DEMO DATA</span></p>
    </>
  );
}
