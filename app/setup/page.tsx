"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const res = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, setupSecret }) });
      const data = await res.json();
      if (!res.ok) { setErr("Setup unavailable."); return; }
      router.push(data.redirect || "/owner");
    } catch { setErr("Network error"); } finally { setLoading(false); }
  }
  return (
    <div className="card" style={{ maxWidth: 480, margin: "32px auto" }}>
      <h1>Initial setup</h1>
      <p style={{ color: "var(--muted)" }}>First-time owner creation only. Uses development credentials locally.</p>
      <form onSubmit={submit}>
        <label htmlFor="name">Name</label><input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <label htmlFor="email">Email</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="pw">Password (8+ chars)</label><input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        <label htmlFor="sec">Setup secret (if configured)</label><input id="sec" type="password" value={setupSecret} onChange={(e) => setSetupSecret(e.target.value)} autoComplete="off" />
        {err && <p className="alert error" role="alert">{err}</p>}
        <div style={{ marginTop: 12 }}><button className="btn" disabled={loading} type="submit">{loading ? "Loading…" : "Create owner"}</button></div>
      </form>
    </div>
  );
}
