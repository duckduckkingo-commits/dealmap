"use client";
import { useEffect, useState } from "react";

export default function PurchasesPage() {
  const [data, setData] = useState<{ purchases: { id: string; productId: string; price: number; date: string; seller?: string }[] }>({ purchases: [] });
  const [productId, setProductId] = useState("p_iphone13_128");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [seller, setSeller] = useState("");
  const [msg, setMsg] = useState("");
  async function load() {
    const res = await fetch("/api/purchases");
    if (res.status === 401) { setMsg("Please log in to record purchases."); return; }
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, price: Number(price), date, seller }) });
    if (res.ok) { setPrice(""); setSeller(""); load(); } else setMsg("Could not save purchase.");
  }
  async function del(id: string) {
    if (!confirm("Delete this purchase? This also removes linked warranty/return entries.")) return;
    await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    load();
  }
  return (
    <>
      <h1>Purchases</h1>
      <p style={{ color: "var(--muted)" }}>Private — only you can see these.</p>
      {msg && <p className="alert" role="status">{msg}</p>}
      <form onSubmit={add} className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <div><label htmlFor="pid">Product</label><input id="pid" value={productId} onChange={(e) => setProductId(e.target.value)} required /></div>
        <div><label htmlFor="pr">Price (MAD)</label><input id="pr" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
        <div><label htmlFor="dt">Date</label><input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div><label htmlFor="se">Seller</label><input id="se" value={seller} onChange={(e) => setSeller(e.target.value)} /></div>
        <button className="btn" type="submit">Record</button>
      </form>
      {data.purchases.length === 0 ? <p>Nothing here yet.</p> : (
        <table><thead><tr><th>Product</th><th>Price</th><th>Date</th><th>Seller</th><th></th></tr></thead>
        <tbody>{data.purchases.map((p) => <tr key={p.id}><td>{p.productId}</td><td>{p.price}</td><td>{p.date}</td><td>{p.seller ?? "—"}</td><td><button className="btn secondary" onClick={() => del(p.id)}>Delete</button></td></tr>)}</tbody></table>
      )}
    </>
  );
}
