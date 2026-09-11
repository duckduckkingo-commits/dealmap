"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "./ui-helpers";

interface AlertItem { id: string; productId: string; type: string; targetPrice?: number; targetScore?: number; active: boolean; local?: boolean }

export default function AlertsClient({ initialProduct }: { initialProduct?: string }) {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [productId, setProductId] = useState(initialProduct ?? "");
  const [type, setType] = useState("price_below");
  const [targetPrice, setTargetPrice] = useState("");
  const [msg, setMsg] = useState("");
  const [loggedIn, setLoggedIn] = useState(true);

  function localAlerts(): AlertItem[] {
    try { return JSON.parse(localStorage.getItem("dm_alerts") ?? "[]"); } catch { return []; }
  }

  async function load() {
    const local = localAlerts();
    try {
      const res = await fetch("/api/alerts");
      if (res.status === 401) { setLoggedIn(false); setItems(local); return; }
      const d = await res.json();
      setItems([...(d.items ?? []), ...local]);
    } catch { setItems(local); }
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!productId.trim()) { setMsg("Enter a product ID."); return; }
    const payload = { productId: productId.trim(), type, targetPrice: targetPrice ? Number(targetPrice) : undefined };
    try {
      const res = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setProductId(""); setTargetPrice(""); setMsg(""); toast("Alert created ✓"); load(); return; }
      if (res.status === 401) throw new Error("guest");
      setMsg("Could not create alert.");
    } catch {
      const item: AlertItem = { id: `local_${Date.now()}`, productId: payload.productId, type, targetPrice: payload.targetPrice, active: true, local: true };
      const next = [...localAlerts(), item];
      try { localStorage.setItem("dm_alerts", JSON.stringify(next)); } catch {}
      setItems((p) => [...p, item]);
      setProductId(""); setTargetPrice("");
      toast("Alert saved on this device ✓");
    }
  }

  async function toggle(a: AlertItem) {
    if (a.local) {
      const next = localAlerts().map((x) => x.id === a.id ? { ...x, active: !x.active } : x);
      try { localStorage.setItem("dm_alerts", JSON.stringify(next)); } catch {}
      setItems((p) => p.map((x) => x.id === a.id ? { ...x, active: !x.active } : x));
      return;
    }
    await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id: a.id }) });
    load();
  }

  async function del(a: AlertItem) {
    if (!confirm("Delete this alert?")) return;
    if (a.local) {
      const next = localAlerts().filter((x) => x.id !== a.id);
      try { localStorage.setItem("dm_alerts", JSON.stringify(next)); } catch {}
      setItems((p) => p.filter((x) => x.id !== a.id));
      toast("Alert deleted");
      return;
    }
    await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: a.id }) });
    load();
    toast("Alert deleted");
  }

  return (
    <>
      {!loggedIn && <p className="alert" role="note">You&rsquo;re browsing as a guest — alerts are saved on this device. <Link href="/auth/login">Log in</Link> to sync them.</p>}
      {msg && <p className="alert" role="status">{msg}</p>}
      <form onSubmit={create} className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }} aria-label="Create price alert">
        <div style={{ flex: "2 1 160px" }}><label htmlFor="al-p">Product</label><input id="al-p" value={productId} onChange={(e) => setProductId(e.target.value)} required placeholder="e.g. p_iphone13_128" /></div>
        <div style={{ flex: "1 1 150px" }}><label htmlFor="al-t">Type</label>
          <select id="al-t" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="price_below">Price below target</option>
            <option value="score_above">Deal Score above target</option>
            <option value="price_drop">Any price decrease</option>
            <option value="availability">Availability</option>
          </select>
        </div>
        <div style={{ flex: "1 1 130px" }}><label htmlFor="al-tp">Target price (MAD)</label><input id="al-tp" type="number" min={1} value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="e.g. 5500" /></div>
        <button className="btn" type="submit">🔔 Create alert</button>
      </form>
      {items.length === 0 ? (
        <div className="empty"><div className="big" aria-hidden="true">🔔</div><h2 style={{ color: "var(--fg)" }}>No alerts yet</h2><p>Get notified when a price drops to your target.</p></div>
      ) : (
        <div className="grid cols2 stagger" style={{ marginTop: 14 }}>
          {items.map((a) => (
            <article className="card" key={a.id}>
              <h3 style={{ margin: "0 0 4px" }}><Link href={`/product/${a.productId}`} style={{ color: "var(--fg)" }}>{a.productId}</Link></h3>
              <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: ".85rem" }}>{a.type} · target {a.targetPrice ?? a.targetScore ?? "any"} MAD {a.local ? "· on this device" : ""}</p>
              <div className="cta-row">
                <button className="toggle" role="switch" aria-checked={a.active} aria-label={`Alert for ${a.productId} ${a.active ? "on" : "off"}`} onClick={() => toggle(a)} />
                <button className="btn secondary small" onClick={() => del(a)}>Delete</button>
                <Link className="btn ghost small" href={`/product/${a.productId}`}>View →</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
