import { allProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { catIcon } from "@/components/categoryIcons";
import Link from "next/link";

export const metadata = { title: "Explore — DEALMAP" };

const CATS = [
  { slug: "", name: "All", icon: "🏷️" },
  { slug: "smartphones", name: "Smartphones" },
  { slug: "laptops", name: "Laptops" },
  { slug: "pc-components", name: "PC parts" },
  { slug: "tablets", name: "Tablets" },
  { slug: "smartwatches", name: "Watches" },
  { slug: "gaming-consoles", name: "Consoles" },
  { slug: "tvs", name: "TVs" },
  { slug: "headphones", name: "Audio" },
  { slug: "cameras", name: "Cameras" },
];

export default async function Explore({ searchParams }: { searchParams: { category?: string } }) {
  const products = await allProducts();
  const active = searchParams.category ?? "";
  const filtered = active ? products.filter((p) => p.category === active) : products;
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Explore</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>{filtered.length} product{filtered.length === 1 ? "" : "s"} · Morocco market · MAD</p>
      <div className="chips" role="navigation" aria-label="Filter by category">
        {CATS.map((c) => (
          <Link key={c.slug || "all"} className={`chip${(c.slug === active) ? " active" : ""}`}
            href={c.slug ? `/explore?category=${encodeURIComponent(c.slug)}` : "/explore"}
            aria-current={c.slug === active ? "true" : undefined}>
            <span aria-hidden="true">{c.icon ?? catIcon(c.slug)}</span> {c.name}
          </Link>
        ))}
      </div>
      <div className="cat-grid" style={{ margin: "6px 0 16px" }} aria-label="Categories">
        {CATS.slice(1).map((c) => (
          <Link key={c.slug} className="cat-tile" href={`/explore?category=${encodeURIComponent(c.slug)}`}>
            <span className="ico" aria-hidden="true">{catIcon(c.slug)}</span>{c.name}
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty"><div className="big" aria-hidden="true">📦</div><p>Nothing here yet. Try another category or <Link href="/contribute">contribute this product</Link>.</p></div>
      ) : (
        <div className="grid cols3 stagger">{filtered.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
    </>
  );
}
