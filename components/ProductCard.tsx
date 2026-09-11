"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { catIcon } from "./categoryIcons";
import type { ProductWithMarket } from "@/lib/products";
import { toast } from "./ui-helpers";

export function savedIds(): string[] {
  try { return JSON.parse(localStorage.getItem("dm_saved") ?? "[]"); } catch { return []; }
}

export default function ProductCard({ p }: { p: ProductWithMarket }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(savedIds().includes(p.id)); }, [p.id]);

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const ids = savedIds();
    const next = saved ? ids.filter((x) => x !== p.id) : [...ids, p.id];
    try { localStorage.setItem("dm_saved", JSON.stringify(next)); } catch {}
    setSaved(!saved);
    toast(saved ? "Removed from saved" : "Saved ✓ Find it in the Saved tab");
    try {
      await fetch("/api/watchlist", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved ? { productId: p.id } : { productId: p.id }),
      });
    } catch {}
  }

  return (
    <article className="card hoverable pcard-wrap" aria-label={p.name} style={{ padding: 14 }}>
      <div className="pcard">
        <Link href={`/product/${p.id}`} className="pcard-img" aria-label={`View ${p.name}`} style={{ textDecoration: "none" }}>
          <span aria-hidden="true">{catIcon(p.category)}</span>
        </Link>
        <div className="pcard-body">
          <h3><Link href={`/product/${p.id}`}>{p.name}</Link></h3>
          <p className="pcard-meta">{p.brand} · {p.model}</p>
          <p className="pcard-price">{p.median !== null ? formatPrice(p.median) : "Price on check"}</p>
          <p className="pcard-sub">
            {p.count > 0 ? `${p.count} observations` : "New listing"}
            {p.min !== null && p.max !== null && p.count > 1 ? ` · ${formatPrice(p.min)}–${formatPrice(p.max)}` : ""}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {p.isDemo && <span className="badge">DEMO</span>}
            {p.median !== null && p.median < 3500 && <span className="badge good">Good deal</span>}
          </div>
        </div>
        <button className={`heart-btn${saved ? " saved" : ""}`} onClick={toggleSave} aria-pressed={saved} aria-label={saved ? `Remove ${p.name} from saved` : `Save ${p.name}`}>
          <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
        </button>
      </div>
    </article>
  );
}
