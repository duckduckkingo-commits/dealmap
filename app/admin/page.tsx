"use client";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [data, setData] = useState<{ users?: number; contributionsList?: { id: string; productId: string; price: number; status: string }[]; usersList?: { id: string; name: string; email: string; role: string }[] } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/admin?scope=overview").then(async (r) => {
      if (!r.ok) { setErr("Forbidden — ADMIN or OWNER only."); return; }
      setData(await r.json());
    }).catch(() => setErr("Network error"));
  }, []);
  async function moderate(id: string, decision: "approve" | "reject") {
    await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "moderate-contribution", id, decision }) });
    location.reload();
  }
  if (err) return <><h1>Admin</h1><p className="alert error" role="alert">{err}</p></>;
  if (!data) return <><h1>Admin</h1><p>Loading…</p></>;
  return (
    <>
      <h1>Admin moderation</h1>
      <p style={{ color: "var(--muted)" }}>You can moderate contributions and reports. You cannot become OWNER or access owner security data.</p>
      <h2>Pending contributions</h2>
      {(data.contributionsList ?? []).length === 0 ? <p>Nothing here yet.</p> : (
        <table><thead><tr><th>ID</th><th>Product</th><th>Price</th><th>Status</th><th></th></tr></thead>
        <tbody>{(data.contributionsList ?? []).map((c) => <tr key={c.id}><td>{c.id}</td><td>{c.productId}</td><td>{c.price}</td><td>{c.status}</td><td><button className="btn secondary" onClick={() => moderate(c.id, "approve")}>Approve</button> <button className="btn secondary" onClick={() => moderate(c.id, "reject")}>Reject</button></td></tr>)}</tbody></table>
      )}
    </>
  );
}
