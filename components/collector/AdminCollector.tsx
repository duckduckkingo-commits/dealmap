"use client";
import { useEffect, useState } from "react";
import { toast } from "../ui-helpers";

interface Health {
  lastRun: { id: string; status: string; startedAt: string; checked: number; updated: number; skipped: number; errors: string[]; notes: string[] } | null;
  offers: number; products: number; stale: number; pendingSubmissions: number; verifiedOffers: number;
}

export default function AdminCollector() {
  const [data, setData] = useState<{ health: Health; runs: Health["lastRun"][]; stores: { id: string; name: string; homepage: string; reliability: number | null; allowRecheck: boolean }[]; submissions: { id: string; productName: string | null; storeName: string | null; price: number | null; url: string | null; createdAt: string }[] } | null>(null);
  const [weights, setWeights] = useState<{ factors: { key: string; label: string; def: number }[]; weights: Record<string, number> } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState("storeName, url, price, currency, condition");
  const [rights, setRights] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  async function load() {
    const r = await fetch("/api/collector/runs");
    if (!r.ok) { setErr("Forbidden — ADMIN or OWNER only."); return; }
    setData(await r.json());
    const w = await fetch("/api/collector/weights");
    if (w.ok) setWeights(await w.json());
  }
  useEffect(() => { load(); }, []);

  async function tick() {
    setBusy(true);
    const r = await fetch("/api/collector/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "tick", limit: 20 }) });
    if (r.ok) toast("Collection run finished ✓");
    else toast("Run failed");
    setBusy(false); load();
  }

  async function toggleRecheck(id: string, on: boolean) {
    await fetch("/api/collector/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "recheck", id, on }) });
    toast(on ? "Auto re-check ON for this store" : "Auto re-check OFF");
    load();
  }

  async function importCsv() {
    if (!rights) { setImportMsg("Tick the rights confirmation first."); return; }
    const r = await fetch("/api/collector/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv, rightsConfirmed: true }) });
    const d = await r.json();
    if (!r.ok) { setImportMsg(d.error || "Import failed."); return; }
    setImportMsg(`Imported ${d.imported} offers ✓${d.rejected.length ? ` · ${d.rejected.length} lines rejected (see console)` : ""}`);
    console.log("CSV rejected lines:", d.rejected);
    toast(`Imported ${d.imported} offers ✓`);
    setCsv("");
    load();
  }

  async function review(id: string, action: "verify" | "reject") {
    if (!confirm(`${action} this submission?`)) return;
    await fetch("/api/collector/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) });
    toast(action === "verify" ? "Submission verified ✓" : "Submission rejected");
    load();
  }

  async function saveWeights() {
    if (!weights) return;
    const r = await fetch("/api/collector/weights", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weights: weights.weights }) });
    if (r.ok) { toast("Weights saved ✓"); load(); } else toast("Could not save weights");
  }

  if (err) return <p className="alert error" role="alert">{err}</p>;
  if (!data) return <p>Loading collector…</p>;
  const h = data.health;

  return (
    <div className="stagger">
      <div className="grid cols3">
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{h.offers}</div><p style={{ color: "var(--muted)", margin: 0 }}>Offers ({h.verifiedOffers} verified)</p></div>
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{h.products}</div><p style={{ color: "var(--muted)", margin: 0 }}>Products tracked</p></div>
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{h.stale}</div><p style={{ color: "var(--muted)", margin: 0 }}>Stale offers</p></div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-title" style={{ margin: "0 0 8px" }}><h2>Collector runs</h2><button className="btn small" onClick={tick} disabled={busy}>{busy ? "Running…" : "▶ Run update now"}</button></div>
        {h.lastRun
          ? <p style={{ color: "var(--muted)" }}>Last: {h.lastRun.status} · {h.lastRun.checked} checked · {h.lastRun.updated} updated · {h.lastRun.skipped} skipped · {new Date(h.lastRun.startedAt).toLocaleString()}{h.lastRun.errors.length > 0 && <> · <b style={{ color: "var(--bad)" }}>{h.lastRun.errors.length} errors</b></>}</p>
          : <p style={{ color: "var(--muted)" }}>No runs yet — press “Run update now”.</p>}
        {h.lastRun && h.lastRun.errors.length > 0 && (
          <div className="alert error"><b>Failed sources / errors:</b><ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>{h.lastRun.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul></div>
        )}
        {h.lastRun && (h.lastRun.notes ?? []).length > 0 && (
          <div className="alert"><b>Skipped (by rule):</b><ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>{(h.lastRun.notes ?? []).slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul></div>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Data sources</h2>
        <div className="table-scroll"><table><thead><tr><th>Store</th><th>Homepage</th><th>Reliability</th><th>Auto re-check</th></tr></thead>
          <tbody>{data.stores.map((s) => (
            <tr key={s.id}><td>{s.name}</td><td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{s.homepage}</td><td>{s.reliability === null ? "Unknown" : s.reliability}</td>
              <td><button className="toggle" role="switch" aria-checked={s.allowRecheck} aria-label={`Auto re-check ${s.name}`} onClick={() => toggleRecheck(s.id, !s.allowRecheck)} /></td></tr>
          ))}</tbody></table></div>
        <p style={{ color: "var(--muted)", fontSize: ".83rem" }}>Re-checking stays OFF by default. Turning it ON re-fetches only that store's known offer URLs, and only where robots.txt allows — disallowed ones are logged as skipped.</p>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Import real price list (CSV)</h2>
        <p style={{ color: "var(--muted)" }}>One per line: <code>storeName, url, price, currency, condition</code>. Only data you have the right to use.</p>
        <label htmlFor="csv">CSV lines</label>
        <textarea id="csv" rows={4} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"Jumia MA, https://..., 5499, MAD, new"} />
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} style={{ width: "auto", minHeight: "auto" }} />
          I confirm I may use this data
        </label>
        <div className="cta-row" style={{ marginTop: 8 }}><button className="btn" onClick={importCsv}>Import as pending offers</button></div>
        {importMsg && <p className="alert" role="status">{importMsg}</p>}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>User submissions ({data.submissions.length} pending)</h2>
        {data.submissions.length === 0 ? <p style={{ color: "var(--muted)" }}>Nothing pending.</p> : (
          <div className="table-scroll"><table><thead><tr><th>Product</th><th>Store</th><th>Price</th><th></th></tr></thead>
            <tbody>{data.submissions.map((s) => (
              <tr key={s.id}><td>{s.productName ?? s.url ?? s.id}</td><td>{s.storeName ?? "—"}</td><td>{s.price ?? "—"}</td>
                <td><button className="btn secondary small" onClick={() => review(s.id, "verify")}>Verify</button> <button className="btn ghost small" onClick={() => review(s.id, "reject")}>Reject</button></td></tr>
            ))}</tbody></table></div>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Deal Score weights</h2>
        {!weights ? <p>Loading…</p> : (
          <>
            {weights.factors.map((f) => (
              <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <label htmlFor={`w-${f.key}`} style={{ flex: "1 1 160px", margin: 0 }}>{f.label}</label>
                <input id={`w-${f.key}`} type="number" min={0} max={1000} style={{ maxWidth: 110 }}
                  value={weights.weights[f.key] ?? f.def}
                  onChange={(e) => setWeights({ ...weights, weights: { ...weights.weights, [f.key]: Number(e.target.value) } })} />
              </div>
            ))}
            <button className="btn" onClick={saveWeights}>Save weights</button>
            <p style={{ color: "var(--muted)", fontSize: ".83rem" }}>Weights normalize to 100 at scoring time. Unknown evidence stays neutral and is always disclosed on the result page.</p>
          </>
        )}
      </div>
    </div>
  );
}
