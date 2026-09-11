import { allProducts, observationsFor } from "@/lib/products";
import { dealScoreEngine } from "@/lib/dealScore";
import { formatPrice } from "@/lib/format";
import type { ProductWithMarket } from "@/lib/products";
import type { DealScoreResult } from "@/types";
import { ScoreRing } from "@/components/ScoreBadge";
import ComparePicker from "@/components/ComparePicker";
import Link from "next/link";

export const metadata = { title: "Compare — DEALMAP" };

export default async function Compare({ searchParams }: { searchParams: { ids?: string } }) {
  const all = await allProducts();
  const ids = (searchParams.ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const rows: { p: ProductWithMarket; deal: DealScoreResult | null }[] = [];
  for (const id of ids) {
    const p = all.find((x) => x.id === id);
    if (!p) continue;
    const obs = await observationsFor(id);
    const deal = p.median !== null ? dealScoreEngine({ askingPrice: p.median, observations: obs }) : null;
    rows.push({ p, deal });
  }
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Compare</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Side-by-side prices, ranges & Deal Scores (up to 3).</p>
      <ComparePicker all={all.map((p) => ({ id: p.id, name: p.name }))} current={ids} />
      {rows.length === 0 ? (
        <div className="empty">
          <div className="big" aria-hidden="true">⇄</div>
          <h2 style={{ color: "var(--fg)" }}>Pick products to compare</h2>
          <p>Search above or tapcompare on any product page.</p>
          <div className="grid cols3 stagger" style={{ marginTop: 12, textAlign: "start" }}>
            {all.slice(0, 6).map((p) => (
              <div className="card hoverable" key={p.id}>
                <Link href={`/product/${p.id}`} style={{ color: "var(--fg)", fontWeight: 700 }}>{p.name}</Link>
                <p style={{ color: "var(--muted)" }}>{p.median !== null ? formatPrice(p.median) : "No data"}</p>
                <Link className="btn secondary small" href={`/compare?ids=${p.id}`}>Compare</Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="compare-grid stagger" style={{ marginTop: 14 }}>
            {rows.map(({ p, deal }) => (
              <article className="card hoverable" key={p.id} style={{ textAlign: "center" }}>
                <h3 style={{ margin: "0 0 8px" }}><Link href={`/product/${p.id}`} style={{ color: "var(--fg)" }}>{p.name}</Link></h3>
                <div style={{ display: "flex", justifyContent: "center" }}><ScoreRing score={deal?.score ?? null} verdict={deal?.verdict} /></div>
                <p style={{ fontWeight: 800, fontSize: "1.2rem", margin: "10px 0 2px" }}>{p.median !== null ? formatPrice(p.median) : "No data"}</p>
                <p style={{ color: "var(--muted)", fontSize: ".83rem", margin: 0 }}>{p.min !== null ? `${formatPrice(p.min)} – ${formatPrice(p.max)}` : "—"} · {p.count} obs</p>
                <p><span className={`badge ${deal && deal.score >= 75 ? "good" : deal && deal.score >= 55 ? "info" : deal ? "warn" : ""}`}>{deal ? `${deal.score}/100 · ${deal.verdict}` : "No score"}</span></p>
                <div className="cta-row" style={{ justifyContent: "center" }}>
                  <Link className="btn small" href={`/product/${p.id}`}>View</Link>
                  <Link className="btn secondary small" href={`/compare?ids=${rows.filter((r) => r.p.id !== p.id).map((r) => r.p.id).join(",")}`}>Remove</Link>
                </div>
              </article>
            ))}
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>Top differences</h2>
            <div className="kv"><span>Cheapest reference</span><b>{rows.slice().sort((a, b) => (a.p.median ?? Infinity) - (b.p.median ?? Infinity))[0]?.p.name}</b></div>
            <div className="kv"><span>Best Deal Score</span><b>{rows.slice().sort((a, b) => (b.deal?.score ?? -1) - (a.deal?.score ?? -1))[0]?.p.name ?? "—"}</b></div>
            <div className="kv"><span>Most observed</span><b>{rows.slice().sort((a, b) => b.p.count - a.p.count)[0]?.p.name}</b></div>
          </div>
          <div className="table-scroll card" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Spec</th>{rows.map(({ p }) => <th key={p.id}>{p.brand} {p.model}</th>)}</tr></thead>
              <tbody>
                <tr><td>Reference</td>{rows.map(({ p }) => <td key={p.id}>{p.median !== null ? formatPrice(p.median) : "—"}</td>)}</tr>
                <tr><td>Specs</td>{rows.map(({ p }) => <td key={p.id}>{Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
