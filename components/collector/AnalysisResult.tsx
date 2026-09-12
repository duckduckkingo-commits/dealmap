import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { SmartScore } from "@/lib/smartdeal/score";

export interface AnalysisPayload {
  listing: {
    url: string; currency: string; missing: string[]; fetchNote: string; fetchedAt: string;
    problemLabels: string[];
    name: { value: string | null; label: string };
    brand: { value: string | null; label: string };
    model: { value: string | null; label: string };
    ramGB: { value: number | null; label: string };
    storageGB: { value: number | null; label: string };
    price: { value: number | null; label: string };
    condition: { value: string | null; label: string };
    warrantyMonths: { value: number | null; label: string };
    availability: { value: string | null; label: string };
    image: { value: string | null; label: string };
  };
  match: { method: string; confidence: number; productRef: string | null; productName: string | null; notes: string[] };
  market: { avg: number | null; low: number | null; high: number | null; count: number };
  history: { low: number; avg: number; high: number; count: number } | null;
  classicScore: { score: number; verdict: string } | null;
  smart: SmartScore;
  alternatives: { id: string; storeName: string; price: number | null; sourceUrl: string; verificationStatus: string; imageUrl: string | null }[];
}

function Cell({ k, v, label }: { k: string; v: string; label: string }) {
  return (
    <div className="kv"><span>{k}</span><b>{v} <small style={{ color: "var(--muted)", fontWeight: 400 }}>· {label}</small></b></div>
  );
}

const txt = (x: { value: string | number | null; label: string }) => (x.value === null || x.value === undefined || x.value === "" ? "Unknown / Not available" : String(x.value));

export default function AnalysisResult({ data }: { data: AnalysisPayload }) {
  const L = data.listing;
  const cur = L.currency || "MAD";
  const price = L.price.value;
  return (
    <div className="stagger" style={{ marginTop: 16 }}>
      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", color: "var(--muted)", fontWeight: 700, fontSize: ".82rem" }}>DEAL SCORE</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="score-ring" style={{ ["--p" as string]: data.smart.score }} role="img" aria-label={`Smart deal score ${data.smart.score} of 100, ${data.smart.verdict}`}>
            <span>{data.smart.score}</span>
          </div>
        </div>
        <h2 style={{ margin: "8px 0 2px" }}>{data.smart.score}/100 — {data.smart.verdict}</h2>
        <p><span className={`badge ${data.smart.recommendation === "AVOID" ? "bad" : data.smart.recommendation === "BUY" || data.smart.recommendation === "GOOD DEAL" ? "good" : "warn"}`}>{data.smart.recommendation}</span> <span className="badge info">Confidence: {data.smart.confidence}</span></p>
        {price !== null && <p style={{ fontSize: "1.25rem", fontWeight: 800, margin: "4px 0" }}>{formatPrice(price, cur)} — {data.smart.verdict}</p>}
        {data.smart.redFlags.length > 0 && (
          <div className="alert error" role="alert" style={{ textAlign: "start" }}><b>Red flags:</b><ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>{data.smart.redFlags.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
        )}
        <div style={{ textAlign: "start" }}><b>Why this score:</b><ul style={{ paddingInlineStart: 18 }}>{data.smart.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
      </div>

      <div className="grid cols2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Product</h2>
          {L.image.value && (
            <img src={L.image.value} alt={`Photo of ${L.name.value ?? "analyzed product"} from the listing`}
              style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 12, border: "1px solid var(--border)", background: "var(--card-2)" }}
              loading="lazy" referrerPolicy="no-referrer" />
          )}
          <Cell k="Name" v={txt(L.name)} label={L.name.label} />
          <Cell k="Brand" v={txt(L.brand)} label={L.brand.label} />
          <Cell k="Model" v={txt(L.model)} label={L.model.label} />
          <Cell k="RAM" v={L.ramGB.value !== null ? `${L.ramGB.value} GB` : "Unknown / Not available"} label={L.ramGB.label} />
          <Cell k="Storage" v={L.storageGB.value !== null ? `${L.storageGB.value} GB` : "Unknown / Not available"} label={L.storageGB.label} />
          <Cell k="Condition" v={txt(L.condition)} label={L.condition.label} />
          <p style={{ color: "var(--muted)", fontSize: ".83rem" }}>Match: {data.match.method} ({Math.round(data.match.confidence * 100)}%){data.match.productName ? ` → ${data.match.productName}` : " — treated as its own listing"}{data.match.productRef && <> · <Link href={`/product/${data.match.productRef}`}>Open in DEALMAP →</Link></>}</p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Price analysis</h2>
          <Cell k="Current price" v={price !== null ? formatPrice(price, cur) : "Unknown / Not available"} label={L.price.label} />
          <Cell k="Market average" v={data.market.avg !== null ? formatPrice(data.market.avg) : "Unknown / Not available"} label={data.market.avg !== null ? "Verified" : "Unknown"} />
          <Cell k="Lowest available" v={data.market.low !== null ? formatPrice(data.market.low) : "Unknown / Not available"} label={data.market.low !== null ? "Reported" : "Unknown"} />
          <Cell k="History" v={data.history ? `${formatPrice(data.history.low)} – ${formatPrice(data.history.high)} (avg ${formatPrice(data.history.avg)}, n=${data.history.count})` : "Unknown / Not available"} label={data.history ? "Reported" : "Unknown"} />
          {data.classicScore && <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>Classic market score: <b>{data.classicScore.score}/100 · {data.classicScore.verdict}</b> (one input of the smart score)</p>}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Quality & risk</h2>
        <Cell k="Warranty" v={L.warrantyMonths.value !== null ? (L.warrantyMonths.value <= 0 ? "No warranty" : `${L.warrantyMonths.value} months`) : "Unknown / Not available"} label={L.warrantyMonths.label} />
        <Cell k="Availability" v={txt(L.availability)} label={L.availability.label} />
        <div className="kv"><span>Reported problems</span><b style={{ maxWidth: "60%" }}>{L.problemLabels.join(" ")}</b></div>
        {L.missing.length > 0 && <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>Missing from listing: {L.missing.join(", ")} — shown as Unknown, never guessed.</p>}
        <p style={{ color: "var(--muted)", fontSize: ".8rem" }}>Checked {new Date(L.fetchedAt).toLocaleString()} · {L.fetchNote}</p>
      </div>

      {data.alternatives.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Better / alternative offers ({data.alternatives.length})</h2>
          <div className="table-scroll"><table><thead><tr><th></th><th>Store</th><th>Price</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.alternatives.map((a) => (
              <tr key={a.id}>
                <td>{a.imageUrl ? <img src={a.imageUrl} alt="" width={48} height={48} style={{ objectFit: "contain", borderRadius: 8 }} loading="lazy" referrerPolicy="no-referrer" /> : <span aria-hidden="true">🏷️</span>}</td>
                <td>{a.storeName}</td><td><b>{a.price !== null ? formatPrice(a.price) : "—"}</b></td><td>{a.verificationStatus}</td>
                <td><a className="btn secondary small" href={a.sourceUrl} target="_blank" rel="nofollow noopener">Open →</a></td></tr>
            ))}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
