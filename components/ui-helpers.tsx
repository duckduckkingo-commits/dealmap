"use client";
import { useEffect, useState } from "react";

export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent("dm-toast", { detail: msg }));
}

export function ToastZone() {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  useEffect(() => {
    let n = 0;
    const h = (e: Event) => {
      const msg = (e as CustomEvent).detail as string;
      const id = ++n;
      setItems((p) => [...p.slice(-2), { id, msg }]);
      setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 2800);
    };
    window.addEventListener("dm-toast", h);
    return () => window.removeEventListener("dm-toast", h);
  }, []);
  return (
    <div className="toast-zone" aria-live="polite">
      {items.map((t) => (
        <div className="toast" key={t.id} role="status">
          <span aria-hidden="true">✓</span> {t.msg}
        </div>
      ))}
    </div>
  );
}

export function ripple(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = document.createElement("span");
  r.className = "ripple";
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.width = r.style.height = size + "px";
  r.style.left = (e.clientX - rect.left - size / 2) + "px";
  r.style.top = (e.clientY - rect.top - size / 2) + "px";
  el.appendChild(r);
  setTimeout(() => r.remove(), 600);
}
