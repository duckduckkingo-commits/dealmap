"use client";
import { useState } from "react";
import AnalysisResult, { type AnalysisPayload } from "./AnalysisResult";
import { toast } from "../ui-helpers";

export default function AnalyzeForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<AnalysisPayload | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setData(null);
    if (!/^https?:\/\//i.test(url.trim())) { setErr("Paste a full product link starting with http(s)://"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/collector/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Analysis failed."); return; }
      setData(d);
      toast("Analysis ready ✓");
    } catch { setErr("Network error — try again."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <form onSubmit={submit} className="card" role="search" aria-label="Analyze a product link" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: "1 1 260px" }}>
          <label htmlFor="an-url">Product link (phone / product you want to buy)</label>
          <input id="an-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://store.example/product/..." required autoComplete="off" />
        </div>
        <button className="btn" type="submit" disabled={loading}>{loading ? "Analyzing…" : "Analyze deal"}</button>
      </form>
      {loading && <div aria-busy="true" style={{ marginTop: 14 }}><div className="skel" style={{ height: 120, marginBottom: 10 }} /><div className="skel" style={{ height: 60 }} /><p style={{ color: "var(--muted)" }}>Fetching the listing, matching the product, scoring the deal…</p></div>}
      {err && <p className="alert error" role="alert">{err}</p>}
      {data && <AnalysisResult data={data} />}
    </>
  );
}
