"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

interface Suggestion { id: string; name: string; brand: string; median: number | null }

export default function SearchBar({ initial = "", placeholder = "Search…" }: { initial?: string; placeholder?: string }) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [hi, setHi] = useState(-1);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function fetchS(qv: string) {
    if (timer.current) clearTimeout(timer.current);
    if (!qv.trim()) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/products?q=${encodeURIComponent(qv)}`, { headers: { accept: "application/json" } });
        const d = await r.json();
        const list = (d.products ?? d.items ?? d ?? []) as Suggestion[];
        setItems(list.slice(0, 6));
        setOpen(true); setHi(-1);
      } catch { setItems([]); }
    }, 220);
  }

  function go(qv: string) {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(qv)}`);
  }

  return (
    <div className="search-wrap" ref={boxRef}>
      <form role="search" aria-label="Product search" onSubmit={(e) => { e.preventDefault(); go(q); }} style={{ display: "flex", gap: 8 }}>
        <label htmlFor="dm-q" className="skip">Search products</label>
        <div style={{ position: "relative", flex: 1 }}>
          <span aria-hidden="true" style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted-2)" }}>⌕</span>
          <input
            id="dm-q" name="q" value={q} autoComplete="off" role="combobox" aria-expanded={open} aria-controls="dm-suggest" aria-activedescendant={hi >= 0 ? `sg-${hi}` : undefined}
            onChange={(e) => { setQ(e.target.value); fetchS(e.target.value); }}
            onFocus={() => { if (items.length) setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, items.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)); }
              else if (e.key === "Enter" && hi >= 0 && items[hi]) { e.preventDefault(); router.push(`/product/${items[hi].id}`); }
              else if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            style={{ paddingInlineStart: 40 }}
          />
        </div>
        <button className="btn" type="submit">Search</button>
      </form>
      {open && items.length > 0 && (
        <div className="search-results" id="dm-suggest" role="listbox" aria-label="Suggestions">
          {items.map((s, i) => (
            <a key={s.id} id={`sg-${i}`} role="option" aria-selected={i === hi} href={`/product/${s.id}`}
              onClick={(e) => { e.preventDefault(); setOpen(false); router.push(`/product/${s.id}`); }}
              style={i === hi ? { background: "var(--accent-soft)" } : undefined}>
              <span>{s.name}</span>
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>{s.median != null ? formatPrice(s.median) : ""}</span>
            </a>
          ))}
          <a href={`/search?q=${encodeURIComponent(q)}`} onClick={(e) => { e.preventDefault(); go(q); }} style={{ color: "var(--accent)" }}>
            <span>See all results for “{q}”</span><span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </div>
  );
}
