"use client";
import { useState } from "react";

export interface Deal {
  id: string;
  productRef: string | null;
  productName: string | null;
  storeName: string;
  url: string;
  price: number | null;
  currency: string;
  oldPrice: number | null;
  discountPct: number | null;
  ratingValue: number | null;
  reviewsCount: number | null;
  seller: string | null;
  location: string | null;
  availability: string;
  imageUrl: string | null;
  verificationStatus: string;
  lastChecked: string | null;
}

function Stars({ value, count }: { value: number | null; count: number | null }) {
  if (value === null) return <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>No ratings yet</span>;
  const full = Math.round(value);
  return (
    <span aria-label={`Rated ${value} out of 5${count !== null ? ` from ${count} reviews` : ""}`}>
      <span aria-hidden="true" style={{ color: "#f59e0b" }}>{"★".repeat(full)}{"☆".repeat(Math.max(0, 5 - full))}</span>
      {count !== null && <span style={{ color: "var(--muted)", fontSize: ".82rem" }}> ({count})</span>}
    </span>
  );
}

/** Real-offer card: photo, prices, rating, seller, exact link. Never any demo content. */
export default function DealCard({ deal }: { deal: Deal }) {
  const [imgOk, setImgOk] = useState(true);
  const showImg = imgOk && !!deal.imageUrl;
  return (
    <article className="card hoverable" aria-label={deal.productName ?? "Verified offer"} style={{ padding: 14 }}>
      {showImg ? (
        <img src={deal.imageUrl as string} alt={`Photo of ${deal.productName ?? "product"} at ${deal.storeName}`}
          onError={() => setImgOk(false)}
          style={{ width: "100%", height: 190, objectFit: "contain", borderRadius: 12, background: "var(--card-2)" }}
          loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div role="img" aria-label="Image unavailable" style={{ width: "100%", height: 190, display: "grid", placeItems: "center", borderRadius: 12, background: "var(--card-2)", border: "1px dashed var(--border)", color: "var(--muted)", fontWeight: 700 }}>
          Image unavailable
        </div>
      )}
      <h3 style={{ margin: "10px 0 4px", fontSize: "0.95rem", lineHeight: 1.35 }}>{deal.productName ?? "Verified offer"}</h3>
      <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: "1.15rem" }}>
        {deal.price !== null ? `${deal.price.toLocaleString("fr-MA")} ${deal.currency}` : "—"}
        {deal.oldPrice !== null && deal.oldPrice > (deal.price ?? 0) && (
          <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: ".85rem", textDecoration: "line-through", marginInlineStart: 8 }}>
            {deal.oldPrice.toLocaleString("fr-MA")} {deal.currency}
          </span>
        )}
        {deal.discountPct !== null && <span className="badge warn" style={{ marginInlineStart: 8 }}>−{deal.discountPct}%</span>}
      </p>
      <p style={{ margin: "4px 0" }}><Stars value={deal.ratingValue} count={deal.reviewsCount} /></p>
      <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: ".82rem" }}>
        {deal.seller ? `Sold by ${deal.seller} · ` : ""}{deal.storeName}{deal.location ? ` · ${deal.location}` : ""}
      </p>
      <p style={{ margin: "4px 0 10px", color: "var(--muted)", fontSize: ".78rem" }}>
        <span className="badge good">✓ Verified offer</span>{" "}
        Updated {deal.lastChecked ? new Date(deal.lastChecked).toLocaleString() : "—"}
      </p>
      <a className="btn block" href={deal.url} target="_blank" rel="nofollow noopener" aria-label={`Open this offer at ${deal.storeName} in a new tab`}>
        View offer →
      </a>
    </article>
  );
}
