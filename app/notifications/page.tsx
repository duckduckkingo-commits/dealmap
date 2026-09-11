"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface N { id: string; title: string; body?: string; createdAt?: string; read?: boolean }

export default function NotificationsPage() {
  const [items, setItems] = useState<N[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401) {
        let local: N[] = [];
        try {
          const alerts = JSON.parse(localStorage.getItem("dm_alerts") ?? "[]") as { productId: string; targetPrice?: number }[];
          local = alerts.map((a, i) => ({ id: `l${i}`, title: `Watching ${a.productId}`, body: a.targetPrice ? `Alert set below ${a.targetPrice} MAD` : "Alert active on this device", createdAt: new Date().toISOString() }));
        } catch {}
        setItems(local);
        setMsg("Guest mode — showing on-device alerts. Log in to sync.");
        return;
      }
      setItems((await res.json()).items ?? []);
    } catch { setMsg("Could not load notifications."); }
  }
  useEffect(() => { load(); }, []);

  async function markAll() {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read-all" }) }).catch(() => {});
    setItems((p) => p.map((x) => ({ ...x, read: true })));
  }

  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Notifications</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Price alerts, warranty & return reminders.</p>
      {msg && <p className="alert" role="status">{msg}</p>}
      <div className="cta-row" style={{ marginBottom: 12 }}>
        <button className="btn secondary small" onClick={markAll}>Mark all as read</button>
        <Link className="btn ghost small" href="/alerts">Manage alerts →</Link>
        <Link className="btn ghost small" href="/settings">Notification settings →</Link>
      </div>
      {items.length === 0 ? (
        <div className="empty"><div className="big" aria-hidden="true">🔕</div><p>All quiet. Create a <Link href="/alerts">price alert</Link> and we&rsquo;ll ping you here.</p></div>
      ) : (
        <div className="stagger">
          {items.map((n) => (
            <article className="card" key={n.id} style={{ opacity: n.read ? 0.7 : 1 }}>
              <h3 style={{ margin: "0 0 4px" }}>{n.read ? "" : "● "}{n.title}</h3>
              {n.body && <p style={{ color: "var(--muted)", margin: "0 0 4px" }}>{n.body}</p>}
              {n.createdAt && <p style={{ color: "var(--muted)", fontSize: ".8rem", margin: 0 }}>{new Date(n.createdAt).toLocaleString()}</p>}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
