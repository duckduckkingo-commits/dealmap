"use client";
import { useState } from "react";

export default function ContributePage({ searchParams }: { searchParams: { product?: string } }) {
  const [productId, setProductId] = useState(searchParams.product ?? "p_iphone13_128");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("used_good");
  const [location, setLocation] = useState("Casablanca");
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const res = await fetch("/api/contributions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, price: Number(price), condition, location }) });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "Failed"); return; }
    if (file) {
      const b64 = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(file); });
      await fetch("/api/receipts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, mime: file.type || "image/jpeg", dataBase64: b64 }) });
    }
    setMsg("Thanks! Contribution recorded as pending review. Reputation rewards verified prices.");
    setPrice("");
  }
  return (
    <>
      <h1>Contribute a price</h1>
      <form onSubmit={submit} className="card" style={{ maxWidth: 520 }}>
        <label htmlFor="p">Product</label><input id="p" value={productId} onChange={(e) => setProductId(e.target.value)} required />
        <label htmlFor="pr">Price (MAD)</label><input id="pr" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} required />
        <label htmlFor="c">Condition</label>
        <select id="c" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="new">New</option><option value="like_new">Like new</option><option value="used_good">Used — good</option><option value="used_fair">Used — fair</option><option value="refurbished">Refurbished</option>
        </select>
        <label htmlFor="l">Location</label><input id="l" value={location} onChange={(e) => setLocation(e.target.value)} />
        <label htmlFor="f">Evidence (optional receipt, max 5MB)</label><input id="f" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div style={{ marginTop: 12 }}><button className="btn" type="submit">Submit</button></div>
        {msg && <p className="alert" role="status">{msg}</p>}
      </form>
    </>
  );
}
