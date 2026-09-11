import Link from "next/link";

export const metadata = { title: "Help & support — DEALMAP" };

const FAQS = [
  { id: "deal-score", q: "How is the Deal Score calculated?", a: "The Deal Score (0–100) is deterministic and market-based: it compares your asking price to the market median, quartiles (IQR) and sample size. Excellent 90+, Good 75+, Fair 55+, Expensive 35+, Very Expensive below. No AI, no guesswork — sparse data is always flagged as low confidence." },
  { id: "price-history", q: "What does price history show?", a: "Observed market prices over time (asking, reported purchases, partner feeds and confirmed prices kept separate). Each point is a median of observations in that window. Few points = treat with caution." },
  { id: "trust", q: "What do LOW / MEDIUM / HIGH / VERIFIED mean?", a: "Data-quality tiers. VERIFIED observations (receipts, confirmed purchases) weigh most; LOW-quality or flagged data weighs least and never drives the score alone. Spam and manipulation attempts are penalized." },
  { id: "alerts", q: "How do alerts work?", a: "Open any product → Create alert → set a target price or score. We check new observations against your target and notify you in Alerts & Notifications. Guests keep alerts on-device; logged-in users sync them." },
  { id: "compare", q: "How do I compare products?", a: "Bottom bar → Compare → add up to 3 products. Reference prices, ranges, scores and specs appear side by side with the cheapest and best-scoring picks highlighted." },
  { id: "contribute", q: "How can I contribute a price?", a: "Contribute → pick the product, price in MAD, condition, seller type and city. Add a receipt photo for VERIFIED weight. Accurate contributions raise your reputation." },
];

export default function HelpPage() {
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Help & support</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Everything about Deal Scores, history, alerts and your account.</p>
      <div className="stagger">
        {FAQS.map((f) => (
          <details className="card" key={f.id} id={f.id} style={{ marginBottom: 10 }}>
            <summary style={{ fontWeight: 700, cursor: "pointer", minHeight: 44 }}>{f.q}</summary>
            <p style={{ color: "var(--muted)" }}>{f.a}</p>
          </details>
        ))}
      </div>
      <div className="card" id="contact" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>✉️ Contact support</h2>
        <p style={{ color: "var(--muted)" }}>Support is handled in-app. For account recovery use <Link href="/auth/forgot-password">forgot password</Link>. For data issues, <Link href="/contribute">contribute a correction</Link>.</p>
        <div className="cta-row">
          <Link className="btn secondary" href="/settings">Privacy & security</Link>
          <Link className="btn secondary" href="/notifications">Notifications</Link>
        </div>
      </div>
    </>
  );
}
