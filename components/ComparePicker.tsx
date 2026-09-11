"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ComparePicker({ all, current }: { all: { id: string; name: string }[]; current: string[] }) {
  const [q, setQ] = useState("");
  const [ids, setIds] = useState<string[]>(current);
  const router = useRouter();

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem("dm_compare") ?? "[]") as string[];
      if (current.length === 0 && local.length > 0) router.push(`/compare?ids=${local.slice(0, 3).join(",")}`);
    } catch {}
  }, []);

  const sug = q.trim() ? all.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];

  function add(id: string) {
    const next = [...new Set([...ids, id])].slice(0, 3);
    setIds(next);
    try { localStorage.setItem("dm_compare", JSON.stringify(next)); } catch {}
    router.push(`/compare?ids=${next.join(",")}`);
  }
  function clear() {
    setIds([]);
    try { localStorage.setItem("dm_compare", "[]"); } catch {}
    router.push("/compare");
  }

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px" }}>
          <label htmlFor="cmp-q">Add a product (max 3)</label>
          <input id="cmp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search… e.g. iPhone" autoComplete="off" list="cmp-list" />
          <datalist id="cmp-list">{all.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
          <button className="btn secondary" type="button" onClick={clear}>Clear</button>
        </div>
      </div>
      {sug.length > 0 && (
        <div className="chips" style={{ marginTop: 8 }}>
          {sug.map((s) => <button key={s.id} className="chip" onClick={() => add(s.id)}>+ {s.name}</button>)}
        </div>
      )}
      {ids.length > 0 && <p style={{ color: "var(--muted)", fontSize: ".85rem", marginBottom: 0 }}>Comparing {ids.length}/3 · shareable URL · <button className="btn ghost small" onClick={clear}>start over</button></p>}
    </div>
  );
}
