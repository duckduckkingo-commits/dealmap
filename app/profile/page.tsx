import { getSession } from "@/lib/auth";
import { readDB } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Profile — DEALMAP", robots: { index: false } };

export default async function Profile() {
  const s = await getSession();
  if (!s) {
    return (
      <>
        <div className="card" style={{ textAlign: "center", marginTop: 24, padding: 36 }}>
          <div style={{ fontSize: "3rem" }} aria-hidden="true">👤</div>
          <h1>Your profile</h1>
          <p style={{ color: "var(--muted)" }}>Log in to see your reputation, contributions, purchases and warranties.</p>
          <div className="cta-row" style={{ justifyContent: "center" }}>
            <Link className="btn" href="/auth/login">Log in</Link>
            <Link className="btn secondary" href="/auth/register">Create account</Link>
          </div>
        </div>
      </>
    );
  }
  const db = await readDB();
  const user = db.users.find((u) => u.id === s.sub);
  const myObs = db.observations.filter((o) => o.contributorId === s.sub).length + db.contributions.filter((c) => c.userId === s.sub).length;
  const myPurchases = db.purchases.filter((p) => p.userId === s.sub).length;
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Profile</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Manage your account & track your activity.</p>
      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "2rem", background: "linear-gradient(135deg, var(--accent-2), var(--accent))", color: "#fff", fontWeight: 800 }} aria-hidden="true">
          {(user?.name ?? user?.email ?? "D").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h2 style={{ margin: 0 }}>{user?.name ?? "DealMap user"}</h2>
          <p style={{ margin: "2px 0", color: "var(--muted)" }}>{user?.email} · {user?.role}</p>
          <p style={{ margin: 0 }}><span className="badge info">⭐ {user?.reputation ?? 0} reputation</span> <span className="badge">Member since {user?.createdAt?.slice(0, 10)}</span></p>
        </div>
      </div>
      <div className="grid cols3 stagger" style={{ marginTop: 14 }}>
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{myObs}</div><p style={{ color: "var(--muted)", margin: 0 }}>Contributions</p><Link className="btn ghost small" href="/contribute">Contribute →</Link></div>
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{myPurchases}</div><p style={{ color: "var(--muted)", margin: 0 }}>Purchases</p><Link className="btn ghost small" href="/purchases">View →</Link></div>
        <div className="card" style={{ textAlign: "center" }}><div style={{ fontSize: "1.8rem" }} aria-hidden="true">♡</div><p style={{ color: "var(--muted)", margin: 0 }}>Saved items</p><Link className="btn ghost small" href="/watchlist">View →</Link></div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <Link className="set-row" href="/watchlist"><span className="ico" aria-hidden="true">♡</span> Saved products <span className="chev">→</span></Link>
        <Link className="set-row" href="/alerts"><span className="ico" aria-hidden="true">🔔</span> My alerts <span className="chev">→</span></Link>
        <Link className="set-row" href="/purchases"><span className="ico" aria-hidden="true">🧾</span> Purchases <span className="chev">→</span></Link>
        <Link className="set-row" href="/warranties"><span className="ico" aria-hidden="true">🛡️</span> Warranties <span className="chev">→</span></Link>
        <Link className="set-row" href="/dashboard"><span className="ico" aria-hidden="true">📊</span> Dashboard <span className="chev">→</span></Link>
        <Link className="set-row" href="/settings"><span className="ico" aria-hidden="true">⚙️</span> Settings <span className="chev">→</span></Link>
      </div>
    </>
  );
}
