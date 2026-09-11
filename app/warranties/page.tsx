"use client";
import { useEffect, useState } from "react";

export default function WarrantiesPage() {
  const [data, setData] = useState<{ warranties: { id: string; productId: string; endDate: string; startDate: string }[]; returns: { id: string; purchaseId: string; deadline: string; status: string }[] }>({ warranties: [], returns: [] });
  useEffect(() => {
    fetch("/api/purchases").then((r) => r.json()).then((d) => setData({ warranties: d.warranties ?? [], returns: d.returns ?? [] })).catch(() => undefined);
  }, []);
  return (
    <>
      <h1>Warranties & Returns</h1>
      <h2>Warranties</h2>
      {data.warranties.length === 0 ? <p>No warranties tracked.</p> : (
        <table><thead><tr><th>Product</th><th>Start</th><th>Expires</th><th>Status</th></tr></thead>
        <tbody>{data.warranties.map((w) => {
          const days = Math.ceil((+new Date(w.endDate) - Date.now()) / 86400000);
          return <tr key={w.id}><td>{w.productId}</td><td>{w.startDate.slice(0, 10)}</td><td>{w.endDate.slice(0, 10)}</td><td>{days < 0 ? "Expired" : days <= 30 ? `Expiring in ${days}d` : "Active"}</td></tr>;
        })}</tbody></table>
      )}
      <h2>Returns</h2>
      {data.returns.length === 0 ? <p>No returns tracked.</p> : (
        <table><thead><tr><th>Purchase</th><th>Deadline</th><th>Status</th></tr></thead>
        <tbody>{data.returns.map((r) => <tr key={r.id}><td>{r.purchaseId}</td><td>{String(r.deadline).slice(0, 10)}</td><td>{r.status}</td></tr>)}</tbody></table>
      )}
    </>
  );
}
