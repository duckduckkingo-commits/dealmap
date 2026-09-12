import AnalyzeForm from "@/components/collector/AnalyzeForm";
import Link from "next/link";

export const metadata = { title: "Analyze a Product Link — DEALMAP" };

export default function AnalyzePage() {
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Analyze a Product Link</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Paste the link of the phone or product you want to buy. DEALMAP extracts what the page
        actually says, matches it, and scores the deal — <b>Unknown</b> when it cannot verify, never invented.
      </p>
      <AnalyzeForm />
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>How it works</h2>
        <p style={{ color: "var(--muted)" }}>
          1. We fetch the pasted page once and read its specifications, price, condition and warranty.{" "}
          2. We match it (EAN → model → brand + specs → fuzzy).{" "}
          3. We compare against market prices, history and other offers, then compute a transparent
          Smart Deal Score with weights you can inspect. Found a good price elsewhere?{" "}
          <Link href="/contribute">Submit the deal</Link> — an admin verifies it before it counts.
        </p>
      </div>
    </>
  );
}
