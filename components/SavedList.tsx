"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { toast } from "./ui-helpers";

interface P { id: string; name: string; brand: string; median: number | null; count: number }

export default function SavedList({ initialAdd }: { initialAdd?: string }) {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let local: string[] = [];
    try { local = JSON.parse(localStorage.getItem("dm_saved") ?? "[]"); } catch {}
    if (initialAdd && !local.includes(initialAdd)) {
      local = [...local, initialAdd];
      try { localStorage.setItem("dm_saved", JSON.stringify(local)); } catch {}
      toast("Saved ✓");
      fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: initialAdd }) }).catch(() => {});
    }
    setIds(local);
    if (local.length === 0) { setLoading(false); return; }
    Promise.all(local.map((id) => fetch(`/api/products?q=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => null)))
      .then(() => fetch("/api/products?q=").then((r) => r.json()).catch(() => ({ items: [] })))
      .then((d) => {
        const all: P[] = d.items ?? d.products ?? [];
        const byId = new Map(all.map((p) => [p.id, p]));
        setProducts(local.map((id) => byId.get(id)).filter(Boolean) as P[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch("/api/watchlist").then((r) => r.json()).then((d) => {
      const serverIds: string[] = (d.items ?? []).map((x: { productId: string }) => x.productId);
      if (serverIds.length) {
        setIds((prev) => {
          const merged = [...new Set([...prev, ...serverIds])];
          try { localStorage.setItem("dm_saved", JSON.stringify(merged)); } catch {}
          return merged;
        });
      }
    }).catch(() => {});
  }, [initialAdd]);

  function remove(id: string) {
    const next = ids.filter((x) => x !== id);
    setIds(next);
    setProducts((p) => p.filter((x) => x.id !== id));
    try { localStorage.setItem("dm_saved", JSON.stringify(next)); } catch {}
    toast("Removed from saved");
    fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", productId: id }) }).catch(() => {});
  }

  if (loading) return <div aria-busy="true"><div className="skel" style={{ height: 90, marginBottom: 10 }} /><div className="skel" style={{ height: 90 }} /><p style={{ color: "var(--muted)" }}>Loading saved products…</p></div>;
  if (ids.length === 0)
    return (
      <div className="empty">
        <div className="big" aria-hidden="true">♡</div>
        <h2 style={{ color: "var(--fg)" }}>No saved yet</h2>
        <p>Tap the heart on any product to save it here and track its price.</p>
        <Link className="btn" href="/explore">Explore products</Link>
      </div>
    );
  return (
    <div className="grid cols3 stagger">
      {ids.map((id) => {
        const p = products.find((x) => x.id === id);
        return (
          <article className="card hoverable" key={id}>
            <h3 style={{ margin: "0 0 4px" }}><Link href={`/product/${id}`} style={{ color: "var(--fg)" }}>{p?.name ?? id}</Link></h3>
            <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: ".85rem" }}>{p?.brand ?? ""}{p?.median != null ? ` · ${formatPrice(p.median)}` : ""}</p>
            <div className="cta-row">
              <Link className="btn small" href={`/product/${id}`}>View deal</Link>
              <Link className="btn secondary small" href={`/alerts?product=${id}`}>🔔 Alert</Link>
              <button className="btn ghost small" onClick={() => remove(id)} aria-label={`Remove ${p?.name ?? id} from saved`}>Remove</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
