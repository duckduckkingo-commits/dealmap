import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { readDB } from "@/lib/db";

export const metadata = { title: "Dashboard — DEALMAP", robots: { index: false } };

export default async function Dashboard() {
  const s = await getSession();
  if (!s) redirect("/auth/login");
  const db = await readDB();
  const mine = {
    watch: db.watchlists.filter((w) => w.userId === s.sub).length,
    alerts: db.alerts.filter((a) => a.userId === s.sub && a.active).length,
    purchases: db.purchases.filter((p) => p.userId === s.sub).length,
    contributions: db.contributions.filter((c) => c.userId === s.sub).length,
    notif: db.notifications.filter((n) => n.userId === s.sub).slice(-5).reverse(),
  };
  return (
    <>
      <h1>Dashboard</h1>
      <p style={{ color: "var(--muted)" }}>Welcome, {s.name} ({s.role})</p>
      <div className="grid cols3">
        <div className="card"><h3>Watchlist</h3><p>{mine.watch} items</p><a href="/watchlist">Open</a></div>
        <div className="card"><h3>Alerts</h3><p>{mine.alerts} active</p><a href="/alerts">Open</a></div>
        <div className="card"><h3>Purchases</h3><p>{mine.purchases} recorded</p><a href="/purchases">Open</a></div>
        <div className="card"><h3>Contributions</h3><p>{mine.contributions} submitted</p><a href="/contribute">Contribute</a></div>
        <div className="card"><h3>Warranties</h3><a href="/warranties">Open</a></div>
        <div className="card"><h3>Settings</h3><a href="/settings">Open</a></div>
      </div>
      <h2>Recent notifications</h2>
      {mine.notif.length === 0 ? <p>Nothing here yet.</p> : <ul>{mine.notif.map((n) => <li key={n.id}>{n.title} — {n.body}</li>)}</ul>}
    </>
  );
}
