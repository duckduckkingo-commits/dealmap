import { searchProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";

export const metadata = { title: "Search — DEALMAP" };

const SORTS = [
  { v: "relevance", label: "Relevance" },
  { v: "price-asc", label: "Price ↑" },
  { v: "price-desc", label: "Price ↓" },
];

export default async function Search({ searchParams }: { searchParams: { q?: string; category?: string; maxPrice?: string; sort?: string } }) {
  const q = searchParams.q ?? "";
  let results = await searchProducts(q, { category: searchParams.category || undefined, maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined });
  if (searchParams.sort === "price-asc") results = [...results].sort((a, b) => (a.median ?? Infinity) - (b.median ?? Infinity));
  if (searchParams.sort === "price-desc") results = [...results].sort((a, b) => (b.median ?? -1) - (a.median ?? -1));
  return (
    <>
      <h1 style={{ marginBottom: 8 }}>Search</h1>
      <SearchBar initial={q} placeholder="Search brand, model, product… (e.g. iPhone 13, ThinkPad)" />
      <form method="get" action="/search" className="card" style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "end" }} aria-label="Filters">
        <input type="hidden" name="q" value={q} />
        <div style={{ flex: "1 1 140px" }}>
          <label htmlFor="f-cat">Category</label>
          <select id="f-cat" name="category" defaultValue={searchParams.category ?? ""}>
            <option value="">All categories</option>
            {["smartphones", "laptops", "pc-components", "tablets", "smartwatches", "gaming-consoles", "tvs", "headphones", "cameras"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label htmlFor="f-max">Max price (MAD)</label>
          <input id="f-max" name="maxPrice" type="number" min={0} placeholder="e.g. 6000" defaultValue={searchParams.maxPrice ?? ""} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label htmlFor="f-sort">Sort</label>
          <select id="f-sort" name="sort" defaultValue={searchParams.sort ?? "relevance"}>
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        <button className="btn" type="submit">Apply</button>
        <a className="btn secondary" href="/search">Reset</a>
      </form>
      <p style={{ color: "var(--muted)" }} role="status">{results.length} result(s){q && <> for “{q}”</>}</p>
      {results.length === 0 ? (
        <div className="empty"><div className="big" aria-hidden="true">🔍</div><p>No matches. Try another brand or model, or <a href="/contribute">contribute</a> this product.</p></div>
      ) : (
        <div className="grid cols3 stagger">{results.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </>
  );
}
