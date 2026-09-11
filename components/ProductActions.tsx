"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { savedIds } from "./ProductCard";
import { toast } from "./ui-helpers";

export default function ProductActions({ id, name }: { id: string; name: string }) {
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);
  useEffect(() => {
    setSaved(savedIds().includes(id));
    try { setCompared((JSON.parse(localStorage.getItem("dm_compare") ?? "[]") as string[]).includes(id)); } catch {}
  }, [id]);

  function save() {
    const ids = savedIds();
    const next = saved ? ids.filter((x) => x !== id) : [...ids, id];
    try { localStorage.setItem("dm_saved", JSON.stringify(next)); } catch {}
    setSaved(!saved);
    toast(saved ? "Removed from saved" : "Saved ✓ Find it in the Saved tab");
    fetch("/api/watchlist", { method: saved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: id }) }).catch(() => {});
  }

  function compare() {
    let arr: string[] = [];
    try { arr = JSON.parse(localStorage.getItem("dm_compare") ?? "[]"); } catch {}
    const next = compared ? arr.filter((x) => x !== id) : [...arr, id].slice(-3);
    try { localStorage.setItem("dm_compare", JSON.stringify(next)); } catch {}
    setCompared(!compared);
    toast(compared ? "Removed from comparison" : "Added to comparison ✓");
  }

  return (
    <div className="cta-row" style={{ marginTop: 14 }} role="group" aria-label={`Actions for ${name}`}>
      <button className="btn secondary" onClick={save} aria-pressed={saved}>{saved ? "♥ Saved" : "♡ Save"}</button>
      <button className="btn secondary" onClick={compare} aria-pressed={compared}>{compared ? "✓ In compare" : "⇄ Compare"}</button>
      <Link className="btn secondary" href={`/watchlist?add=${id}`}>+ Watchlist</Link>
      <Link className="btn" href={`/alerts?product=${id}`}>🔔 Create alert</Link>
      <Link className="btn ghost" href={`/contribute?product=${id}`}>Contribute a price →</Link>
    </div>
  );
}
